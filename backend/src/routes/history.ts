// backend/src/routes/history.ts

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import {
  getCarProfile,
  getUserChats,
  getUserDiagnoses,
  saveCarProfile,
  syncUserProfile,
} from '../services/history.service';

export const historyRouter = Router();

// Sync user profile & journey preference
const userSyncSchema = z.object({
  displayName: z.string().optional(),
  journey: z.enum(['pre-car', 'post-car']).optional(),
});

historyRouter.post('/user/sync', requireAuth, async (req, res) => {
  const parsed = userSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  try {
    await syncUserProfile({
      uid: req.user!.uid,
      email: req.user!.email,
      ...parsed.data,
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to sync user profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save user car profile
const carProfileSchema = z.object({
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int(),
  vin: z.string().optional(),
  engineType: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  mileage: z.number().optional(),
  tankSize: z.number().optional(),
  lastServiceDate: z.string().optional(),
});

historyRouter.post('/car-profile', requireAuth, async (req, res) => {
  const parsed = carProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }

  try {
    const id = await saveCarProfile({
      userId: req.user!.uid,
      ...parsed.data,
    });
    res.json({ success: true, carId: id });
  } catch (err) {
    console.error('Failed to save car profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch user car profile
historyRouter.get('/car-profile', requireAuth, async (req, res) => {
  try {
    const profile = await getCarProfile(req.user!.uid);
    res.json({ profile });
  } catch (err) {
    console.error('Failed to get car profile:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch diagnostic history
historyRouter.get('/diagnoses', requireAuth, async (req, res) => {
  try {
    const diagnoses = await getUserDiagnoses(req.user!.uid);
    res.json({ diagnoses });
  } catch (err) {
    console.error('Failed to fetch diagnoses:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Fetch chat history
historyRouter.get('/chats', requireAuth, async (req, res) => {
  try {
    const chats = await getUserChats(req.user!.uid);
    res.json({ chats });
  } catch (err) {
    console.error('Failed to fetch chats:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
