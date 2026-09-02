// frontend/src/components/CarHologram/urgencyColors.ts
//
// red=critical / yellow=warning / green=healthy, per the design doc's 3D
// hologram spec — the warning color is reused verbatim from the app's
// existing dark palette (the same amber used for mic-error notes elsewhere)
// so it ties into the avatar's existing health-color language rather than
// introducing a clashing new yellow.

export type Urgency = 'critical' | 'warning' | 'healthy' | 'unknown';

export const URGENCY_COLORS: Record<Urgency, string> = {
  critical: '#ef4444',
  warning: '#f0b45f',
  healthy: '#34d399',
  unknown: '#93a6c6',
};
