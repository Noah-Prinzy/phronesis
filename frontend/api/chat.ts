import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

const GEMINI_FALLBACK_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
];
const MAX_TOKENS = 1536;

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

const JOURNEY_ADDENDUM: Record<string, string> = {
  'pre-car':
    'This person does not own a car yet — they are still deciding what to buy. Before recommending anything, find out their budget, what they will actually use it for, and whether they are buying from a dealer or privately. One question at a time.',
  'post-car':
    'This person owns a car. When they describe a problem, find out what the car is doing and when it does it before you name a cause. When it is beyond DIY, say so and point them toward a mechanic rather than walking them through a repair they should not attempt.',
};

function buildSystemPrompt(journey?: string | null): string {
  if (!journey || !JOURNEY_ADDENDUM[journey]) return BASE_PERSONA;
  return `${BASE_PERSONA}\n\n${JOURNEY_ADDENDUM[journey]}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, journey, chatId } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  const apiKey = process.env.PHRONESIS_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'Gemini API key not configured. Set GEMINI_API_KEY in Vercel environment variables.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    let stream: any = null;
    let lastError: any = null;

    for (const model of GEMINI_FALLBACK_MODELS) {
      try {
        stream = await ai.models.generateContentStream({
          model,
          contents,
          config: {
            systemInstruction: buildSystemPrompt(journey),
            maxOutputTokens: MAX_TOKENS,
          },
        });
        break;
      } catch (err: any) {
        console.warn(`[Vercel Chat] Model ${model} failed (${err?.message || err}). Trying fallback model...`);
        lastError = err;
      }
    }

    if (!stream) {
      return res.status(502).json({ error: lastError?.message || 'All Gemini chat model fallbacks failed' });
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        res.write(`data: ${JSON.stringify({ delta: chunk.text, chatId })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: any) {
    console.error('Chat error:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: err.message || 'Failed to get response from AI provider' });
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message || 'Stream interrupted' })}\n\n`);
      res.end();
    }
  }
}
