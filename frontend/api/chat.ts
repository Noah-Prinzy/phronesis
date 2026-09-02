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

async function getGeminiReply(apiKey: string, messages: ChatTurn[], journey?: Journey | null): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
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
  return response.text ?? '';
}

async function getAnthropicReply(apiKey: string, messages: ChatTurn[], journey?: Journey | null): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(journey),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.type === 'text' ? textBlock.text : '';
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

  try {
    const reply = geminiKey
      ? await getGeminiReply(geminiKey, parsed.data.messages, parsed.data.journey)
      : await getAnthropicReply(anthropicKey!, parsed.data.messages, parsed.data.journey);
    res.status(200).json({ reply });
  } catch (err) {
    console.error('Chat request failed:', err);
    res.status(502).json({ error: 'Failed to get a response from the AI provider.' });
  }
}
