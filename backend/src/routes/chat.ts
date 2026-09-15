// backend/src/routes/chat.ts

import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth } from '../middleware/auth.js';
import { getChatReplyStream, hasChatProviderConfigured } from '../services/ai.service.js';
import { saveChatSession } from '../services/history.service.js';
import { attachmentSchema, rejectAttachments } from '../services/attachments.js';

export const chatRouter = Router();

const chatRequestSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
        /** A photo or a recording sent with this turn. */
        attachments: z.array(attachmentSchema).max(4).optional(),
      }),
    )
    .min(1, 'messages must contain at least one turn'),
  journey: z.enum(['pre-car', 'post-car']).nullable().optional(),
  /**
   * The conversation this turn belongs to, as handed back by a previous
   * request. Absent starts a new one. The service checks it belongs to the
   * caller before writing to it.
   */
  chatId: z.string().min(1).max(128).optional(),
});

chatRouter.post('/chat', optionalAuth, async (req, res) => {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  /* Refused with a reason rather than dropped, and BEFORE the SSE headers go
     out — once the stream has started there is no status code left to send. */
  for (const turn of parsed.data.messages) {
    const refusal = rejectAttachments(turn.attachments);
    if (refusal) {
      res.status(415).json({ error: refusal });
      return;
    }
  }

  if (!hasChatProviderConfigured()) {
    res.status(503).json({ error: 'No chat provider configured — set GEMINI_API_KEY.' });
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
    // Saved BEFORE [DONE], deliberately. That frame is the client's signal to
    // stop reading, so anything written after it is never seen — which is
    // where the chatId frame went in the first draft of this.
    //
    // Awaited, unlike before: the id of a brand-new session has to reach the
    // client or its next turn starts yet another one, and this stream is the
    // only channel still open. A save that fails must not cost the user the
    // reply, so it is caught here and [DONE] is sent either way.
    if (req.user?.uid) {
      const fullReply = fullAssistantReplyChunks.join('');
      // Just this exchange. The client sends only the recent tail of the
      // conversation as context, so anything more than this would overwrite
      // the stored thread with a shortened copy of itself.
      const question = parsed.data.messages[parsed.data.messages.length - 1];
      try {
        const chatId = await saveChatSession({
          userId: req.user.uid,
          journey: parsed.data.journey || undefined,
          append: [...(question?.role === 'user' ? [question] : []), {
            role: 'assistant' as const,
            content: fullReply,
          }],
          chatId: parsed.data.chatId,
        });
        res.write(`data: ${JSON.stringify({ chatId })}\n\n`);
      } catch (err) {
        console.error('Failed to auto-save chat session to Firestore:', err);
      }
    }

    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Chat request failed:', err);
    res.write(`data: ${JSON.stringify({ error: 'Failed to get a response from the AI provider.' })}\n\n`);
  }
  res.end();
});
