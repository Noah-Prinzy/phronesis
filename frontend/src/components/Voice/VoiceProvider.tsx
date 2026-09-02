// frontend/src/components/Voice/VoiceProvider.tsx

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// Empty by default — /api/tts is served by a Vercel serverless function
// deployed alongside the frontend, same origin, no URL needed. Set
// VITE_API_URL in frontend/.env.local only for local dev against the
// standalone Express server in backend/ instead (e.g. http://localhost:3001).
const API_URL = import.meta.env.VITE_API_URL ?? '';

interface VoiceContextValue {
  /** Speaks `text` aloud, interrupting whatever is currently playing. Resolves once playback finishes. */
  speak: (text: string) => Promise<void>;
  /** Stops whatever is currently playing/generating, without starting anything new. */
  stop: () => void;
  /** True while audio is actively playing. */
  isSpeaking: boolean;
}

const VoiceContext = createContext<VoiceContextValue | null>(null);

/**
 * Phronesis' voice — Gemini's native TTS (gemini-3.1-flash-tts-preview),
 * generated server-side via /api/tts and just played back here. Much
 * simpler than the client-side model this replaced (Kokoro, then eSpeak-NG,
 * then Piper): no WASM, no Worker, no model to load — the heavy lifting
 * happens in a hosted API call, so there's no browser memory pressure or
 * GPU-context risk to manage. Mount once near the app root; every page
 * reaches it via `useVoice()` and shares the same audio element instead of
 * each creating its own.
 */
export function VoiceProvider({ children }: { children: ReactNode }) {
  // One persistent element, reused across every speak() call, rather than a
  // fresh `new Audio()` each time — browsers tie their "has the user
  // interacted with this page" autoplay permission to the page as a whole,
  // not to a specific element, but reusing one element also means a gesture
  // that arrives *after* a blocked play() (see the unlock listener below)
  // has something concrete to retry.
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  // Bumped by stop()/speak() so an in-flight request from a superseded call
  // can recognize it's stale and bail out instead of playing over whatever
  // replaced it.
  const requestIdRef = useRef(0);
  const gestureUnlockedRef = useRef(false);

  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const audio = new Audio();
    audioElRef.current = audio;
    return () => {
      audio.pause();
    };
  }, []);

  // Browsers block audio-with-sound from playing until the user has
  // interacted with the page at least once. As soon as *any* interaction
  // happens anywhere in the app, retry whatever's currently loaded.
  useEffect(() => {
    function unlock() {
      if (gestureUnlockedRef.current) return;
      gestureUnlockedRef.current = true;
      const audio = audioElRef.current;
      if (audio && audio.paused && audio.src) {
        audio.play().catch((err: unknown) => console.error('Voice: still blocked after gesture:', err));
      }
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    }
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    audioElRef.current?.pause();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stop();
      const requestId = requestIdRef.current;

      // Guaranteed never to throw — a caller awaiting speak() must always
      // get to resume, even if generation failed, rather than hanging.
      try {
        const response = await fetch(`${API_URL}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: trimmed }),
        });
        if (!response.ok) throw new Error(`TTS request failed: ${response.status}`);
        if (requestId !== requestIdRef.current) return; // superseded while generating

        const blob = await response.blob();
        if (requestId !== requestIdRef.current) return;

        const audio = audioElRef.current;
        if (!audio) return;
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        audio.src = url;
        setIsSpeaking(true);

        await new Promise<void>((resolve) => {
          audio.onended = () => resolve();
          audio.onerror = () => resolve();
          audio.play().catch((err: unknown) => {
            // Most commonly the browser's autoplay-without-a-gesture block —
            // the gesture-unlock listener above will retry this same element
            // once the user interacts with the page.
            console.error('Voice: playback blocked:', err);
            resolve();
          });
        });
      } catch (err) {
        console.error('Voice: speak() failed:', err);
      }

      if (requestId === requestIdRef.current) {
        setIsSpeaking(false);
      }
    },
    [stop],
  );

  const value = useMemo(() => ({ speak, stop, isSpeaking }), [speak, stop, isSpeaking]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

/**
 * Access Phronesis' voice from any page: `speak(text)`, `stop()`,
 * `isSpeaking`. Must be rendered under a `VoiceProvider` (mounted once in
 * App.tsx).
 */
export function useVoice(): VoiceContextValue {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoice must be used within a VoiceProvider');
  return ctx;
}
