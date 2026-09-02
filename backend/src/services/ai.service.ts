// backend/src/services/ai.service.ts

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env';

// Sonnet is the right balance of quality/cost/latency for a conversational
// assistant like this — no need for Opus-level reasoning power here.
const ANTHROPIC_MODEL = 'claude-sonnet-5';
// Flash: fast, free-tier-friendly, strong enough for this — the free stand-in
// while a custom model is being trained.
const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_TOKENS = 1536;

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

async function getGeminiReply(messages: ChatTurn[], journey?: Journey | null): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
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

async function getAnthropicReply(messages: ChatTurn[], journey?: Journey | null): Promise<string> {
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSystemPrompt(journey),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const textBlock = response.content.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
}

/**
 * Sends the conversation to whichever provider is configured and returns
 * Phronesis' reply as plain text. Gemini is preferred when both keys are
 * set — it's the free stand-in used while a custom model trains; once
 * that's done (or Claude is wanted instead), just unset GEMINI_API_KEY
 * (or leave it blank) and this falls through to Anthropic automatically,
 * no code change needed.
 */
export async function getChatReply(messages: ChatTurn[], journey?: Journey | null): Promise<string> {
  if (env.GEMINI_API_KEY) return getGeminiReply(messages, journey);
  if (env.ANTHROPIC_API_KEY) return getAnthropicReply(messages, journey);
  throw new Error('Neither GEMINI_API_KEY nor ANTHROPIC_API_KEY is configured.');
}

/** True once at least one chat provider is actually usable. */
export function hasChatProviderConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY || env.ANTHROPIC_API_KEY);
}
