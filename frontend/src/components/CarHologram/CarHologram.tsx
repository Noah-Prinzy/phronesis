// frontend/src/components/CarHologram/CarHologram.tsx
//
// Public component. Duplicates AvatarElement's container-measurement and
// WebGL-context-loss-recovery patterns rather than sharing a hook with it —
// that boilerplate is already duplicated once between AvatarElement and
// AvatarDock, so duplicating again here follows the existing precedent
// instead of touching voice-critical avatar code for a marginal DRY win.

import { Canvas } from '@react-three/fiber';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import CarModel from './CarModel';
import type { Urgency } from './urgencyColors';

export interface CarHologramProps {
  urgency: Urgency;
  size?: number | string;
  className?: string;
  style?: CSSProperties;
}

export function CarHologram({ urgency, size = 320, className, style }: CarHologramProps) {
  const [contextGeneration, setContextGeneration] = useState(0);
  const dimension = typeof size === 'number' ? `${size}px` : size;

  const boxRef = useRef<HTMLDivElement>(null);
  const [boxPx, setBoxPx] = useState(0);

  useLayoutEffect(() => {
    const el = boxRef.current;
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
      ref={boxRef}
      className={className}
      style={{ position: 'relative', width: dimension, height: dimension, ...style }}
      role="img"
      aria-label={`3D diagnostic hologram, status: ${urgency}`}
    >
      {boxPx > 0 && (
        <Canvas
          key={contextGeneration}
          style={{ position: 'absolute', inset: 0 }}
          gl={{ alpha: true, antialias: true }}
          camera={{ position: [0, 1.5, 5], fov: 45 }}
          dpr={[1, 2]}
          onCreated={({ gl }) => {
            gl.domElement.addEventListener('webglcontextlost', (event) => {
              event.preventDefault();
              setContextGeneration((n) => n + 1);
            });
          }}
        >
          <CarModel urgency={urgency} />
        </Canvas>
      )}
    </div>
  );
}

export default CarHologram;
