// frontend/api/chat.ts
//
// Vercel serverless function — deployed alongside the frontend as /api/chat,
// same origin as the app itself (no CORS needed). This is the deployed
// counterpart of backend/src/routes/chat.ts + ai.service.ts — that
// standalone Express server still exists for local dev, but this file (not
// that server) is what actually runs in production, since the whole app
// deploys as one Vercel project rather than split across two hosts.

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

// Sonnet is the right balance of quality/cost/latency for a conversational
// assistant like this — no need for Opus-level reasoning power here.
const ANTHROPIC_MODEL = 'claude-sonnet-5';
// Flash: fast, free-tier-friendly, strong enough for this — the free stand-in
// while a custom model is being trained.
const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_TOKENS = 1536;

type ChatRole = 'user' | 'assistant';
interface ChatTurn {
  role: ChatRole;
  content: string;
}
type Journey = 'pre-car' | 'post-car';

const BASE_PERSONA = `You are Phronesis, a friendly AI car diagnostic assistant built for African drivers. You help people understand what's wrong with their car, decide what car to buy, and find trustworthy mechanics. You're warm, practical, and clear — you explain things in plain language, not jargon, and you're upfront about the limits of what you can diagnose remotely (you always recommend an in-person inspection for anything safety-critical). Keep responses concise and conversational, not a wall of text.`;

const JOURNEY_ADDENDUM: Record<Journey, string> = {
  'pre-car':
    "This user doesn't own a car yet — they're in the research/buying phase. Focus on helping them figure out what car fits their budget, needs, and use case, and what to check before buying.",
  'post-car':
    'This user already owns a car. Focus on diagnosing issues they describe, general maintenance guidance, and helping them find trustworthy help when something is beyond DIY.',
};

function buildSystemPrompt(journey?: Journey | null): string {
  if (!journey) return BASE_PERSONA;
  return `${BASE_PERSONA}\n\n${JOURNEY_ADDENDUM[journey]}`;
}

async function* getGeminiReplyStream(
  apiKey: string,
  messages: ChatTurn[],
  journey?: Journey | null,
): AsyncIterable<string> {
  const ai = new GoogleGenAI({ apiKey });
  const stream = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents: messages.map((m) => ({
      // Gemini uses "model" rather than "assistant" for the AI's own turns.
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    config: {
      systemInstruction: buildSystemPrompt(journey),
      maxOutputTokens: MAX_TOKENS,
    },
  });
  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}

async function* getAnthropicReplyStream(
  apiKey: string,
  messages: ChatTurn[],
  journey?: Journey | null,
): AsyncIterable<string> {
  const anthropic = new Anthropic({ apiKey });
  const stream = anthropic.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(journey),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  // Gemini preferred when both are set — it's the free stand-in used while
  // a custom model trains; once that's done (or Claude is wanted instead),
  // just unset GEMINI_API_KEY in Vercel's dashboard, no code change needed.
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!geminiKey && !anthropicKey) {
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
    const stream = geminiKey
      ? getGeminiReplyStream(geminiKey, parsed.data.messages, parsed.data.journey)
      : getAnthropicReplyStream(anthropicKey!, parsed.data.messages, parsed.data.journey);
    for await (const delta of stream) {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Chat request failed:', err);
    res.write(`data: ${JSON.stringify({ error: 'Failed to get a response from the AI provider.' })}\n\n`);
  }
  res.end();
}
