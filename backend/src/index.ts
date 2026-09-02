// backend/src/index.ts

import cors from 'cors';
import express from 'express';
import { env } from './config/env';
import { chatRouter } from './routes/chat';
import { healthRouter } from './routes/health';
import { ttsLocalRouter } from './routes/tts-local';

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api', chatRouter);
app.use('/api', ttsLocalRouter);

app.listen(env.PORT, () => {
  console.log(`Phronesis backend listening on http://localhost:${env.PORT}`);
});
