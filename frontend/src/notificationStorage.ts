// frontend/src/notificationStorage.ts
//
// In-app notifications (alerts/recommendations/reminders) — localStorage
// only, same pattern as profileStorage.ts. No push notifications, no
// backend: this is a local notification center, capped so it can't grow
// unbounded.

export type NotificationType = 'alert' | 'recommendation' | 'reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedData?: unknown;
  readAt?: string;
  createdAt: string;
}

const NOTIFICATIONS_KEY = 'phronesis:notifications';
const MAX_NOTIFICATIONS = 50;

export function getStoredNotifications(): Notification[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(NOTIFICATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Notification[]) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: Notification[]): void {
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export function addStoredNotification(input: Omit<Notification, 'id' | 'createdAt'>): Notification {
  const notification: Notification = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const next = [notification, ...getStoredNotifications()].slice(0, MAX_NOTIFICATIONS);
  saveNotifications(next);
  return notification;
}

export function markNotificationRead(id: string): void {
  const next = getStoredNotifications().map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n));
  saveNotifications(next);
}

export function clearStoredNotifications(): void {
  window.localStorage.removeItem(NOTIFICATIONS_KEY);
}
