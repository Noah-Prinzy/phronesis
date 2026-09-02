// backend/src/services/ai.service.ts

import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

// Sonnet is the right balance of quality/cost/latency for a conversational
// assistant like this — no need for Opus-level reasoning power here.
const MODEL = 'claude-sonnet-5';
const MAX_TOKENS = 1024;

export type ChatRole = 'user' | 'assistant';
export interface ChatTurn {
  role: ChatRole;
  content: string;
}
export type Journey = 'pre-car' | 'post-car';

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

/** Sends the conversation to Claude and returns Phronesis' reply as plain text. */
export async function getChatReply(messages: ChatTurn[], journey?: Journey | null): Promise<string> {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(journey),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}
