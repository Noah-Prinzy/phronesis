// backend/src/config/env.ts

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Deliberately not required at startup: an empty key lets the server
  // (and /api/health) come up fine — the AI routes just fail per-request
  // with a clear message until a real key is set, rather than the whole
  // deployment crash-looping over a config value expected to arrive later.
  //
  // It is the only model key now. Gemini is also what /api/tts speaks with
  // and the only provider here that takes a photo or a recording, so there
  // is nothing left for a second one to be a fallback FOR.
  // Free key at https://aistudio.google.com/apikey.
  GEMINI_API_KEY: z.string().optional().default(''),
  // Scoped in ahead of need: nothing calls /api/tts-local yet (Sunbird's
  // TTS only covers Ugandan languages — Acholi, Ateso, Runyankole, Lugbara,
  // Swahili, Luganda — not English, so there's no current app content it
  // can voice), but the endpoint is ready for when local-language support
  // becomes a real feature. Get a key at https://sunbird.ai.
  SUNBIRD_API_KEY: z.string().optional().default(''),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FIREBASE_PROJECT_ID: z.string().optional().default('phronesis-51bc9'),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
