// backend/src/index.ts

import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { chatRouter } from './routes/chat';
import { diagnosisRouter } from './routes/diagnosis';
import { healthRouter } from './routes/health';
import { historyRouter } from './routes/history';
import { ttsRouter } from './routes/tts';
import { ttsLocalRouter } from './routes/tts-local';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api', chatRouter);
app.use('/api', diagnosisRouter);
app.use('/api', ttsRouter);
app.use('/api', ttsLocalRouter);
app.use('/api', historyRouter);

app.listen(env.PORT, () => {
  console.log(`Phronesis backend listening on http://localhost:${env.PORT}`);
});
