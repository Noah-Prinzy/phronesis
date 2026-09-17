import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_MODEL = 'gemini-3.6-flash';
const DIAGNOSIS_MAX_TOKENS = 2048;

const EXAMPLE_JSON = `{"issue":"Engine Knock","root_cause":"Low-quality fuel or carbon buildup","category":"engine","urgency_level":"high","confidence":92,"cost_estimate_low":180000,"cost_estimate_high":600000,"timeline":"Fix within 2 weeks","solutions":[{"option":"Carbon cleaning (labor only)","cost_low":180000,"cost_high":320000,"parts_low":0,"parts_high":40000,"labour_low":180000,"labour_high":280000},{"option":"Replace knock sensor","cost_low":420000,"cost_high":600000,"parts_low":260000,"parts_high":380000,"labour_low":160000,"labour_high":220000}]}`;

const RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    issue: { type: 'string' },
    root_cause: { type: 'string' },
    category: { type: 'string', enum: ['engine', 'electrical', 'brakes', 'transmission', 'body', 'suspension', 'general'] },
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

function buildSystemPrompt(): string {
  return `You are Phronesis' diagnostic engine, generating a structured car diagnosis report for African drivers. Respond with ONLY a single raw JSON object matching this exact shape — no markdown fences, no prose before or after:
${EXAMPLE_JSON}
Field notes: category must be one of engine/electrical/brakes/transmission/body/suspension/general. urgency_level must be one of critical/high/medium/low. confidence is 0-100. All costs are in UGX (Ugandan shillings), the currency this app's users actually pay in — never USD. Use realistic Kampala prices: a common independent-garage repair on a used Toyota runs roughly UGX 80,000 to 900,000, with major work into the millions. Round to the nearest 10,000. For every solution also split the cost into parts_low/parts_high and labour_low/labour_high, which must add up to cost_low/cost_high — people need to know which half of a quote is which. Base the diagnosis on the symptoms, car details, and OBD data given. If OBD DTC codes are present, weight them heavily. Be realistic and specific, not generic.`;
}

function buildUserPrompt(request: any): string {
  const lines: string[] = [`Symptoms described by the driver: ${request.symptomText}`];
  const car = request.carProfile;
  if (car && (car.make || car.model || car.year)) {
    lines.push(
      `Vehicle: ${[car.year, car.make, car.model].filter(Boolean).join(' ')}${car.engineType ? `, engine: ${car.engineType}` : ''}${car.mileage ? `, mileage: ${car.mileage}` : ''}`
    );
  }
  const obd = request.obdSnapshot;
  if (obd) {
    const obdParts: string[] = [];
    if (obd.dtcCodes?.length) obdParts.push(`Diagnostic trouble codes (DTCs): ${obd.dtcCodes.join(', ')}`);
    if (obd.rpm !== undefined) obdParts.push(`RPM: ${obd.rpm}`);
    if (obd.temperature !== undefined) obdParts.push(`Coolant temp: ${obd.temperature}°C`);
    if (obdParts.length) lines.push(`Live OBD-II data:\n${obdParts.map((p) => `  - ${p}`).join('\n')}`);
  }
  return lines.join('\n');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symptomText, carProfile, obdSnapshot } = req.body || {};
  if (!symptomText || typeof symptomText !== 'string') {
    return res.status(400).json({ error: 'symptomText is required' });
  }

  const apiKey = process.env.PHRONESIS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API key not configured. Set GEMINI_API_KEY in Vercel environment variables.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(req.body) }] }],
      config: {
        systemInstruction: buildSystemPrompt(),
        maxOutputTokens: DIAGNOSIS_MAX_TOKENS,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_JSON_SCHEMA,
      },
    });

    const raw = response.text || '';
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) {
      return res.status(502).json({ error: 'Invalid JSON response from AI provider' });
    }

    const parsed = JSON.parse(raw.slice(start, end + 1));
    const report = {
      issue: parsed.issue,
      rootCause: parsed.root_cause,
      category: parsed.category,
      urgencyLevel: parsed.urgency_level,
      confidence: parsed.confidence,
      costEstimateLow: parsed.cost_estimate_low,
      costEstimateHigh: parsed.cost_estimate_high,
      timeline: parsed.timeline,
      solutions: (parsed.solutions || []).map((s: any) => ({
        option: s.option,
        costLow: s.cost_low,
        costHigh: s.cost_high,
        partsLow: s.parts_low,
        partsHigh: s.parts_high,
        labourLow: s.labour_low,
        labourHigh: s.labour_high,
      })),
      detectedCodes: obdSnapshot?.dtcCodes || [],
    };

    return res.status(200).json({ report, diagnosisId: `diag-${Date.now()}` });
  } catch (err: any) {
    console.error('Diagnosis error:', err);
    return res.status(502).json({ error: err.message || 'Diagnosis generation failed' });
  }
}
