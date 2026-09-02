// frontend/src/diagnosisStorage.ts
//
// Carries the most recent diagnostic report from /diagnosis to /solutions,
// and accumulates the post-service outcome (booked/resolved/rating) onto
// it. localStorage rather than router state so a direct refresh of
// /solutions still works, same as everything else in this app.

export type DiagnosisCategory = 'engine' | 'electrical' | 'brakes' | 'transmission' | 'general';
export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface DiagnosticSolution {
  option: string;
  costLow: number;
  costHigh: number;
}

export interface DiagnosticRating {
  stars: number;
  comment?: string;
  photoDataUrls?: string[];
}

export interface DiagnosticReport {
  issue: string;
  rootCause: string;
  category: DiagnosisCategory;
  urgencyLevel: UrgencyLevel;
  confidence: number;
  costEstimateLow: number;
  costEstimateHigh: number;
  timeline: string;
  solutions: DiagnosticSolution[];
  detectedCodes: string[];
  createdAt: string;
  resolvedAt?: string;
  bookedAt?: string;
  rating?: DiagnosticRating;
}

const DIAGNOSTIC_REPORT_KEY = 'phronesis:diagnosticReport';

export function getStoredDiagnosticReport(): DiagnosticReport | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(DIAGNOSTIC_REPORT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DiagnosticReport;
  } catch {
    return null;
  }
}

export function setStoredDiagnosticReport(report: DiagnosticReport): void {
  window.localStorage.setItem(DIAGNOSTIC_REPORT_KEY, JSON.stringify(report));
}

export function clearStoredDiagnosticReport(): void {
  window.localStorage.removeItem(DIAGNOSTIC_REPORT_KEY);
}
