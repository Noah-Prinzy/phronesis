// backend/src/index.ts

import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { chatRouter } from './routes/chat.js';
import { diagnosisRouter } from './routes/diagnosis.js';
import { healthRouter } from './routes/health.js';
import { historyRouter } from './routes/history.js';
import { ttsRouter } from './routes/tts.js';
import { ttsLocalRouter } from './routes/tts-local.js';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api', chatRouter);
app.use('/api', diagnosisRouter);
app.use('/api', ttsRouter);
app.use('/api', ttsLocalRouter);
app.use('/api', historyRouter);

/**
 * Stay up when a background job fails.
 *
 * Node kills the process on an unhandled rejection, which meant a fire-and-
 * forget Firestore write — saving chat history, say — could take the whole
 * API down. It did: with no Google credentials configured, the Firestore SDK
 * rejected from inside its own async plumbing, past the `.catch()` at the
 * call site, and the server died mid-session.
 *
 * Nothing user-facing depends on those writes succeeding, so the right
 * outcome is a loud log and a server that is still answering requests. These
 * are logged, never swallowed silently.
 */
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection (server kept running):', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception (server kept running):', err);
});

app.listen(env.PORT, () => {
  console.log(`Phronesis backend listening on http://localhost:${env.PORT}`);
});
