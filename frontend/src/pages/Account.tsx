import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Dialog,
  Group,
  IconButton,
  Row,
  SectionHead,
  Segmented,
  Switch,
} from '../ui'
import { useJourney } from '../app/journey'
import { useMediaQuery } from '../app/useMediaQuery'

/** Mock profile. Goes the way of the other mocks in step 4. */
const PROFILE = {
  name: 'Noah',
  email: 'noahdevsug@gmail.com',
  initials: 'N',
  car: { label: '2015 Toyota Premio', plate: 'UAX 123B', km: '86,000 km' },
  reader: { name: 'ELM327 v1.5', paired: true },
  threadSince: '4 September',
}

export function Account() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 768px)')
  const { journey, setJourney } = useJourney()

  const [maintenance, setMaintenance] = useState(true)
  const [tips, setTips] = useState(false)
  const [speak, setSpeak] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const owner = journey !== 'buyer'

  /* ------------------------------------------------------------- sections */

  const you = (
    <div>
      <SectionHead>You</SectionHead>
      <Group>
        <Row
          label="Name"
          sub="What Phronesis calls you when it speaks"
          value={PROFILE.name}
          onClick={() => {}}
        />
        <Row label="Email" value={PROFILE.email} onClick={() => {}} />
        <Row label="Phone" value="Add" onClick={() => {}} />
      </Group>
    </div>
  )

  const journeyBlock = (
    <div>
      <SectionHead>Journey</SectionHead>
      <Segmented
        label="Primary journey"
        value={owner ? 'owner' : 'buyer'}
        onChange={(v) => setJourney(v)}
        options={[
          { value: 'owner', label: 'I own a car' },
          { value: 'buyer', label: 'Looking to buy' },
        ]}
      />
      <p className="acct__note">
        This changes what fills the middle of the navigation. You keep access to
        both either way.
      </p>
    </div>
  )

  const car = owner ? (
    <div>
      <SectionHead>Your car</SectionHead>
      <Group>
        <Row
          label={PROFILE.car.label}
          sub={`${PROFILE.car.plate} · ${PROFILE.car.km}`}
          onClick={() => {}}
        />
        <Row
          label="OBD reader"
          sub={
            PROFILE.reader.paired
              ? `${PROFILE.reader.name} · paired`
              : 'Not paired — you would describe symptoms instead'
          }
          trailing={PROFILE.reader.paired ? <span className="acct__dot" /> : undefined}
          onClick={() => navigate('/pair')}
        />
      </Group>
    </div>
  ) : null

  const voice = (
    <div>
      <SectionHead>Voice</SectionHead>
      <Group>
        <Row label="Language" value="English (Uganda)" onClick={() => {}} />
        <Row
          label="Speak replies aloud"
          sub="Off saves data on mobile"
          trailing={
            <Switch checked={speak} onChange={setSpeak} label="Speak replies aloud" />
          }
        />
      </Group>
    </div>
  )

  const alerts = (
    <div>
      <SectionHead>Alerts</SectionHead>
      <Group>
        <Row
          label="Critical faults"
          sub="Always on. Safety matters more than quiet."
          trailing={
            // Deliberately not switchable. A setting that lets someone mute the
            // one alert that could keep them safe is not a preference.
            <Switch checked disabled label="Critical faults, always on" />
          }
        />
        <Row
          label="Maintenance due"
          trailing={
            <Switch checked={maintenance} onChange={setMaintenance} label="Maintenance due" />
          }
        />
        <Row
          label="Tips and suggestions"
          trailing={<Switch checked={tips} onChange={setTips} label="Tips and suggestions" />}
        />
      </Group>
    </div>
  )

  const data = (
    <div>
      <SectionHead>Your data</SectionHead>
      <Group>
        <Row
          label="Conversation"
          sub={`One thread since ${PROFILE.threadSince}`}
          onClick={() => {}}
        />
        <Row
          label={<span className="acct__danger">Delete everything</span>}
          onClick={() => setConfirmDelete(true)}
        />
      </Group>
    </div>
  )

  const header = (
    <div className="acct__profile">
      <span className="acct__avatar" aria-hidden="true">
        {PROFILE.initials}
      </span>
      <div>
        <div className="acct__name">{PROFILE.name}</div>
        <div className="acct__email">{PROFILE.email}</div>
      </div>
    </div>
  )

  const signOut = (
    <Button variant="secondary" wide onClick={() => navigate('/')}>
      Sign out
    </Button>
  )

  const deleteDialog = (
    <Dialog
      open={confirmDelete}
      onClose={() => setConfirmDelete(false)}
      title="Delete everything?"
      actions={
        <>
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Keep my account
          </Button>
          <Button variant="danger" onClick={() => setConfirmDelete(false)}>
            Delete everything
          </Button>
        </>
      }
    >
      <p>This removes your account, your car, your paired reader and every conversation.</p>
      <p className="acct__dialogFine">
        {/* OPEN QUESTION — must be answered before this ships. Reviews you have
            left for mechanics are other people's reputation as much as your
            data, and the copy cannot honestly promise either outcome until
            that is decided. See design/01-page-element-map.md. */}
        What happens to reviews you have left for mechanics is not settled yet —
        we will tell you here before anything is deleted.
      </p>
      <p className="acct__dialogFine">This cannot be undone.</p>
    </Dialog>
  )

  /* --------------------------------------------------------------- desktop */
  if (wide) {
    return (
      <main className="acct acct--wide">
        {header}
        <div className="acct__grid">
          <div className="acct__col">
            {you}
            {journeyBlock}
            {car}
          </div>
          <div className="acct__col">
            {voice}
            {alerts}
            {data}
            <div className="acct__signout">{signOut}</div>
          </div>
        </div>
        {deleteDialog}
      </main>
    )
  }

  /* ----------------------------------------------------------------- phone */
  return (
    <main className="acct">
      <header className="acct__bar">
        <IconButton label="Back" onClick={() => navigate('/home')}>
          <BackIcon />
        </IconButton>
        <span className="acct__title">ACCOUNT</span>
        <span className="acct__barSpacer" />
      </header>

      <div className="acct__scroll">
        {header}
        {you}
        {journeyBlock}
        {car}
        {voice}
        {alerts}
        {data}
        <div className="acct__signout">{signOut}</div>
      </div>

      {deleteDialog}
    </main>
  )
}

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}
