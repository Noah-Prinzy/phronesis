// frontend/src/components/AvatarElement/AvatarElement.tsx
//
// The drop-in avatar. Renders the point cloud, exposes the four states, and
// acts as the microphone toggle when tapped.
//
// It is deliberately self-contained: no Tailwind, no app imports, no router,
// no global store. Everything it needs arrives as props, so it can be
// dropped into any React app that has react, three and @react-three/fiber.

import { Canvas } from '@react-three/fiber';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from 'react';
import AvatarField from './AvatarField';
import type { AvatarTheme } from './avatarShader';
import { AVATAR_STATE_LABEL, type AvatarMotion, type AvatarState } from './avatarStates';
import { useMicrophone } from './useMicrophone';

export interface AvatarElementProps {
  /**
   * Controlled state. Leave it off and the element runs itself: idle when
   * the mic is off, listening when it is on — enough for a standalone demo,
   * not enough for a real conversation, where the app owns this.
   */
  state?: AvatarState;
  /**
   * Rendered size. A number is treated as pixels; a string is used as-is, so
   * `clamp()` and other CSS lengths work.
   *
   * Do NOT pass a percentage. The canvas is absolutely positioned inside
   * this box, and a percentage leaves react-three-fiber measuring zero on
   * its first pass and never recovering — the element mounts, reports the
   * right size in the DOM, holds a live WebGL context, and draws nothing.
   * Resolve the percentage yourself and pass the pixel value.
   */
  size?: number | string;
  theme?: AvatarTheme;

  /** Controlled mic. Pair with onMicToggle. */
  micOn?: boolean;
  /** Starting mic value when uncontrolled. */
  defaultMicOn?: boolean;
  /**
   * Fired on every tap with the value the mic is moving to. In controlled
   * mode nothing changes until you pass the new `micOn` back down.
   */
  onMicToggle?: (nextMicOn: boolean) => void;

  /**
   * When true (the default) the element captures microphone audio itself and
   * drives the cloud with it. Set false if your app already has an audio
   * pipeline, and feed `micLevel` instead.
   */
  captureMic?: boolean;
  /** External amplitude 0..1, used when captureMic is false. */
  micLevel?: number;
  /** Called when the browser refuses the microphone, with a display message. */
  onMicError?: (message: string) => void;

  /** Number of points. Drop it for small renders or low-end devices. */
  pointCount?: number;
  /** Core packing. Higher = denser centre, sparser rim. */
  coreBias?: number;
  /** Live motion overrides — how the tuning lab drives this component. */
  motionOverride?: Partial<AvatarMotion>;

  /** Turns off the tap-to-toggle behaviour and the button semantics. */
  interactive?: boolean;
  /** Scales motion down when the viewer prefers reduced motion. Default true. */
  respectReducedMotion?: boolean;

  className?: string;
  style?: CSSProperties;
}

/** Multipliers applied to the motion when the viewer prefers reduced motion. */
const CALM: Partial<AvatarMotion> = {
  churn: 0.06,
  spin: 0.01,
  pulse: 0,
  twinkle: 0.04,
  turbulence: 0.02,
};

export function AvatarElement({
  state,
  size = 320,
  theme = 'dark',
  micOn,
  defaultMicOn = false,
  onMicToggle,
  captureMic = true,
  micLevel = 0,
  onMicError,
  pointCount = 5000,
  coreBias = 0.62,
  motionOverride,
  interactive = true,
  respectReducedMotion = true,
  className,
  style,
}: AvatarElementProps) {
  const labelId = useId();

  const [uncontrolledMicOn, setUncontrolledMicOn] = useState(defaultMicOn);
  const isMicControlled = micOn !== undefined;
  const activeMicOn = isMicControlled ? micOn : uncontrolledMicOn;

  const mic = useMicrophone();
  const { start: startMic, stop: stopMic, error: micError } = mic;

  // A lost GL context leaves the cloud frozen on its last frame; remounting
  // the Canvas acquires a fresh one. Browsers do evict contexts under memory
  // pressure, so this is not theoretical.
  const [contextGeneration, setContextGeneration] = useState(0);

  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    if (!respectReducedMotion || typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setPrefersReduced(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, [respectReducedMotion]);

  // Bring the capture stream up and down with the toggle.
  useEffect(() => {
    if (!captureMic) return;
    if (activeMicOn) void startMic();
    else stopMic();
  }, [activeMicOn, captureMic, startMic, stopMic]);

  useEffect(() => {
    if (micError) onMicError?.(micError);
  }, [micError, onMicError]);

  const toggleMic = useCallback(() => {
    if (!interactive) return;
    const next = !activeMicOn;
    if (!isMicControlled) setUncontrolledMicOn(next);
    onMicToggle?.(next);
  }, [interactive, activeMicOn, isMicControlled, onMicToggle]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggleMic();
    },
    [toggleMic],
  );

  const effectiveState: AvatarState = state ?? (activeMicOn ? 'listening' : 'idle');
  const effectiveLevel = captureMic ? mic.level : micLevel;

  const mergedOverride = useMemo<Partial<AvatarMotion> | undefined>(() => {
    if (!prefersReduced) return motionOverride;
    return { ...CALM, ...motionOverride };
  }, [prefersReduced, motionOverride]);

  const dimension = typeof size === 'number' ? `${size}px` : size;

  // Focus ring is drawn on a wrapper rather than the canvas, which cannot
  // take one — without this the element is unusable by keyboard.
  const focusRef = useRef<HTMLDivElement>(null);

  // The element measures its own box and hands the number to the scene.
  // react-three-fiber measuring its own container is not dependable here:
  // mounted before its box settles, it can latch a zero size and never
  // re-measure, so the canvas holds a live GL context and paints nothing.
  // A `size` in CSS units (a clamp(), say) also has no px value until laid
  // out, which is the same problem from the other direction.
  const [boxPx, setBoxPx] = useState(0);
  // useLayoutEffect and a synchronous first read: the size must be known
  // without waiting on a frame. requestAnimationFrame does not run in a
  // hidden or backgrounded tab, so a rAF-only measurement leaves the avatar
  // unsized until the tab is looked at.
  useLayoutEffect(() => {
    const el = focusRef.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const next = Math.round(Math.min(width, height));
      setBoxPx((prev) => (prev === next ? prev : next));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);

    const raf = requestAnimationFrame(() => {
      measure();
      // react-three-fiber sizes itself from a ResizeObserver, and its render
      // loop stays parked until that reports. Some embedded browsers never
      // fire it, and the failure is silent and total: the canvas lays out at
      // the right size, holds a live GL context, and paints nothing forever.
      // One synthetic resize is the documented way back — r3f listens for it
      // and starts the loop. Cheap, idempotent, and fires once per mount.
      window.dispatchEvent(new Event('resize'));
    });

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={focusRef}
      className={className}
      style={{
        position: 'relative',
        width: dimension,
        height: dimension,
        borderRadius: '50%',
        cursor: interactive ? 'pointer' : 'default',
        outlineOffset: '6px',
        touchAction: 'manipulation',
        ...style,
      }}
      onClick={toggleMic}
      onKeyDown={handleKeyDown}
      role={interactive ? 'button' : 'img'}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? activeMicOn : undefined}
      aria-describedby={labelId}
      aria-label={
        interactive
          ? activeMicOn
            ? 'Microphone on. Tap to mute.'
            : 'Microphone off. Tap to speak.'
          : `Assistant ${AVATAR_STATE_LABEL[effectiveState].toLowerCase()}`
      }
    >
      <Canvas
        key={contextGeneration}
        style={{ position: 'absolute', inset: 0 }}
        gl={{ alpha: true, antialias: true }}
        camera={{ position: [0, 0, 3.4], fov: 40 }}
        dpr={[1, 2]}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            setContextGeneration((n) => n + 1);
          });
        }}
      >
        <AvatarField
          state={effectiveState}
          micLevel={effectiveLevel}
          micOn={activeMicOn}
          theme={theme}
          pointCount={pointCount}
          coreBias={coreBias}
          cssSize={boxPx}
          motionOverride={mergedOverride}
        />
      </Canvas>

      {/* Announced to screen readers when the state changes; invisible. */}
      <span
        id={labelId}
        aria-live="polite"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          clipPath: 'inset(50%)',
          whiteSpace: 'nowrap',
        }}
      >
        {AVATAR_STATE_LABEL[effectiveState]}
      </span>
    </div>
  );
}

export default AvatarElement;
