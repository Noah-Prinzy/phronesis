// backend/src/routes/diagnosis.ts

import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth.js';
import { DiagnosisParseError, hasDiagnosisProviderConfigured, runDiagnosis } from '../services/diagnosis.service.js';
import { saveDiagnosisReport } from '../services/history.service.js';
import { attachmentsSchema, rejectAttachments } from '../services/attachments.js';

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
  /** Photos of the car, or recordings of the noise it is making. */
  attachments: attachmentsSchema,
});

diagnosisRouter.post('/diagnosis', optionalAuth, async (req, res) => {
  const parsed = diagnosisRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  /* Turned away with a reason rather than dropped. Somebody who just recorded
     a noise and got a diagnosis that never mentions it would reasonably
     believe he had listened to it. */
  const refusal = rejectAttachments(parsed.data.attachments);
  if (refusal) {
    res.status(415).json({ error: refusal });
    return;
  }

  if (!hasDiagnosisProviderConfigured()) {
    res.status(503).json({ error: 'No chat provider configured — set GEMINI_API_KEY.' });
    return;
  }

  try {
    const report = await runDiagnosis(parsed.data);

    let savedDiagnosisId: string | undefined;
    if (req.user?.uid) {
      try {
        savedDiagnosisId = await saveDiagnosisReport({
          userId: req.user.uid,
          symptomText: parsed.data.symptomText,
          carProfile: parsed.data.carProfile,
          obdSnapshot: parsed.data.obdSnapshot,
          report: report as any,
        });
      } catch (saveErr) {
        console.error('Failed to auto-save diagnosis to Firestore:', saveErr);
      }
    }

    res.json({ report, diagnosisId: savedDiagnosisId });
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
