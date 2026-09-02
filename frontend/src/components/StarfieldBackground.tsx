// frontend/src/components/StarfieldBackground.tsx

import { useEffect, useRef } from 'react';
import type { AvatarTheme } from './AvatarElement/avatarShader';

interface Star {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  twinklePhase: number;
}

const STAR_COUNT = 130;
const STAR_MIN_RADIUS_PX = 0.4;
const STAR_MAX_RADIUS_PX = 1.1;
/** Very slow drift, in px/frame — meant to be barely perceptible, not an obvious animation. */
const DRIFT_SPEED_PX = 0.012;
const TWINKLE_SPEED = 0.012;

export interface StarfieldBackgroundProps {
  /** dark -> white stars on a dark ground; light -> near-black stars on a light ground. */
  theme: AvatarTheme;
  /** Optional extra classes for the canvas element (e.g. to layer it precisely). */
  className?: string;
}

/**
 * A slow-moving, tiny starfield — meant to sit behind a page's content as a
 * subtle ambient background, not to draw attention on its own. Renders on a
 * plain 2D canvas (not WebGL) since a few hundred dots redrawn once a frame
 * is trivial work; a shader/WebGL context would be overkill and would
 * compete with the Avatar's own Canvas for GPU resources.
 *
 * The parent element must be `position: relative` (or similar) since this
 * renders as `absolute inset-0`.
 */
export function StarfieldBackground({ theme, className = '' }: StarfieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;

    function resize() {
      const parent = canvas!.parentElement;
      width = parent ? parent.clientWidth : window.innerWidth;
      height = parent ? parent.clientHeight : window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Seed stars once (on first resize), keep the same set across
      // subsequent resizes rather than re-randomizing.
      if (starsRef.current.length === 0) {
        starsRef.current = Array.from({ length: STAR_COUNT }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: STAR_MIN_RADIUS_PX + Math.random() * (STAR_MAX_RADIUS_PX - STAR_MIN_RADIUS_PX),
          vx: (Math.random() - 0.5) * DRIFT_SPEED_PX,
          vy: (Math.random() - 0.5) * DRIFT_SPEED_PX,
          twinklePhase: Math.random() * Math.PI * 2,
        }));
      }
    }

    resize();
    window.addEventListener('resize', resize);

    const rgb = theme === 'dark' ? '255,255,255' : '15,23,42';
    let elapsed = 0;

    function tick() {
      elapsed += 1;
      ctx!.clearRect(0, 0, width, height);
      for (const star of starsRef.current) {
        star.x += star.vx;
        star.y += star.vy;
        if (star.x < 0) star.x += width;
        else if (star.x > width) star.x -= width;
        if (star.y < 0) star.y += height;
        else if (star.y > height) star.y -= height;

        const twinkle = 0.5 + 0.5 * Math.sin(elapsed * TWINKLE_SPEED + star.twinklePhase);
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${rgb},${(0.25 + twinkle * 0.55).toFixed(3)})`;
        ctx!.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx!.fill();
      }
      rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 -z-10 ${className}`}
    />
  );
}

export default StarfieldBackground;
