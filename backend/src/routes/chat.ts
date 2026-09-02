// backend/src/routes/chat.ts

import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth';
import { getChatReplyStream, hasChatProviderConfigured } from '../services/ai.service';
import { saveChatSession } from '../services/history.service';

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

chatRouter.post('/chat', optionalAuth, async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  if (!hasChatProviderConfigured()) {
    res.status(503).json({ error: 'No chat provider configured — set GEMINI_API_KEY or ANTHROPIC_API_KEY.' });
    return;
  }

  // SSE from here on
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const fullAssistantReplyChunks: string[] = [];

  try {
    for await (const delta of getChatReplyStream(parsed.data.messages, parsed.data.journey)) {
      fullAssistantReplyChunks.push(delta);
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write('data: [DONE]\n\n');

    // Auto-save to Firestore if authenticated
    if (req.user?.uid) {
      const fullReply = fullAssistantReplyChunks.join('');
      const updatedMessages = [
        ...parsed.data.messages,
        { role: 'assistant' as const, content: fullReply },
      ];
      saveChatSession({
        userId: req.user.uid,
        journey: parsed.data.journey || undefined,
        messages: updatedMessages,
      }).catch((err) => console.error('Failed to auto-save chat session to Firestore:', err));
    }
  } catch (err) {
    console.error('Chat request failed:', err);
    res.write(`data: ${JSON.stringify({ error: 'Failed to get a response from the AI provider.' })}\n\n`);
  }
  res.end();
});
