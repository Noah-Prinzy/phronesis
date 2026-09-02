// frontend/src/hooks/useMockObd.ts
//
// MOCK/SIMULATED — no OBD-II hardware or Web Bluetooth adapter in this
// session. Field names match the design doc's `obd_data_logs` schema so a
// real Web Bluetooth integration can later replace this hook's internals
// without touching consumers (CarHologram, Diagnosis.tsx).

import { useEffect, useState } from 'react';

export interface ObdSnapshot {
  dtcCodes: string[];
  rpm: number;
  temperature: number;
  fuelConsumption: number;
  o2Levels: number;
  batteryVoltage: number;
  timestamp: string;
  alertTriggered: boolean;
}

export type ObdUrgency = 'healthy' | 'warning' | 'critical';

export interface UseMockObdOptions {
  intervalMs?: number;
  /** Matches the design doc's §9.4 example (P0325 engine knock) by default,
   *  so the mock demo output lines up with the literal report template. */
  seedIssue?: 'engine_knock' | 'overheating' | 'battery' | 'none';
}

const DTC_CODES: Record<Exclude<UseMockObdOptions['seedIssue'], undefined>, string[]> = {
  engine_knock: ['P0325'],
  overheating: ['P0217'],
  battery: ['P0562'],
  none: [],
};

function jitter(base: number, spread: number): number {
  return Math.round((base + (Math.random() * 2 - 1) * spread) * 10) / 10;
}

function buildSnapshot(seedIssue: NonNullable<UseMockObdOptions['seedIssue']>): ObdSnapshot {
  const overheating = seedIssue === 'overheating';
  const lowBattery = seedIssue === 'battery';

  return {
    dtcCodes: DTC_CODES[seedIssue],
    rpm: Math.round(jitter(800, 50)),
    temperature: overheating ? jitter(108, 4) : jitter(90, 3),
    fuelConsumption: jitter(7, 0.5),
    o2Levels: jitter(14.5, 1),
    batteryVoltage: lowBattery ? jitter(11.6, 0.2) : jitter(12.6, 0.3),
    timestamp: new Date().toISOString(),
    alertTriggered: seedIssue !== 'none',
  };
}

function deriveUrgency(snapshot: ObdSnapshot): ObdUrgency {
  if (snapshot.dtcCodes.length > 0) return 'critical';
  if (snapshot.temperature > 100 || snapshot.batteryVoltage < 12.0) return 'warning';
  return 'healthy';
}

export function useMockObd(options?: UseMockObdOptions): { snapshot: ObdSnapshot; urgency: ObdUrgency } {
  const intervalMs = options?.intervalMs ?? 3000;
  const seedIssue = options?.seedIssue ?? 'engine_knock';
  const [snapshot, setSnapshot] = useState<ObdSnapshot>(() => buildSnapshot(seedIssue));

  useEffect(() => {
    const id = window.setInterval(() => setSnapshot(buildSnapshot(seedIssue)), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs, seedIssue]);

  return { snapshot, urgency: deriveUrgency(snapshot) };
}
