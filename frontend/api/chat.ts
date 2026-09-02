// frontend/api/chat.ts
//
// Vercel serverless function — deployed alongside the frontend as /api/chat,
// same origin as the app itself (no CORS needed). This is the deployed
// counterpart of backend/src/routes/chat.ts + ai.service.ts — that
// standalone Express server still exists for local dev, but this file (not
// that server) is what actually runs in production, since the whole app
// deploys as one Vercel project rather than split across two hosts.

import Anthropic from '@anthropic-ai/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';

const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1024;

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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'ANTHROPIC_API_KEY is not configured on the server yet.' });
    return;
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(parsed.data.journey),
      messages: parsed.data.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const textBlock = response.content.find((block) => block.type === 'text');
    res.status(200).json({ reply: textBlock?.type === 'text' ? textBlock.text : '' });
  } catch (err) {
    console.error('Chat request failed:', err);
    res.status(502).json({ error: 'Failed to get a response from Claude.' });
  }
}
