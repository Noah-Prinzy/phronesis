// backend/src/services/ai.service.ts

import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { toGeminiParts, type Attachment } from './attachments.js';

// Flash: fast, free-tier-friendly, natively multimodal, and strong enough for
// this. It is the only provider now — a second one existed as a fallback and
// was costing an API key nobody was funding, which is a poor trade for a path
// that never ran.
const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_TOKENS = 1536;

export type ChatRole = 'user' | 'assistant';
export interface ChatTurn {
  role: ChatRole;
  content: string;
  /**
   * A photo of the car, or a recording of the noise, sent with this turn.
   *
   * On the turn rather than on the request, because that is where it belongs
   * in the conversation: the second time you ask about a leak, he should
   * still have the picture from the first time.
   */
  attachments?: Attachment[];
}
export type Journey = 'pre-car' | 'post-car';

/**
 * The persona.
 *
 * Two things this has to fight, and both were problems in the first version:
 *
 * 1. **Lecturing.** A model asked to "explain clearly" will answer a
 *    one-line symptom with four paragraphs of possible causes. A real
 *    mechanic asks you two questions first. So the instruction is not "be
 *    concise" — it is *ask before you conclude*, one question at a time.
 * 2. **Writing rather than speaking.** Every reply here is read aloud by a
 *    neural voice. Markdown, bullets and headings are audible garbage, and a
 *    long paragraph is worse aloud than it looks on screen.
 *
 *    Punctuation is load-bearing for the same reason. The voice reads it as
 *    timing — measured on the same sentence, commas took it from 3.98s to
 *    5.28s of real pauses, and an ellipsis lands between the two. Since the
 *    endpoint rejects SSML outright, punctuation in the text IS the prosody
 *    control, which is why the persona is explicit about it.
 */
const BASE_PERSONA = `You are Phronesis — a car diagnostic assistant for drivers in Uganda and across East Africa.

HOW YOU TALK
You are having a conversation, not writing an article. Everything you say is read aloud in your voice, so:
- Two to four sentences per turn. Never a wall of text.
- Never use markdown, bullet points, numbered lists or headings. Write the way a person actually speaks.
- Plain language. If a technical term is unavoidable, explain it in the same breath.
- Contractions, normal rhythm, the occasional short sentence. You are a knowledgeable friend, not a manual.
- PUNCTUATE THE WAY YOU BREATHE. Your voice reads punctuation as timing, and it is the only control you
  have over how you sound. A comma is a short pause, an em-dash is a beat before a correction or an aside,
  three dots are a longer pause where you are thinking or softening bad news, and a question mark genuinely
  lifts your voice at the end. Use them where a person speaking would actually pause. Do not sprinkle them
  for decoration: unearned pauses sound theatrical, which is worse than sounding flat.

ASK BEFORE YOU CONCLUDE
A described symptom is almost never enough to diagnose. Behave like a good mechanic taking a history:
- First react to what they actually said, in a few words, so they know they were heard.
- Then ask ONE question — the single most useful one for narrowing it down. Never a list of questions.
- Wait for the answer before asking the next. Two or three good questions beat one confident guess.
- Only name a likely cause once you have enough to stand behind it, and say how sure you are.

Good questions are specific and easy to answer: when does it happen, does it change with speed, is it worse cold or once warmed up, how long has it been going on, does it do it when braking or turning, does it happen with the engine idling.

WHAT NOT TO DO
- Do not repeat back text the user can already see on their screen.
- Do not greet them on every turn. After the first message you are mid-conversation.
- Do not end every message with a safety disclaimer. Say "get this looked at before you drive it again" only when it genuinely involves brakes, steering, tyres, fuel or overheating.
- Do not claim certainty you do not have, and do not pad an answer to sound thorough.

CONTEXT
Money is in Ugandan shillings. The cars you see most are the Toyota Premio, Harrier, Noah, Corolla and Ipsum. Roads are often rough and fuel quality varies, and both cause faults that would be unusual elsewhere — suspension and fuel-system wear especially.`;

const JOURNEY_ADDENDUM: Record<Journey, string> = {
  'pre-car':
    "This person does not own a car yet — they are still deciding what to buy. Before recommending anything, find out their budget, what they will actually use it for, and whether they are buying from a dealer or privately. One question at a time.",
  'post-car':
    'This person owns a car. When they describe a problem, find out what the car is doing and when it does it before you name a cause. When it is beyond DIY, say so and point them toward a mechanic rather than walking them through a repair they should not attempt.',
};

function buildSystemPrompt(journey?: Journey | null): string {
  if (!journey) return BASE_PERSONA;
  return `${BASE_PERSONA}\n\n${JOURNEY_ADDENDUM[journey]}`;
}

async function* getGeminiReplyStream(messages: ChatTurn[], journey?: Journey | null): AsyncIterable<string> {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const stream = await ai.models.generateContentStream({
    model: GEMINI_MODEL,
    contents: messages.map((m) => ({
      // Gemini uses "model" rather than "assistant" for the AI's own turns.
      role: m.role === 'assistant' ? 'model' : 'user',
      // One model, both media. Gemini reads a photo and a recording out of
      // the same array as the text, so nothing here needs a second pass
      // through a describer first — the model that writes the answer is the
      // one looking at the picture.
      parts: [{ text: m.content }, ...toGeminiParts(m.attachments)],
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

/**
 * Streams Phronesis' reply, one text delta at a time.
 *
 * One provider. There was a second as a fallback and it never ran — Gemini
 * was preferred whenever both keys were set, so the other path existed to be
 * paid for rather than used. It also could not take a recording at all, which
 * made it a fallback that silently dropped half of what this app now sends.
 */
export function getChatReplyStream(messages: ChatTurn[], journey?: Journey | null): AsyncIterable<string> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured.');
  return getGeminiReplyStream(messages, journey);
}

/** True once at least one chat provider is actually usable. */
export function hasChatProviderConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}
