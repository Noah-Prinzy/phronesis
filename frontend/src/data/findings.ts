import type { Severity } from '../ui'

/**
 * Mock diagnostic data.
 *
 * Everything in this file is invented, and it is the only file on the
 * Diagnosis page that will be deleted outright in step 4 — the page reads
 * findings through `mockScan`, so swapping it for the real OBD pipeline
 * touches nothing else.
 */

/** Where a fault sits on the car, in model space. */
export type CarPart = 'front-brakes' | 'rear-brakes' | 'engine' | 'cabin' | 'battery'

export interface Finding {
  id: string
  /** The OBD trouble code, where there is one. */
  code?: string
  title: string
  /** Plain language. Never the code repeated back at the user. */
  explain: string
  severity: Severity
  /** 0–1. Shown, because a confident guess and a hunch are different things. */
  confidence: number
  part: CarPart
  /** Must fix vs can wait. Grouping, not decoration. */
  urgent: boolean
}

export interface ScanResult {
  findings: Finding[]
  at: string
  /** Absent when no reader is paired — see §8.3 fallback modes. */
  source: 'obd' | 'described'
}

const WITH_FAULTS: ScanResult = {
  at: 'today 09:41',
  source: 'obd',
  findings: [
    {
      id: 'f1',
      code: 'C1201',
      title: 'Front brake pads',
      explain:
        'Worn down to the wear indicator. That rattle under braking is the metal tab doing exactly what it was designed to do.',
      severity: 'high',
      confidence: 0.92,
      part: 'front-brakes',
      urgent: true,
    },
    {
      id: 'f2',
      code: 'P0325',
      title: 'Engine knock sensor',
      explain:
        'Likely carbon buildup or a tank of low-grade fuel. Worth fixing within a fortnight, not today.',
      severity: 'warning',
      confidence: 0.74,
      part: 'engine',
      urgent: true,
    },
    {
      id: 'f3',
      title: 'Cabin filter due',
      explain: 'Routine, by mileage. Cheap, and you can do it yourself in ten minutes.',
      severity: 'routine',
      confidence: 0.99,
      part: 'cabin',
      urgent: false,
    },
  ],
}

const CLEAN: ScanResult = { at: 'today 09:41', source: 'obd', findings: [] }

export type Scenario = 'faults' | 'clean'

/**
 * Stands in for the OBD scan.
 *
 * The caller names the scenario rather than the module counting calls: an
 * effect that runs twice — which StrictMode does deliberately — must not
 * change what the user sees. Both scenarios are reachable while the page is
 * reviewed, and the switch goes with the rest of this file in step 4.
 */
export function mockScan(scenario: Scenario = 'faults'): Promise<ScanResult> {
  const result = scenario === 'clean' ? CLEAN : WITH_FAULTS
  return new Promise((resolve) => setTimeout(() => resolve(result), 1600))
}
