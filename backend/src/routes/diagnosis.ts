// backend/src/routes/diagnosis.ts

import { Router } from 'express';
import { z } from 'zod';
import { DiagnosisParseError, hasDiagnosisProviderConfigured, runDiagnosis } from '../services/diagnosis.service';

export const diagnosisRouter = Router();

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

diagnosisRouter.post('/diagnosis', async (req, res) => {
  const parsed = diagnosisRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  if (!hasDiagnosisProviderConfigured()) {
    res.status(503).json({ error: 'No chat provider configured — set GEMINI_API_KEY or ANTHROPIC_API_KEY.' });
    return;
  }

  try {
    const report = await runDiagnosis(parsed.data);
    res.json({ report });
  } catch (err) {
    if (err instanceof DiagnosisParseError) {
      console.error('Diagnosis parse failed:', err.message);
      res.status(502).json({ error: 'The AI provider returned a response we could not parse. Please try again.' });
      return;
    }
    console.error('Diagnosis request failed:', err);
    res.status(502).json({ error: 'Failed to get a response from the AI provider.' });
  }
});
