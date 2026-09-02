// frontend/src/data/mechanics.ts
//
// No real mechanic partner database exists yet — static placeholder data,
// shaped to match the design doc's mechanic_partners fields, standing in
// until a real marketplace (Phase 4) exists. Kampala addresses, consistent
// with the app's African/Uganda-first framing.

import type { DiagnosisCategory } from '../diagnosisStorage';

export interface Mechanic {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  specialties: DiagnosisCategory[];
  avgRating: number;
  numReviews: number;
}

export const MECHANICS: Mechanic[] = [
  {
    id: 'm1',
    name: 'Kampala Motor Works',
    address: 'Ntinda Rd, Kampala, Uganda',
    phone: '+256700111222',
    hours: 'Mon-Sat 8am-6pm',
    specialties: ['engine', 'transmission'],
    avgRating: 4.8,
    numReviews: 132,
  },
  {
    id: 'm2',
    name: 'Quick Fix Auto Garage',
    address: 'Kira Rd, Kampala, Uganda',
    phone: '+256700333444',
    hours: 'Mon-Sun 7am-7pm',
    specialties: ['engine', 'electrical', 'general'],
    avgRating: 4.6,
    numReviews: 98,
  },
  {
    id: 'm3',
    name: "John's Garage",
    address: 'Jinja Rd, Kampala, Uganda',
    phone: '+256700555666',
    hours: 'Mon-Sat 8am-5pm',
    specialties: ['brakes', 'general'],
    avgRating: 4.4,
    numReviews: 61,
  },
  {
    id: 'm4',
    name: 'Nakawa Auto Electric',
    address: 'Nakawa, Kampala, Uganda',
    phone: '+256700777888',
    hours: 'Mon-Sat 8am-6pm',
    specialties: ['electrical'],
    avgRating: 4.7,
    numReviews: 74,
  },
  {
    id: 'm5',
    name: 'Bugolobi Transmission Specialists',
    address: 'Bugolobi, Kampala, Uganda',
    phone: '+256700999000',
    hours: 'Mon-Fri 8am-6pm',
    specialties: ['transmission', 'engine'],
    avgRating: 4.5,
    numReviews: 45,
  },
  {
    id: 'm6',
    name: 'Entebbe Rd General Motors',
    address: 'Entebbe Rd, Kampala, Uganda',
    phone: '+256700222333',
    hours: 'Mon-Sun 7am-8pm',
    specialties: ['general', 'brakes', 'electrical'],
    avgRating: 4.3,
    numReviews: 53,
  },
];
