// backend/src/config/env.ts

import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Deliberately not required at startup: an empty key lets the server
  // (and /api/health) come up fine — /api/chat just fails per-request with
  // a clear "authentication_error" from Anthropic until a real key is set,
  // rather than the whole deployment crash-looping over a config value
  // that's expected to arrive later.
  ANTHROPIC_API_KEY: z.string().optional().default(''),
  // Scoped in ahead of need: nothing calls /api/tts-local yet (Sunbird's
  // TTS only covers Ugandan languages — Acholi, Ateso, Runyankole, Lugbara,
  // Swahili, Luganda — not English, so there's no current app content it
  // can voice), but the endpoint is ready for when local-language support
  // becomes a real feature. Get a key at https://sunbird.ai.
  SUNBIRD_API_KEY: z.string().optional().default(''),
  PORT: z.coerce.number().int().positive().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
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
