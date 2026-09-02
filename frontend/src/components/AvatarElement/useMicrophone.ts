// frontend/src/components/AvatarElement/useMicrophone.ts
//
// Microphone capture for the avatar's "listening" state.
//
// Two things worth knowing before wiring this up:
//
//   * getUserMedia only resolves from a user gesture, and only on a secure
//     origin (https, or localhost during development). The avatar's own tap
//     handler is that gesture, which is why the mic toggle lives on the
//     component rather than somewhere in app chrome.
//   * The stream is stopped and the AudioContext closed whenever the mic is
//     switched off, so the browser's recording indicator goes away. Leaving
//     a live stream open because it might be needed again is the kind of
//     thing users notice and distrust.
//
// If you already capture audio elsewhere (a speech-to-text pipeline, say),
// skip this hook entirely and feed AvatarElement a `micLevel` you own.

import { useCallback, useEffect, useRef, useState } from 'react';

export type MicPermission = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export interface UseMicrophoneResult {
  /** Smoothed amplitude, 0..1. Zero whenever the mic is off. */
  level: number;
  /** True once audio is actually flowing. */
  active: boolean;
  permission: MicPermission;
  /** Last failure, for surfacing a real message instead of silence. */
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
}

/** RMS over the sample window, scaled so ordinary speech lands near 0.3–0.7. */
const LEVEL_GAIN = 2.8;

/**
 * Whatever byte buffer this TypeScript version's AnalyserNode wants. Taken
 * from the method signature rather than written as `Uint8Array`, because
 * TS 5.7+ made typed arrays generic over their backing buffer and a plain
 * `Uint8Array` no longer satisfies it.
 */
type TimeDomainBuffer = Parameters<AnalyserNode['getByteTimeDomainData']>[0];

export function useMicrophone(): UseMicrophoneResult {
  const [level, setLevel] = useState(0);
  const [active, setActive] = useState(false);
  const [permission, setPermission] = useState<MicPermission>('idle');
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const dataRef = useRef<TimeDomainBuffer | null>(null);

  const stop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (contextRef.current) {
      void contextRef.current.close().catch(() => {
        /* already closed — nothing to do */
      });
      contextRef.current = null;
    }
    analyserRef.current = null;
    dataRef.current = null;
    setActive(false);
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current) return;

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setPermission('unsupported');
      setError('This browser cannot capture microphone audio.');
      return;
    }

    setPermission('requesting');
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtor: typeof AudioContext =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const context = new AudioCtor();
      contextRef.current = context;

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyserRef.current = analyser;
      dataRef.current = new Uint8Array(new ArrayBuffer(analyser.fftSize));

      setPermission('granted');
      setActive(true);

      const sample = () => {
        const a = analyserRef.current;
        const buffer = dataRef.current;
        if (!a || !buffer) return;

        a.getByteTimeDomainData(buffer);
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const v = (buffer[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        setLevel(Math.min(1, rms * LEVEL_GAIN));
        rafRef.current = requestAnimationFrame(sample);
      };
      rafRef.current = requestAnimationFrame(sample);
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      setPermission(name === 'NotAllowedError' ? 'denied' : 'idle');
      setError(
        name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it in your browser settings to use voice.'
          : name === 'NotFoundError'
            ? 'No microphone found.'
            : 'Could not start the microphone.',
      );
      stop();
    }
  }, [stop]);

  // Release the device if the component goes away while the mic is on.
  useEffect(() => stop, [stop]);

  return { level, active, permission, error, start, stop };
}

export default useMicrophone;
