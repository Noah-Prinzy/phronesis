// backend/src/routes/chat.ts

import { Router } from 'express';
import { z } from 'zod';
import { getChatReplyStream, hasChatProviderConfigured } from '../services/ai.service';

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

  if (!hasChatProviderConfigured()) {
    res.status(503).json({ error: 'No chat provider configured — set GEMINI_API_KEY or ANTHROPIC_API_KEY.' });
    return;
  }

  // SSE from here on — once writeHead(200) fires, a mid-stream failure can
  // no longer become a clean HTTP error status, so it's emitted as an
  // `error` frame instead and the client has to treat that as a failure.
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  try {
    for await (const delta of getChatReplyStream(parsed.data.messages, parsed.data.journey)) {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Chat request failed:', err);
    res.write(`data: ${JSON.stringify({ error: 'Failed to get a response from the AI provider.' })}\n\n`);
  }
  res.end();
});
