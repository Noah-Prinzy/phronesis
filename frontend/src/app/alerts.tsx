import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  alertPermission,
  requestAlertPermission,
  sendAlert,
  serviceDue,
  SERVICE_INTERVAL_KM,
  type AlertPermission,
} from '../lib/alerts'
import { loadPreferences, storePreferences } from '../lib/userdata'
import type { Preferences } from '../lib/api'
import { useAuth } from './auth'
import { useCar } from './car'

/**
 * The alerts, in one place: the preference, the browser permission, and the
 * checks that actually fire something.
 *
 * The two halves are deliberately separate. The PREFERENCE is per account and
 * lives in Firestore — someone who turns off service reminders means it
 * everywhere. The PERMISSION is per browser and belongs to the browser; it
 * cannot be set by us and can be revoked without telling us. Conflating them
 * is how a settings screen ends up showing a switch that is on while nothing
 * arrives, which is worse than showing it off.
 */
interface AlertsValue {
  prefs: Preferences | null
  permission: AlertPermission
  /** Turns a preference on or off, asking the browser first if it needs to. */
  setPreference: (patch: Partial<Preferences>) => Promise<void>
  /** True when the switch is on AND the browser will actually deliver. */
  live: (which: keyof Preferences) => boolean
}

const Ctx = createContext<AlertsValue | null>(null)

export function AlertsProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth()
  const { car } = useCar()
  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [permission, setPermission] = useState<AlertPermission>(() => alertPermission())

  useEffect(() => {
    if (status !== 'signedIn' || !user) {
      setPrefs(null)
      return
    }
    let alive = true
    void loadPreferences(user.uid)
      .then((p) => {
        if (alive) setPrefs(p)
      })
      .catch(() => {
        // Unknown preferences are left null so the switches stay disabled
        // rather than showing a state we did not read.
      })
    return () => {
      alive = false
    }
  }, [status, user])

  const setPreference = useCallback(
    async (patch: Partial<Preferences>) => {
      if (!user || !prefs) return

      // Ask the browser at the moment it is turned ON. Asking on load is what
      // gets a site's prompt suppressed, and asking when switching OFF makes
      // no sense at all.
      const turningOn = Object.values(patch).some(Boolean)
      if (turningOn && alertPermission() === 'default') {
        setPermission(await requestAlertPermission())
      } else {
        setPermission(alertPermission())
      }

      const before = prefs
      setPrefs({ ...prefs, ...patch })
      try {
        setPrefs(await storePreferences(user.uid, patch))
      } catch (err) {
        setPrefs(before)
        throw err
      }
    },
    [user, prefs],
  )

  const live = useCallback(
    (which: keyof Preferences) => Boolean(prefs?.[which]) && permission === 'granted',
    [prefs, permission],
  )

  /**
   * The service check, run when the app opens and whenever the car changes.
   *
   * Mileage only moves when someone edits it, so there is nothing to poll and
   * a timer would be pure waste — the moment the number changes is the moment
   * worth checking, and that is exactly when this effect re-runs.
   */
  useEffect(() => {
    if (!live('serviceReminders') || !car) return
    const check = serviceDue(car.mileage, car.lastServiceKm)
    if (!check.due) return

    const name = [car.year, car.make, car.model].filter(Boolean).join(' ')
    sendAlert({
      // Keyed by the reading, so it says this once per service interval
      // rather than once per app launch.
      key: `service:${Math.floor((car.mileage ?? 0) / SERVICE_INTERVAL_KM)}`,
      title: 'A service is due',
      body:
        check.overdueKm > 0
          ? `${name} is ${check.overdueKm.toLocaleString()} km past its next service.`
          : `${name} has reached its next service.`,
      href: '/account',
    })
  }, [car, live])

  const value = useMemo<AlertsValue>(
    () => ({ prefs, permission, setPreference, live }),
    [prefs, permission, setPreference, live],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAlerts(): AlertsValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAlerts must be used inside <AlertsProvider>')
  return v
}
