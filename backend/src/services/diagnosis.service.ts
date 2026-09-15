// backend/src/services/diagnosis.service.ts

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { env } from '../config/env.js';
import { describeAttachments, toGeminiParts, type Attachment } from './attachments.js';

// Separate from chat's MAX_TOKENS (1536) — a structured report with a
// solutions array runs longer than a conversational reply.
const DIAGNOSIS_MAX_TOKENS = 2048;
const GEMINI_MODEL = 'gemini-3.6-flash';

export interface CarProfileInput {
  make?: string;
  model?: string;
  year?: number;
  engineType?: string;
  fuelType?: string;
  transmission?: string;
  mileage?: number;
}

export interface ObdSnapshotInput {
  dtcCodes?: string[];
  rpm?: number;
  temperature?: number;
  fuelConsumption?: number;
  o2Levels?: number;
  batteryVoltage?: number;
}

export interface DiagnosisRequest {
  symptomText: string;
  carProfile?: CarProfileInput;
  obdSnapshot?: ObdSnapshotInput;
  /** Photos of the car, or recordings of the noise. */
  attachments?: Attachment[];
}

// snake_case: mirrors the design doc's field names and is what we ask the
// model to produce directly, so no renaming happens between "what the
// model said" and "what we validated."
const diagnosisResultSchema = z.object({
  issue: z.string().min(1),
  root_cause: z.string().min(1),
  category: z.enum(['engine', 'electrical', 'brakes', 'transmission', 'general']),
  urgency_level: z.enum(['critical', 'high', 'medium', 'low']),
  confidence: z.number().min(0).max(100),
  cost_estimate_low: z.number().nonnegative(),
  cost_estimate_high: z.number().nonnegative(),
  timeline: z.string().min(1),
  solutions: z
    .array(
      z.object({
        option: z.string().min(1),
        cost_low: z.number().nonnegative(),
        cost_high: z.number().nonnegative(),
        // Optional on purpose. A model that omits the split still produces a
        // valid report, and the page falls back to showing the total — which
        // is worse but not broken. Requiring them would reject an otherwise
        // good diagnosis over a presentational detail.
        parts_low: z.number().nonnegative().optional(),
        parts_high: z.number().nonnegative().optional(),
        labour_low: z.number().nonnegative().optional(),
        labour_high: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
});

export type DiagnosisResult = z.infer<typeof diagnosisResultSchema>;

// The camelCase shape actually sent back to the frontend.
export interface DiagnosisReport {
  issue: string;
  rootCause: string;
  category: DiagnosisResult['category'];
  urgencyLevel: DiagnosisResult['urgency_level'];
  confidence: number;
  costEstimateLow: number;
  costEstimateHigh: number;
  timeline: string;
  solutions: { option: string; costLow: number; costHigh: number }[];
  detectedCodes: string[];
}

export class DiagnosisParseError extends Error {}

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    issue: { type: 'string' },
    root_cause: { type: 'string' },
    category: { type: 'string', enum: ['engine', 'electrical', 'brakes', 'transmission', 'general'] },
    urgency_level: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    confidence: { type: 'number' },
    cost_estimate_low: { type: 'number' },
    cost_estimate_high: { type: 'number' },
    timeline: { type: 'string' },
    solutions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          option: { type: 'string' },
          cost_low: { type: 'number' },
          cost_high: { type: 'number' },
          parts_low: { type: 'number' },
          parts_high: { type: 'number' },
          labour_low: { type: 'number' },
          labour_high: { type: 'number' },
        },
        required: ['option', 'cost_low', 'cost_high'],
      },
    },
  },
  required: [
    'issue',
    'root_cause',
    'category',
    'urgency_level',
    'confidence',
    'cost_estimate_low',
    'cost_estimate_high',
    'timeline',
    'solutions',
  ],
};

// Example the doc itself provides (section 9.4) — it anchors the prompt as a
// literal template, and keeps the shape obvious to anyone reading this file.
const EXAMPLE_JSON = `{"issue":"Engine Knock","root_cause":"Low-quality fuel or carbon buildup","category":"engine","urgency_level":"high","confidence":92,"cost_estimate_low":180000,"cost_estimate_high":600000,"timeline":"Fix within 2 weeks","solutions":[{"option":"Carbon cleaning (labor only)","cost_low":180000,"cost_high":320000,"parts_low":0,"parts_high":40000,"labour_low":180000,"labour_high":280000},{"option":"Replace knock sensor","cost_low":420000,"cost_high":600000,"parts_low":260000,"parts_high":380000,"labour_low":160000,"labour_high":220000}]}`;

function buildSystemPrompt(): string {
  return `You are Phronesis' diagnostic engine, generating a structured car diagnosis report for African drivers. Respond with ONLY a single raw JSON object matching this exact shape — no markdown fences, no prose before or after:
${EXAMPLE_JSON}
Field notes: category must be one of engine/electrical/brakes/transmission/general. urgency_level must be one of critical/high/medium/low. confidence is 0-100. All costs are in UGX (Ugandan shillings), the currency this app's users actually pay in — never USD. Use realistic Kampala prices: a common independent-garage repair on a used Toyota runs roughly UGX 80,000 to 900,000, with major work into the millions. Round to the nearest 10,000. For every solution also split the cost into parts_low/parts_high and labour_low/labour_high, which must add up to cost_low/cost_high — people need to know which half of a quote is which. Base the diagnosis on the symptoms, car details, and OBD data given. If OBD DTC codes are present, weight them heavily. Be realistic and specific, not generic.`;
}

function buildUserPrompt(request: DiagnosisRequest): string {
  const lines: string[] = [`Symptoms described by the driver: ${request.symptomText}`];
  const evidence = describeAttachments(request.attachments);
  if (evidence) lines.push(evidence);
  const car = request.carProfile;
  if (car && (car.make || car.model || car.year)) {
    lines.push(
      `Vehicle: ${[car.year, car.make, car.model].filter(Boolean).join(' ')}${car.engineType ? `, engine: ${car.engineType}` : ''}${car.mileage ? `, mileage: ${car.mileage}` : ''}`,
    );
  }
  const obd = request.obdSnapshot;
  if (obd) {
    const obdParts: string[] = [];
    if (obd.dtcCodes?.length) obdParts.push(`DTC codes: ${obd.dtcCodes.join(', ')}`);
    if (obd.rpm !== undefined) obdParts.push(`RPM: ${obd.rpm}`);
    if (obd.temperature !== undefined) obdParts.push(`coolant temp: ${obd.temperature}°C`);
    if (obd.batteryVoltage !== undefined) obdParts.push(`battery: ${obd.batteryVoltage}V`);
    if (obd.o2Levels !== undefined) obdParts.push(`O2 sensor: ${obd.o2Levels}`);
    if (obd.fuelConsumption !== undefined) obdParts.push(`fuel consumption: ${obd.fuelConsumption} L/100km`);
    if (obdParts.length) lines.push(`OBD reading: ${obdParts.join('; ')}`);
  }
  return lines.join('\n');
}

/** Strips accidental markdown fencing/preamble, then parses + validates. */
export function parseDiagnosisResponse(raw: string): DiagnosisReport {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new DiagnosisParseError('No JSON object found in the AI response.');
  }
  const jsonSlice = raw.slice(start, end + 1);

  let candidate: unknown;
  try {
    candidate = JSON.parse(jsonSlice);
  } catch {
    throw new DiagnosisParseError('AI response was not valid JSON.');
  }

  const parsed = diagnosisResultSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new DiagnosisParseError(`AI response did not match the expected schema: ${parsed.error.message}`);
  }

  const result = parsed.data;
  return {
    issue: result.issue,
    rootCause: result.root_cause,
    category: result.category,
    urgencyLevel: result.urgency_level,
    confidence: result.confidence,
    costEstimateLow: result.cost_estimate_low,
    costEstimateHigh: result.cost_estimate_high,
    timeline: result.timeline,
    solutions: result.solutions.map((s) => ({
      option: s.option,
      costLow: s.cost_low,
      costHigh: s.cost_high,
      partsLow: s.parts_low,
      partsHigh: s.parts_high,
      labourLow: s.labour_low,
      labourHigh: s.labour_high,
    })),
    detectedCodes: [],
  };
}

async function getGeminiDiagnosis(request: DiagnosisRequest): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    // The text first, then whatever they sent. Gemini reads images and audio
    // from the same array, so a photo and a recording need no special case.
    contents: [
      { role: 'user', parts: [{ text: buildUserPrompt(request) }, ...toGeminiParts(request.attachments)] },
    ],
    config: {
      systemInstruction: buildSystemPrompt(),
      maxOutputTokens: DIAGNOSIS_MAX_TOKENS,
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    },
  });
  return response.text ?? '';
}

export async function runDiagnosis(request: DiagnosisRequest): Promise<DiagnosisReport> {
  const raw = await getGeminiDiagnosis(request);
  const report = parseDiagnosisResponse(raw);
  report.detectedCodes = request.obdSnapshot?.dtcCodes ?? [];
  return report;
}

export function hasDiagnosisProviderConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}
