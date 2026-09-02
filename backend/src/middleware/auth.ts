// backend/src/middleware/auth.ts

import { NextFunction, Request, Response } from 'express';
import { auth } from '../config/firebase';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

async function extractUserFromHeader(req: Request): Promise<AuthenticatedUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token) return null;

  try {
    const decodedToken = await auth.verifyIdToken(token);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (err) {
    console.warn('Firebase token verification failed:', err);
    return null;
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  req.user = (await extractUserFromHeader(req)) || undefined;
  next();
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const user = await extractUserFromHeader(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. A valid Firebase ID token is required.' });
    return;
  }
  req.user = user;
  next();
}
