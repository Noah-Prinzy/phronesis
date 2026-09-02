// backend/src/routes/chat.ts

import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { getChatReply } from '../services/ai.service';

export const chatRouter = Router();

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      }),
    )
    .min(1, 'messages must contain at least one turn'),
  journey: z.enum(['pre-car', 'post-car']).nullable().optional(),
});

chatRouter.post('/chat', async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  if (!env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured on the server yet.' });
    return;
  }

  try {
    const reply = await getChatReply(parsed.data.messages, parsed.data.journey);
    res.json({ reply });
  } catch (err) {
    console.error('Chat request failed:', err);
    res.status(502).json({ error: 'Failed to get a response from Claude.' });
  }
});
