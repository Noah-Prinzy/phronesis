/**
 * Telling someone their car needs attention.
 *
 * **What this is, and what it deliberately is not.** These are real system
 * notifications, delivered by the browser, and they work with no keys, no
 * service account and no infrastructure. What they cannot do is reach someone
 * whose browser is CLOSED — that needs Web Push, which means FCM, a VAPID key
 * and a server holding a service account. Rather than half-build that, this
 * delivers what can actually be delivered today and says so in the UI, so the
 * switch never claims more than it does.
 *
 * **Permission is asked at the moment it is turned on**, never on page load.
 * Browsers penalise sites that ask cold — Chrome and Firefox both suppress the
 * prompt entirely for a while — and a user who has just flipped "tell me when
 * something needs attention" understands exactly what is being asked and why.
 */

export type AlertPermission = 'unsupported' | 'default' | 'granted' | 'denied'

export function alertPermission(): AlertPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as AlertPermission
}

export async function requestAlertPermission(): Promise<AlertPermission> {
  if (alertPermission() === 'unsupported') return 'unsupported'
  try {
    return (await Notification.requestPermission()) as AlertPermission
  } catch {
    // Safari once threw here rather than returning; a refusal is a refusal.
    return alertPermission()
  }
}

/**
 * Never say the same thing twice.
 *
 * A fault does not stop being a fault, so the naive version re-notifies on
 * every diagnosis, every reload, forever — which is how someone turns alerts
 * off and never turns them back on. Each distinct thing is remembered by key
 * and stays quiet for `QUIET_HOURS` afterwards.
 */
const SENT_KEY = 'phronesis:alerts-sent'
const QUIET_HOURS = 20

function sentLog(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SENT_KEY) ?? '{}') as Record<string, number>
  } catch {
    return {}
  }
}

function remember(key: string): void {
  try {
    const log = sentLog()
    log[key] = Date.now()
    // Drop anything long expired, so this cannot grow without bound on a
    // device someone uses for years.
    const cutoff = Date.now() - QUIET_HOURS * 3600_000 * 4
    for (const [k, at] of Object.entries(log)) if (at < cutoff) delete log[k]
    localStorage.setItem(SENT_KEY, JSON.stringify(log))
  } catch {
    // Not being able to remember means it may repeat. Survivable.
  }
}

function saidRecently(key: string): boolean {
  const at = sentLog()[key]
  return typeof at === 'number' && Date.now() - at < QUIET_HOURS * 3600_000
}

export interface AlertInput {
  /** Stable per distinct thing, so the same fault is not announced twice. */
  key: string
  title: string
  body: string
  /** Where to go when it is clicked. */
  href?: string
}

/** Returns true when something was actually shown. */
export function sendAlert({ key, title, body, href }: AlertInput): boolean {
  if (alertPermission() !== 'granted') return false
  if (saidRecently(key)) return false

  try {
    const n = new Notification(title, {
      body,
      // `tag` makes a repeat REPLACE rather than stack, which matters on a
      // phone where three of the same notification is what uninstalls an app.
      tag: key,
      icon: '/favicon.svg',
      silent: false,
    })
    if (href) {
      n.addEventListener('click', () => {
        window.focus()
        window.location.assign(href)
        n.close()
      })
    }
    remember(key)
    return true
  } catch {
    return false
  }
}

/* ----------------------------------------------------------- the triggers */

/** How far past the last service before she mentions it. */
export const SERVICE_INTERVAL_KM = 5000

export interface ServiceCheck {
  due: boolean
  /** How far over, when it is due. */
  overdueKm: number
  /** Absent when we simply do not know enough to say. */
  reason?: 'no-mileage' | 'no-last-service' | 'not-yet'
}

/**
 * Mileage, not a calendar — which is the promise the setting makes, and the
 * reason this needs BOTH numbers. Without the last-service reading there is
 * no interval to measure, and guessing one would be worse than staying quiet:
 * a reminder for a service someone had last week is how a person learns to
 * ignore every reminder after it.
 */
export function serviceDue(mileage?: number, lastServiceKm?: number): ServiceCheck {
  if (!mileage) return { due: false, overdueKm: 0, reason: 'no-mileage' }
  if (lastServiceKm === undefined || lastServiceKm === null) {
    return { due: false, overdueKm: 0, reason: 'no-last-service' }
  }
  const since = mileage - lastServiceKm
  if (since < SERVICE_INTERVAL_KM) return { due: false, overdueKm: 0, reason: 'not-yet' }
  return { due: true, overdueKm: since - SERVICE_INTERVAL_KM }
}
