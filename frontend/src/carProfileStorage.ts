// frontend/src/carProfileStorage.ts
//
// Car details for the post-car journey — same localStorage-only pattern as
// profileStorage.ts (no backend/DB yet). Optional beyond make/model/year
// since most fields won't be known until a user fills them in somewhere.

export interface CarProfile {
  vin?: string;
  make: string;
  model: string;
  year: number;
  engineType?: string;
  fuelType?: string;
  transmission?: string;
  mileage?: number;
  tankSize?: number;
  lastServiceDate?: string;
}

const CAR_PROFILE_KEY = 'phronesis:carProfile';

export function getStoredCarProfile(): CarProfile | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(CAR_PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CarProfile;
  } catch {
    return null;
  }
}

export function setStoredCarProfile(profile: CarProfile): void {
  window.localStorage.setItem(CAR_PROFILE_KEY, JSON.stringify(profile));
}

export function clearStoredCarProfile(): void {
  window.localStorage.removeItem(CAR_PROFILE_KEY);
}
