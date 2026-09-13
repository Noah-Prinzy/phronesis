// backend/src/routes/history.ts

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { auth } from '../config/firebase.js';
import {
  deleteUserData,
  exportUserData,
  getCarProfile,
  getPreferences,
  getUserChats,
  getUserDiagnoses,
  saveCarProfile,
  savePreferences,
  syncUserProfile,
} from '../services/history.service.js';

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


// ----------------------------------------------------------- preferences

const preferencesSchema = z.object({
  faultAlerts: z.boolean().optional(),
  serviceReminders: z.boolean().optional(),
});

historyRouter.get('/preferences', requireAuth, async (req, res) => {
  try {
    res.json(await getPreferences(req.user!.uid));
  } catch (err) {
    console.error('Failed to read preferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

historyRouter.patch('/preferences', requireAuth, async (req, res) => {
  const parsed = preferencesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.issues });
    return;
  }
  try {
    await savePreferences(req.user!.uid, parsed.data);
    res.json(await getPreferences(req.user!.uid));
  } catch (err) {
    console.error('Failed to save preferences:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------- export

historyRouter.get('/account/export', requireAuth, async (req, res) => {
  try {
    const data = await exportUserData(req.user!.uid);
    // Named so the download lands as a real file rather than a browser tab
    // full of JSON.
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="phronesis-${stamp}.json"`);
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to export account:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------- delete

/**
 * Deleting the Firestore documents is only half of it — the Firebase Auth
 * user has to go too, or the email stays registered and they cannot sign up
 * again with it. Data first: if the auth record went first the request would
 * lose its own credentials mid-flight and orphan everything else.
 */
historyRouter.delete('/account', requireAuth, async (req, res) => {
  const uid = req.user!.uid;
  try {
    await deleteUserData(uid);
    await auth.deleteUser(uid);
    res.json({ deleted: true });
  } catch (err) {
    console.error('Failed to delete account:', err);
    res.status(500).json({ error: 'Could not delete the account. Nothing has been removed.' });
  }
});
