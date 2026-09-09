import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, Segmented, Switch, TextInput, Toast } from '../ui'
import { useAuth } from '../app/auth'
import { useCar } from '../app/car'
import { useJourney } from '../app/journey'
import { useVoice } from '../app/voice'
import {
  deleteAccount,
  downloadMyData,
  getPreferences,
  savePreferences,
  type CarProfile,
  type Preferences,
} from '../lib/api'

/**
 * Account: who you are, what you drive, and what Phronesis is allowed to do.
 *
 * Two rules shape this page.
 *
 * **Nothing here is decorative.** A settings screen with switches that do not
 * do anything teaches people the app is broken, so every control is wired to
 * something real — Firebase for the name, Firestore for the car and the
 * alerts, localStorage for speaking aloud.
 *
 * **A setting is saved where it is true.** Speaking aloud is per DEVICE: you
 * might want her silent on the phone in a meeting and audible in the car, so
 * it lives in localStorage. The alerts are per ACCOUNT: someone who turns off
 * service reminders means it everywhere, so those go to the server. Getting
 * that backwards is the kind of thing nobody reports as a bug — it just feels
 * wrong forever.
 */
export function Account() {
  const navigate = useNavigate()
  const { user, status, signOut, updateName, getToken } = useAuth()
  const { speak, setSpeak } = useVoice()
  const { journey, setJourney } = useJourney()
  // Shared with the navigation rail, so saving a car renames it there too
  // rather than only here.
  const { car, save: saveCarProfile } = useCar()

  const [prefs, setPrefs] = useState<Preferences | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editingCar, setEditingCar] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  /**
   * Toasts here are confirmations rather than decisions, so they clear
   * themselves. Long enough to read a sentence, short enough not to sit over
   * the controls the user is still working through.
   */
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(t)
  }, [toast])

  /** Kept so a slow response cannot overwrite a switch the user just moved. */
  const live = useRef(true)
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])

  useEffect(() => {
    if (status !== 'signedIn') return
    const ac = new AbortController()
    void (async () => {
      const token = await getToken()
      if (!token || ac.signal.aborted) return
      try {
        const p = await getPreferences(token, ac.signal)
        if (live.current) setPrefs(p)
      } catch {
        // The switches stay disabled at their defaults rather than lying
        // about a state we could not read.
      }
    })()
    return () => ac.abort()
  }, [status, getToken])

  /**
   * Move the switch immediately, then persist. A toggle that waits for a round
   * trip feels broken even when it works; if the write fails the switch goes
   * back and says so, which is the only honest way to be optimistic.
   */
  const patchPrefs = useCallback(
    async (patch: Partial<Preferences>) => {
      if (!prefs) return
      const before = prefs
      setPrefs({ ...prefs, ...patch })
      try {
        const token = await getToken()
        if (!token) throw new Error('Not signed in.')
        const saved = await savePreferences(token, patch)
        if (live.current) setPrefs(saved)
      } catch {
        if (!live.current) return
        setPrefs(before)
        setToast('That did not save. Check your connection and try again.')
      }
    },
    [prefs, getToken],
  )

  const onSignOut = useCallback(async () => {
    await signOut()
    navigate('/', { replace: true })
  }, [signOut, navigate])

  if (status !== 'signedIn') {
    return (
      <main id="main" className="page">
        <header className="page__head">
          <h1 className="page__title">Account</h1>
        </header>
        <div className="page__body acct acct--empty">
          <p className="acct__signedout">You are signed out.</p>
          <Button onClick={() => navigate('/join')}>Sign in</Button>
        </div>
      </main>
    )
  }

  const name = user?.displayName?.trim() || 'there'
  const initial = (user?.displayName?.trim()?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()

  return (
    <main id="main" className="page">
      <header className="page__head">
        <h1 className="page__title">Account</h1>
      </header>

      <div className="page__body acct">
        {/* ------------------------------------------------------------ you */}
        <section className="acct__group">
          <h2 className="label">You</h2>
          <div className="acct__card">
            <div className="acct__you">
              <span className="acct__avatar" aria-hidden="true">
                {initial}
              </span>
              <div className="acct__rowmain">
                <span className="acct__name">{name}</span>
                <span className="acct__sub">{user?.email}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditingName(true)}>
                Change name
              </Button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------- your car */}
        <section className="acct__group">
          <h2 className="label">Your car</h2>
          <div className="acct__card">
            <div className="acct__row">
              <div className="acct__rowmain">
                <span className="acct__rowtitle">
                  {car ? `${car.year} ${car.make} ${car.model}` : 'No car saved yet'}
                </span>
                <span className="acct__mono">
                  {car
                    ? [car.plate, car.mileage ? `${car.mileage.toLocaleString()} km` : null]
                        .filter(Boolean)
                        .join(' · ') || 'No plate or mileage yet'
                    : 'Phronesis guesses far better when she knows what you drive.'}
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => setEditingCar(true)}>
                {car ? 'Change' : 'Add car'}
              </Button>
            </div>
            <div className="acct__row">
              <div className="acct__rowmain">
                <span className="acct__rowtitle">OBD reader</span>
                <span className="acct__sub">
                  Read live fault codes instead of describing symptoms.
                </span>
              </div>
              <Button variant="secondary" size="sm" onClick={() => navigate('/pair')}>
                Pair
              </Button>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ phronesis */}
        <section className="acct__group">
          <h2 className="label">Phronesis</h2>
          <div className="acct__card">
            <div className="acct__row">
              <div className="acct__rowmain">
                <span className="acct__rowtitle">Speak replies aloud</span>
                <span className="acct__sub">
                  This one is for this device only. Turn it off and her words still appear
                  on screen as she writes them.
                </span>
              </div>
              <Switch checked={speak} onChange={setSpeak} label="Speak replies aloud" />
            </div>
            <div className="acct__row">
              <div className="acct__rowmain">
                <span className="acct__rowtitle">What you are here for</span>
                <span className="acct__sub">
                  Changes which two things sit in your navigation.
                </span>
              </div>
              <Segmented
                label="What you are here for"
                value={journey ?? 'owner'}
                onChange={setJourney}
                options={[
                  { value: 'owner', label: 'I own a car' },
                  { value: 'buyer', label: 'I am buying' },
                ]}
              />
            </div>
          </div>
        </section>

        {/* --------------------------------------------------------- alerts */}
        <section className="acct__group">
          <h2 className="label">Alerts</h2>
          <div className="acct__card">
            <div className="acct__row">
              <div className="acct__rowmain">
                <span className="acct__rowtitle">Tell me when something needs attention</span>
                <span className="acct__sub">
                  Only for faults marked critical or high. Never for anything cosmetic.
                </span>
              </div>
              <Switch
                checked={prefs?.faultAlerts ?? true}
                onChange={(v) => void patchPrefs({ faultAlerts: v })}
                disabled={!prefs}
                label="Tell me when something needs attention"
              />
            </div>
            <div className="acct__row">
              <div className="acct__rowmain">
                <span className="acct__rowtitle">Service reminders</span>
                <span className="acct__sub">Based on your mileage, not on a calendar.</span>
              </div>
              <Switch
                checked={prefs?.serviceReminders ?? false}
                onChange={(v) => void patchPrefs({ serviceReminders: v })}
                disabled={!prefs}
                label="Service reminders"
              />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------ your data */}
        <section className="acct__group">
          <h2 className="label">Your data</h2>
          <div className="acct__card">
            <div className="acct__row">
              <div className="acct__rowmain">
                <span className="acct__rowtitle">Download your conversations</span>
                <span className="acct__sub">
                  Everything you and Phronesis have said, plus your car and your reports,
                  as one file.
                </span>
              </div>
              <Button
                variant="secondary"
                size="sm"
                loading={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    const token = await getToken()
                    if (!token) throw new Error('Not signed in.')
                    await downloadMyData(token)
                  } catch {
                    setToast('Could not prepare your data. Try again in a moment.')
                  } finally {
                    if (live.current) setBusy(false)
                  }
                }}
              >
                Download
              </Button>
            </div>
            <div className="acct__row">
              <div className="acct__rowmain">
                <span className="acct__rowtitle">Delete your account</span>
                <span className="acct__sub">
                  Your car, your history and your conversations. This cannot be undone.
                </span>
              </div>
              <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            </div>
          </div>
        </section>

        <div className="acct__out">
          <Button variant="secondary" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>

      <NameDialog
        open={editingName}
        current={user?.displayName ?? ''}
        onClose={() => setEditingName(false)}
        onSave={async (next) => {
          await updateName(next)
          setEditingName(false)
          setToast(`She will call you ${next} from now on.`)
        }}
      />

      <CarDialog
        open={editingCar}
        current={car}
        onClose={() => setEditingCar(false)}
        onSave={async (next) => {
          await saveCarProfile(next)
          setEditingCar(false)
          setToast('Saved. She will factor that in from now on.')
        }}
      />

      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete your account?"
        actions={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Keep my account
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  const token = await getToken()
                  if (!token) throw new Error('Not signed in.')
                  await deleteAccount(token)
                  // The auth record is gone server-side; sign out locally so
                  // the app is not holding a token for a user who no longer
                  // exists.
                  await signOut().catch(() => {})
                  navigate('/', { replace: true })
                } catch {
                  if (!live.current) return
                  setBusy(false)
                  setConfirmDelete(false)
                  setToast('Could not delete the account. Nothing has been removed.')
                }
              }}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <p className="acct__dialogBody">
          This removes your car, every diagnosis and every conversation, and frees your
          email address to be used again. There is no undo and no copy kept.
        </p>
        <p className="acct__dialogBody">
          If you only want a record of it, close this and download your data first.
        </p>
      </Dialog>

      {toast ? <Toast title={toast} className="acct__toast" /> : null}
    </main>
  )
}

/* ------------------------------------------------------------------ name */

function NameDialog({
  open,
  current,
  onClose,
  onSave,
}: {
  open: boolean
  current: string
  onClose: () => void
  onSave: (name: string) => Promise<void>
}) {
  const [value, setValue] = useState(current)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reopening after a cancel should show what is saved, not the abandoned edit.
  useEffect(() => {
    if (open) {
      setValue(current)
      setError(null)
    }
  }, [open, current])

  const submit = async () => {
    const next = value.trim()
    if (!next) {
      setError('She needs something to call you.')
      return
    }
    setBusy(true)
    try {
      await onSave(next)
    } catch {
      setError('That did not save. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="What should she call you?"
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            Save
          </Button>
        </>
      }
    >
      <TextInput
        label="Your name"
        value={value}
        error={error ?? undefined}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void submit()
        }}
      />
    </Dialog>
  )
}

/* ------------------------------------------------------------------- car */

const THIS_YEAR = new Date().getFullYear()

function CarDialog({
  open,
  current,
  onClose,
  onSave,
}: {
  open: boolean
  current: CarProfile | null
  onClose: () => void
  onSave: (car: CarProfile) => Promise<void>
}) {
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [plate, setPlate] = useState('')
  const [mileage, setMileage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setMake(current?.make ?? '')
    setModel(current?.model ?? '')
    setYear(current?.year ? String(current.year) : '')
    setPlate(current?.plate ?? '')
    setMileage(current?.mileage ? String(current.mileage) : '')
    setError(null)
  }, [open, current])

  const submit = async () => {
    const y = Number(year)
    if (!make.trim() || !model.trim()) {
      setError('The make and model are the two she really needs.')
      return
    }
    // A plausible year, not merely a number: 1980 to next year covers every
    // car realistically on Ugandan roads without accepting a typo like 219.
    if (!Number.isInteger(y) || y < 1980 || y > THIS_YEAR + 1) {
      setError(`Year should be between 1980 and ${THIS_YEAR + 1}.`)
      return
    }
    setBusy(true)
    try {
      await onSave({
        make: make.trim(),
        model: model.trim(),
        year: y,
        plate: plate.trim() || undefined,
        mileage: mileage.trim() ? Number(mileage.replace(/[^\d]/g, '')) : undefined,
      })
    } catch {
      setError('That did not save. Try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={current ? 'Your car' : 'What do you drive?'}
      actions={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={busy} onClick={() => void submit()}>
            Save
          </Button>
        </>
      }
    >
      <div className="acct__form">
        <TextInput label="Make" value={make} placeholder="Toyota" autoFocus onChange={(e) => setMake(e.target.value)} />
        <TextInput label="Model" value={model} placeholder="Premio" onChange={(e) => setModel(e.target.value)} />
        <TextInput
          label="Year"
          value={year}
          inputMode="numeric"
          placeholder="2015"
          onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
        />
        <TextInput
          label="Number plate"
          hint="Optional."
          value={plate}
          placeholder="UAX 123B"
          onChange={(e) => setPlate(e.target.value.toUpperCase())}
        />
        <TextInput
          label="Mileage"
          hint="Optional. In kilometres — it is how she times service reminders."
          value={mileage}
          inputMode="numeric"
          placeholder="148320"
          onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ''))}
        />
      </div>
      {error ? <p className="acct__formError">{error}</p> : null}
    </Dialog>
  )
}
