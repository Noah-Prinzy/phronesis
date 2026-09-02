// frontend/src/pages/Home.tsx

import { motion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AvatarDock from '../components/AvatarElement/AvatarDock';
import type { AvatarState } from '../components/AvatarElement/avatarStates';
import StarfieldBackground from '../components/StarfieldBackground';
import { useVoice } from '../components/Voice/VoiceProvider';
import { getStoredJourney, type Journey } from '../profileStorage';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
}

const JOURNEY_GREETINGS: Record<Journey, string> = {
  'pre-car':
    "Looking to buy your first car? Tell me your budget and what you'll mainly use it for, and I'll help you figure out what's right for you.",
  'post-car':
    "What's going on with your car? Describe what you're noticing — sounds, warning lights, anything — and I'll help you figure out what's happening.",
};
const DEFAULT_GREETING = "Hey! I'm Phronesis, your AI car diagnostic assistant. What can I help you with today?";

const FALLBACK_REPLY =
  "Sorry, I couldn't reach my AI backend just now. Make sure the backend server is running and has a valid ANTHROPIC_API_KEY, then try again.";

// Empty by default — /api/chat is served by a Vercel serverless function
// deployed alongside the frontend (frontend/api/chat.ts), same origin, no
// URL needed. Set VITE_API_URL in frontend/.env.local only for local dev
// against the standalone Express server in backend/ instead (e.g.
// http://localhost:3001).
const API_URL = import.meta.env.VITE_API_URL ?? '';

/** How long the avatar keeps "responding" after a reply lands, in ms. */
const RESPONDING_HOLD_MS = 2600;

let nextMessageId = 1;

export function Home() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [micNote, setMicNote] = useState<string | null>(null);
  const [isResponding, setIsResponding] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);
  const journeyRef = useRef<Journey | null>(null);
  const respondingTimer = useRef<number | null>(null);
  const { speak, isSpeaking } = useVoice();

  useEffect(() => {
    const journey = getStoredJourney();
    journeyRef.current = journey;
    const greeting = journey ? JOURNEY_GREETINGS[journey] : DEFAULT_GREETING;
    setMessages([{ id: nextMessageId++, role: 'assistant', text: greeting }]);
    speak(greeting);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(
    () => () => {
      if (respondingTimer.current !== null) window.clearTimeout(respondingTimer.current);
    },
    [],
  );

  /** Holds the "responding" state for a beat after a reply arrives, so the
   *  avatar looks like it delivered the answer rather than snapping to idle
   *  the instant the fetch resolves. */
  const markResponded = useCallback(() => {
    setIsResponding(true);
    if (respondingTimer.current !== null) window.clearTimeout(respondingTimer.current);
    respondingTimer.current = window.setTimeout(() => setIsResponding(false), RESPONDING_HOLD_MS);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { id: nextMessageId++, role: 'user', text: trimmed }];
    setMessages(nextMessages);
    setInputText('');
    setIsSending(true);

    const assistantId = nextMessageId++;
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', text: '' }]);

    let accumulated = '';
    const applyText = (text: string) => {
      accumulated = text;
      setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, text } : m)));
    };

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, text }) => ({ role, content: text })),
          journey: journeyRef.current,
        }),
      });
      if (!response.ok || !response.body) throw new Error(`Backend responded with ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (payload === '[DONE]' || !payload) continue;

          const parsed: { delta?: string; error?: string } = JSON.parse(payload);
          if (parsed.delta) {
            applyText(accumulated + parsed.delta);
          } else if (parsed.error && !accumulated) {
            // Only replace with the fallback if nothing real arrived yet —
            // a partial real answer is more honest than discarding it.
            applyText(FALLBACK_REPLY);
          }
        }
      }

      if (accumulated) speak(accumulated);
    } catch (err) {
      console.error('Chat request failed:', err);
      if (!accumulated) applyText(FALLBACK_REPLY);
    } finally {
      setIsSending(false);
      markResponded();
    }
  }

  function handleDiagnoseClick() {
    const symptomText = messages
      .filter((m) => m.role === 'user')
      .map((m) => m.text)
      .join('\n');
    navigate('/diagnosis', { state: { symptomText } });
  }

  // The conversation has started once the user has actually said something —
  // the opening greeting alone still counts as "Phronesis is the screen".
  const hasConversation = messages.some((message) => message.role === 'user');

  /**
   * Plan §4.4: centred while Phronesis is the focus, docked to the corner
   * once answers need the space.
   */
  const dockMode = hasConversation ? 'corner' : 'center';

  /**
   * One state, resolved in priority order. Thinking wins over listening
   * because a request already in flight is the more truthful thing to show.
   */
  const avatarState: AvatarState = isSending
    ? 'thinking'
    : isResponding || isSpeaking
      ? 'responding'
      : micOn
        ? 'listening'
        : 'idle';

  return (
    <div className="relative flex h-screen w-screen flex-col bg-[#050914]">
      <StarfieldBackground theme="dark" />

      <header className="flex items-center gap-3 border-b border-[#1c2b47] px-6 py-4">
        <span className="font-semibold text-[#e8eefb]">Phronesis</span>
        <button
          type="button"
          onClick={handleDiagnoseClick}
          aria-label="Run diagnosis"
          title="Run diagnosis"
          className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border border-[#3b82f6]/40 text-[#e8eefb] transition-colors hover:bg-[#3b82f6]/15"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 12h3l2-5 3 10 2-7 2 4h4"
            />
          </svg>
        </button>
        <Link
          to="/account"
          aria-label="Account"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[#3b82f6]/40 text-[#e8eefb] transition-colors hover:bg-[#3b82f6]/15"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.24-8 5v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1c0-2.76-3.58-5-8-5Z" />
          </svg>
        </Link>
      </header>

      {/* The dock overlays this region rather than the whole page, so the
          docked avatar lands above the composer instead of on top of it. */}
      <div className="relative min-h-0 flex-1">
        <motion.div
          className="h-full overflow-y-auto px-6 py-6"
          initial={false}
          animate={{ opacity: hasConversation ? 1 : 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          aria-hidden={!hasConversation}
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-4 pr-0 sm:pr-24">
            {messages
              .filter((message) => message.text.length > 0)
              .map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'ml-auto bg-[#3b82f6] text-white'
                    : 'mr-auto border border-[#1c2b47] bg-[#0c1424] text-[#e8eefb]'
                }`}
              >
                {message.text}
              </motion.div>
            ))}
            {isSending && (
              <div className="mr-auto max-w-[80%] rounded-2xl border border-[#1c2b47] bg-[#0c1424] px-4 py-3 text-sm text-[#93a6c6]">
                Thinking...
              </div>
            )}
            <div ref={listEndRef} />
          </div>
        </motion.div>

        <AvatarDock
          mode={dockMode}
          state={avatarState}
          theme="dark"
          micOn={micOn}
          onMicToggle={setMicOn}
          onMicError={setMicNote}
        >
          {/* Only shown while centred: what to do next. The greeting itself
              is voice-only now, no on-screen text. */}
          <div className="mx-auto max-w-md px-6 text-center">
            <p className="text-xs font-medium tracking-wide text-[#60a5fa] uppercase">
              Tap the avatar to speak, or type below
            </p>
            {micNote && <p className="mt-3 text-xs text-[#f0b45f]">{micNote}</p>}
          </div>
        </AvatarDock>
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[#1c2b47] px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message Phronesis..."
            disabled={isSending}
            className="flex-1 rounded-lg border border-[#3b82f6]/45 bg-transparent px-4 py-3 text-[#e8eefb] placeholder:text-[#93a6c6]/70 outline-none focus:border-[#3b82f6] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={isSending}
            className="shrink-0 rounded-lg bg-[#3b82f6] px-6 py-3 font-semibold text-white transition-colors hover:bg-[#2f6fd6] disabled:opacity-60"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default Home;
