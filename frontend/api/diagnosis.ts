// frontend/api/diagnosis.ts
//
// Vercel serverless function — deployed alongside the frontend as
// /api/diagnosis. Deployed counterpart of backend/src/routes/diagnosis.ts +
// diagnosis.service.ts — see chat.ts for why this file (not the standalone
// Express server) is what runs in production.

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

const DIAGNOSIS_MAX_TOKENS = 2048;
const ANTHROPIC_MODEL = 'claude-sonnet-5';
const GEMINI_MODEL = 'gemini-3.6-flash';

const diagnosisRequestSchema = z.object({
  symptomText: z.string().min(1),
  carProfile: z
    .object({
      make: z.string().optional(),
      model: z.string().optional(),
      year: z.number().optional(),
      engineType: z.string().optional(),
      fuelType: z.string().optional(),
      transmission: z.string().optional(),
      mileage: z.number().optional(),
    })
    .partial()
    .optional(),
  obdSnapshot: z
    .object({
      dtcCodes: z.array(z.string()).optional(),
      rpm: z.number().optional(),
      temperature: z.number().optional(),
      fuelConsumption: z.number().optional(),
      o2Levels: z.number().optional(),
      batteryVoltage: z.number().optional(),
    })
    .partial()
    .optional(),
});
type DiagnosisRequest = z.infer<typeof diagnosisRequestSchema>;

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
      }),
    )
    .min(1),
});

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

// Example from the design doc (section 9.4) — anchors the Anthropic prompt
// (no native JSON mode there) as a literal template.
const EXAMPLE_JSON = `{"issue":"Engine Knock","root_cause":"Low-quality fuel or carbon buildup","category":"engine","urgency_level":"high","confidence":92,"cost_estimate_low":120,"cost_estimate_high":400,"timeline":"Fix within 2 weeks","solutions":[{"option":"Carbon cleaning (labor only)","cost_low":120,"cost_high":180},{"option":"Replace knock sensor","cost_low":250,"cost_high":400}]}`;

function buildSystemPrompt(): string {
  return `You are Phronesis' diagnostic engine, generating a structured car diagnosis report for African drivers. Respond with ONLY a single raw JSON object matching this exact shape — no markdown fences, no prose before or after:
${EXAMPLE_JSON}
Field notes: category must be one of engine/electrical/brakes/transmission/general. urgency_level must be one of critical/high/medium/low. confidence is 0-100. All costs are in USD. Base the diagnosis on the symptoms, car details, and OBD data given. If OBD DTC codes are present, weight them heavily. Be realistic and specific, not generic.`;
}

function buildUserPrompt(request: DiagnosisRequest): string {
  const lines: string[] = [`Symptoms described by the driver: ${request.symptomText}`];
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

function parseDiagnosisResponse(raw: string) {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('No JSON object found in the AI response.');
  }
  const candidate: unknown = JSON.parse(raw.slice(start, end + 1));
  const parsed = diagnosisResultSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error(`AI response did not match the expected schema: ${parsed.error.message}`);
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
    solutions: result.solutions.map((s) => ({ option: s.option, costLow: s.cost_low, costHigh: s.cost_high })),
  };
}

async function getGeminiDiagnosis(apiKey: string, request: DiagnosisRequest): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildUserPrompt(request),
    config: {
      systemInstruction: buildSystemPrompt(),
      maxOutputTokens: DIAGNOSIS_MAX_TOKENS,
      responseMimeType: 'application/json',
      responseJsonSchema: RESPONSE_JSON_SCHEMA,
    },
  });
  return response.text ?? '';
}

async function getAnthropicDiagnosis(apiKey: string, request: DiagnosisRequest): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: DIAGNOSIS_MAX_TOKENS,
    system: buildSystemPrompt(),
    messages: [{ role: 'user', content: buildUserPrompt(request) }],
  });
  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parsed = diagnosisRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
    res.status(503).json({ error: 'No chat provider configured — set GEMINI_API_KEY or ANTHROPIC_API_KEY.' });
    return;
  }

  try {
    const raw = geminiKey
      ? await getGeminiDiagnosis(geminiKey, parsed.data)
      : await getAnthropicDiagnosis(anthropicKey!, parsed.data);

    let report;
    try {
      report = parseDiagnosisResponse(raw);
    } catch (parseErr) {
      console.error('Diagnosis parse failed:', parseErr);
      res.status(502).json({ error: 'The AI provider returned a response we could not parse. Please try again.' });
      return;
    }

    res.status(200).json({ report: { ...report, detectedCodes: parsed.data.obdSnapshot?.dtcCodes ?? [] } });
  } catch (err) {
    console.error('Diagnosis request failed:', err);
    res.status(502).json({ error: 'Failed to get a response from the AI provider.' });
  }
}
