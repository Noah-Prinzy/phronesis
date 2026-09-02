// frontend/src/components/AvatarElement/AvatarDock.tsx
//
// The positioning rule from the app plan (§4.4), as a component:
//
//   "Avatar adapts to screen content — centers when it's the focus,
//    minimizes when other information needs space. User can still
//    tap/interact with the corner avatar."
//
// Why this animates geometry instead of scaling with a CSS transform
// -------------------------------------------------------------------
// Scaling a fixed-size canvas with `transform` is the cheaper way to move
// between the two positions, and it is what this component did first. It was
// dropped because the size the avatar renders at has to be a real number:
// react-three-fiber needs to be handed concrete pixels (see the note in
// AvatarElement about its render loop parking itself), and a transform hides
// the true size from it. So the box is animated for real — left, top, width
// and height in pixels, stepped by rAF, with the avatar's `size` prop
// following. That does resize the drawing buffer on each frame of the ~600ms
// move, which is the price of it being reliably visible.
//
// Two smaller things worth keeping:
//   * The horizontal and vertical axes ease differently, so the avatar
//     travels along an arc rather than a straight diagonal.
//   * Never hand AvatarElement a percentage size — there is no pixel value
//     to measure until layout, which is the same problem again.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import AvatarElement from './AvatarElement';
import type { AvatarTheme } from './avatarShader';
import type { AvatarMotion, AvatarState } from './avatarStates';

export type DockMode = 'center' | 'corner';

export interface AvatarDockProps {
  mode: DockMode;
  state: AvatarState;
  theme?: AvatarTheme;

  micOn?: boolean;
  onMicToggle?: (next: boolean) => void;
  onMicError?: (message: string) => void;

  /** Size of the docked avatar, in px. */
  cornerSize?: number;
  /** Distance from the corner, in px. */
  margin?: number;
  /** Vertical placement of the centred avatar, as a fraction of the height. */
  centerAt?: number;
  pointCount?: number;
  /** Core packing. See createAvatarGeometry. */
  coreBias?: number;
  /** Live motion overrides — how the studio drives the docked avatar. */
  motionOverride?: Partial<AvatarMotion>;

  /** Rendered under the centred avatar and faded out once it docks. */
  children?: ReactNode;
  className?: string;
}

const MOVE_MS = 620;

/** Progress easings. The mismatch between them is the arc. */
const easeX = (t: number) => 1 - Math.pow(1 - t, 3); // settles late
const easeY = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The centred size, from the space actually available. */
function centerSizeFor(width: number, height: number): number {
  return Math.round(Math.min(400, Math.max(190, Math.min(width, height) * 0.62)));
}

export function AvatarDock({
  mode,
  state,
  theme = 'dark',
  micOn,
  onMicToggle,
  onMicError,
  cornerSize = 64,
  margin = 24,
  centerAt = 0.42,
  pointCount = 5000,
  coreBias,
  motionOverride,
  children,
  className = '',
}: AvatarDockProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState({ width: 0, height: 0 });

  // useLayoutEffect, not useEffect: this runs after the DOM is committed but
  // BEFORE paint, so the avatar below can be gated on a real measurement and
  // still mount within the same frame. That matters more than it looks —
  // react-three-fiber measures its container once as it mounts and relies on
  // a ResizeObserver for every update after that. Mount it at a provisional
  // size and, anywhere ResizeObserver is unreliable, it keeps that size
  // forever: a live GL context that composites as empty. Measuring first and
  // mounting once, at the right size, needs no observer to be correct.
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setHost((prev) =>
        prev.width === rect.width && prev.height === rect.height
          ? prev
          : { width: rect.width, height: rect.height },
      );
    };

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    const raf = requestAnimationFrame(measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      cancelAnimationFrame(raf);
    };
  }, []);

  // 0 = centred, 1 = docked.
  const target = mode === 'center' ? 0 : 1;
  const [progress, setProgress] = useState(target);
  const progressRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (progressRef.current === target) return;

    const from = progressRef.current;
    const startedAt = performance.now();
    // Cover the remaining distance in proportional time, so interrupting a
    // move mid-flight doesn't take a full duration to finish a short hop.
    const duration = MOVE_MS * Math.abs(target - from);

    const step = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, (now - startedAt) / duration);
      const value = lerp(from, target, t);
      progressRef.current = value;
      setProgress(value);
      if (t < 1) frameRef.current = requestAnimationFrame(step);
    };

    frameRef.current = requestAnimationFrame(step);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target]);

  const measured = host.width > 0 && host.height > 0;
  const centerSize = centerSizeFor(host.width, host.height);

  const tx = easeX(progress);
  const ty = easeY(progress);

  // Rounded so the drawing buffer resizes in whole pixels rather than
  // reallocating on sub-pixel changes.
  const size = Math.round(lerp(centerSize, cornerSize, ty));
  const inset = margin + cornerSize / 2;
  const cx = lerp(host.width / 2, host.width - inset, tx);
  const cy = lerp(host.height * centerAt, host.height - inset, ty);

  const centred = progress < 0.02;

  return (
    <div ref={hostRef} className={`pointer-events-none absolute inset-0 ${className}`}>
      {measured && (
        <div
          className="pointer-events-auto absolute"
          style={{
            left: Math.round(cx - size / 2),
            top: Math.round(cy - size / 2),
            width: size,
            height: size,
          }}
        >
          <AvatarElement
            state={state}
            size={size}
            theme={theme}
            micOn={micOn}
            onMicToggle={onMicToggle}
            onMicError={onMicError}
            pointCount={pointCount}
            coreBias={coreBias}
            motionOverride={motionOverride}
          />
        </div>
      )}

      {measured && children && (
        <div
          className={`absolute inset-x-0 ${centred ? 'pointer-events-auto' : 'pointer-events-none'}`}
          style={{
            top: Math.round(host.height * centerAt + centerSize / 2 + 24),
            opacity: 1 - Math.min(1, progress * 3),
            transition: 'opacity 200ms ease-out',
          }}
          aria-hidden={!centred}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default AvatarDock;
