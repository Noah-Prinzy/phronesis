import { useState } from 'react'
import {
  AppBar,
  Bubble,
  Button,
  Card,
  CardButton,
  Checkbox,
  Chip,
  Divider,
  EmptyState,
  Group,
  IconButton,
  Meter,
  PasswordInput,
  Radio,
  NavMenu,
  Row,
  SearchField,
  SectionHead,
  Segmented,
  Select,
  SeverityBadge,
  Sheet,
  Skeleton,
  Slider,
  Spec,
  SpecList,
  Spinner,
  SplitBar,
  StarRating,
  Steps,
  Switch,
  TabBar,
  Tabs,
  TextArea,
  TextInput,
  Toast,
} from '../ui'
import type { NavItem, Severity } from '../ui'
import { IconAccount, IconCompare, IconDiagnose, IconFix, IconHome, IconMap, IconSearch } from '../icons'
import { Halo } from '../avatar/Halo'
import type { HaloState } from '../avatar/Halo'
import { Principles } from './Principles'
import '../styles/gallery.css'

/* The two journeys differ by exactly two nav slots. Defining both here keeps
   that claim honest and testable — see design/04-precar.md. */
type NavKey = 'home' | 'two' | 'three' | 'map' | 'account'

const POST_CAR: Array<NavItem<NavKey>> = [
  { value: 'home', label: 'Home', icon: <IconHome /> },
  { value: 'two', label: 'Diagnose', icon: <IconDiagnose /> },
  { value: 'three', label: 'Fix', icon: <IconFix /> },
  { value: 'map', label: 'Map', icon: <IconMap /> },
  { value: 'account', label: 'Account', icon: <IconAccount /> },
]

const PRE_CAR: Array<NavItem<NavKey>> = [
  { value: 'home', label: 'Home', icon: <IconHome /> },
  { value: 'two', label: 'Discover', icon: <IconSearch /> },
  { value: 'three', label: 'Compare', icon: <IconCompare /> },
  { value: 'map', label: 'Map', icon: <IconMap /> },
  { value: 'account', label: 'Account', icon: <IconAccount /> },
]

const SEVERITIES: Severity[] = ['critical', 'high', 'warning', 'routine', 'clear']
const ORB_STATES: HaloState[] = ['idle', 'listening', 'thinking', 'responding']

function Bench({
  id,
  n,
  title,
  note,
  children,
}: {
  id: string
  n: string
  title: string
  note?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="bench">
      <div className="bench__head">
        <span className="bench__n">{n}</span>
        <h2>{title}</h2>
        {note && <p>{note}</p>}
      </div>
      <div className="bench__body">{children}</div>
    </section>
  )
}

function Case({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="case">
      <span className="case__label">{label}</span>
      <div className="case__stage">{children}</div>
    </div>
  )
}

export function StyleGuide() {
  const [journey, setJourney] = useState<'post' | 'pre'>('post')
  const [nav, setNav] = useState<NavKey>('two')
  const [tab, setTab] = useState<'compare' | 'market'>('compare')
  const [budget, setBudget] = useState(62)
  const [alerts, setAlerts] = useState(true)
  const [tips, setTips] = useState(false)
  const [stars, setStars] = useState(4)
  const [step, setStep] = useState(2)
  const [loading, setLoading] = useState(false)

  const items = journey === 'post' ? POST_CAR : PRE_CAR

  return (
    <div className="guide">
      <header className="topbar">
        <div className="topbar__in">
          <span className="wordmark">
            PHR<span>O</span>NESIS
          </span>
          <nav className="jump">
            <a href="#principles">Principles</a>
            <a href="#buttons">Buttons</a>
            <a href="#inputs">Inputs</a>
            <a href="#choice">Choice</a>
            <a href="#display">Display</a>
            <a href="#nav">Nav</a>
            <a href="#status">Status</a>
            <a href="#avatar">Avatar</a>
          </nav>
        </div>
      </header>

      <main id="main" className="wrap">
        <div className="hero">
          <h1>The atoms.</h1>
          <p>
            Every control in Phronesis, in every state it can reach, as running code rather than a
            picture of code. Press anything — it steps one surface brighter and sinks a pixel,
            which is the whole of the feedback language.
          </p>
          <p className="hero__meta">
            Tokens come from <code>design/02-tokens.md</code> and exist once, in{' '}
            <code>src/styles/tokens.css</code>. No component below hard-codes a colour.
          </p>
        </div>

        <Principles />

        {/* ------------------------------------------------------- buttons */}
        <Bench
          id="buttons"
          n="01"
          title="Button"
          note="Four variants, three sizes, and every state. V1 had six primary buttons that were all slightly different; there is exactly one here."
        >
          <Case label="variant">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Delete everything</Button>
          </Case>
          <Case label="size">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Case>
          <Case label="state">
            <Button disabled>Disabled</Button>
            <Button loading={loading} onClick={() => { setLoading(true); window.setTimeout(() => setLoading(false), 1600) }}>
              Click to load
            </Button>
            <Button variant="secondary" iconLeft={<IconSearch />}>
              With icon
            </Button>
          </Case>
          <Case label="wide">
            <Button wide size="lg">
              What will this cost to fix?
            </Button>
          </Case>
          <Case label="icon button">
            <IconButton label="Search">
              <IconSearch />
            </IconButton>
            <IconButton label="Search" variant="filled">
              <IconSearch />
            </IconButton>
            <IconButton label="Search" size="lg">
              <IconSearch />
            </IconButton>
            <IconButton label="Search" disabled>
              <IconSearch />
            </IconButton>
          </Case>
        </Bench>

        {/* -------------------------------------------------------- inputs */}
        <Bench
          id="inputs"
          n="02"
          title="Input"
          note="Label, hint and error are props on the field, not siblings a page has to remember to add. That is why V2 cannot ship an unlabelled input."
        >
          <Case label="text">
            <TextInput label="Email" placeholder="you@example.com" hint="We only use this to sign you in." />
          </Case>
          <Case label="error">
            <TextInput label="Email" defaultValue="not-an-email" error="That does not look like an email address." />
          </Case>
          <Case label="password">
            <PasswordInput label="Password" placeholder="At least 8 characters" required />
          </Case>
          <Case label="select">
            <Select
              label="Sort by"
              defaultValue="match"
              options={[
                { value: 'match', label: 'Best match' },
                { value: 'distance', label: 'Nearest' },
                { value: 'price', label: 'Cheapest' },
                { value: 'rating', label: 'Highest rated' },
              ]}
            />
          </Case>
          <Case label="textarea">
            <TextArea label="What happened?" placeholder="Describe the noise, when it started…" />
          </Case>
          <Case label="search">
            <SearchField label="Search vehicles" placeholder="Make, model, or ask me" />
          </Case>
          <Case label="disabled">
            <TextInput label="Registration" defaultValue="UAX 123B" disabled />
          </Case>
          <Case label="slider">
            <Slider
              label="Budget"
              valueLabel={`up to UGX ${(budget / 100 * 35).toFixed(1)}M`}
              value={budget}
              onChange={(e) => setBudget(Number(e.currentTarget.value))}
            />
          </Case>
        </Bench>

        {/* -------------------------------------------------------- choice */}
        <Bench
          id="choice"
          n="03"
          title="Choice"
          note="Where continuity carries meaning the indicator moves: the thumb slides, the tick draws itself, the knob overshoots the way a real one would."
        >
          <Case label="switch">
            <Switch checked={alerts} onChange={setAlerts} label="Maintenance alerts" />
            <Switch checked={tips} onChange={setTips} label="Tips" />
            <Switch checked disabled label="Critical faults, always on" />
          </Case>
          <Case label="checkbox">
            <Checkbox label="Compare this vehicle" defaultChecked />
            <Checkbox label="Open now only" />
            <Checkbox label="Unavailable" disabled />
          </Case>
          <Case label="radio">
            <Radio name="demo-radio" label="I own a car" defaultChecked />
            <Radio name="demo-radio" label="Not yet" />
          </Case>
          <Case label="segmented">
            <Segmented
              label="Journey"
              value={journey}
              onChange={setJourney}
              options={[
                { value: 'post', label: 'I own a car' },
                { value: 'pre', label: 'Looking to buy' },
              ]}
            />
          </Case>
          <Case label="tabs">
            <Tabs
              label="Compare view"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'compare', label: 'Compare' },
                { value: 'market', label: 'Market' },
              ]}
            />
          </Case>
          <Case label="chips">
            <Chip pressed>Brakes</Chip>
            <Chip pressed={false}>Open now</Chip>
            <Chip>Under 5 km</Chip>
            <Chip disabled>Unavailable</Chip>
          </Case>
        </Bench>

        {/* ------------------------------------------------------- display */}
        <Bench
          id="display"
          n="04"
          title="Display"
          note="Severity is the only hue in the product. There is no green — “nothing wrong” is the app's default state and reads as muted, not as a colour."
        >
          <Case label="severity">
            {SEVERITIES.map((s) => (
              <SeverityBadge key={s} level={s} />
            ))}
          </Case>
          <Case label="stars">
            <StarRating value={4.8} />
            <StarRating value={stars} onChange={setStars} label="Rate this mechanic" />
          </Case>
          <Case label="card">
            <Card style={{ width: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>Front brake pads</span>
                <SeverityBadge level="high" />
              </div>
              <Meter value={0.92} label="Confidence" />
              <div className="rowline">
                <span>confidence</span>
                <span>92%</span>
              </div>
            </Card>
            <CardButton selected style={{ width: 240 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>Toyota Premio 2014</span>
                <span className="mono">18.5M</span>
              </div>
              <span className="dim" style={{ fontSize: '0.7rem' }}>
                Selected — a card that is itself the control.
              </span>
            </CardButton>
          </Case>
          <Case label="rows">
            <Group style={{ width: 300 }}>
              <Row label="Name" value="Noah" onClick={() => {}} />
              <Row label="OBD reader" sub="ELM327 v1.5 · paired" trailing={<span className="dot-accent" />} />
              <Row label="Maintenance due" trailing={<Switch checked={alerts} onChange={setAlerts} label="Maintenance due" />} />
            </Group>
          </Case>
          <Case label="spec">
            <SpecList className="specbox">
              <Spec label="Engine" value="1.8L 2ZR-FE" />
              <Spec label="Transmission" value="CVT" />
              <Spec label="Fuel consumption" value="14.2 km/L" />
              <Spec label="Country" value="Japan" />
            </SpecList>
          </Case>
          <Case label="bubbles">
            <div className="thread">
              <Bubble from="user">There's a rattling sound when I brake</Bubble>
              <Bubble from="assistant">
                A rattle only under braking usually means the pads are worn to the wear indicator.
              </Bubble>
              <Bubble from="assistant" streaming>
                Let me pull the live data
              </Bubble>
            </div>
          </Case>
          <Case label="section head">
            <div style={{ width: 260 }}>
              <SectionHead>Must fix</SectionHead>
            </div>
          </Case>
          <Case label="divider">
            <div style={{ width: 260 }}>
              <Divider>or</Divider>
            </div>
          </Case>
          <Case label="sheet">
            <Sheet style={{ width: 280 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <span style={{ flex: 1, fontWeight: 500, fontSize: '0.85rem' }}>ABC Auto Repair</span>
                <span className="mono dim" style={{ fontSize: '0.7rem' }}>2.4 km</span>
              </div>
              <StarRating value={4.8} />
            </Sheet>
          </Case>
        </Bench>

        {/* ----------------------------------------------------------- nav */}
        <Bench
          id="nav"
          n="05"
          title="Navigation"
          note="A rail at 900px and up, a tab bar below it — the same items, in the same order, so the two can never disagree about where you are. Flip the Journey control above to swap slots 2 and 3."
        >
          <Case label="rail — 900px and up">
            <div className="navdemo navdemo--rail">
              <NavMenu items={items} value={nav} onChange={setNav} />
            </div>
          </Case>
          <Case label="tab bar — below 900px">
            <div className="navdemo navdemo--tabbar">
              <TabBar items={items} value={nav} onChange={setNav} />
            </div>
          </Case>
          <Case label="app bar">
            <div className="navdemo navdemo--bar">
              <AppBar
                title="DIAGNOSIS"
                leading={
                  <IconButton label="Back">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M15 18l-6-6 6-6" />
                    </svg>
                  </IconButton>
                }
              />
            </div>
          </Case>
        </Bench>

        {/* -------------------------------------------------------- status */}
        <Bench
          id="status"
          n="06"
          title="Status"
          note="Progress, absence and interruption. The toast stripe is the only place these carry colour, and only for a real fault."
        >
          <Case label="steps">
            <div style={{ width: 240 }}>
              <Steps total={3} current={step} />
            </div>
            <Button size="sm" variant="ghost" onClick={() => setStep((s) => (s % 3) + 1)}>
              Advance
            </Button>
          </Case>
          <Case label="meter">
            <div style={{ width: 200, display: 'grid', gap: '0.5rem' }}>
              <Meter value={0.92} label="Confidence" />
              <Meter value={0.62} tone="accent" label="Loading" />
            </div>
          </Case>
          <Case label="split">
            <div style={{ width: 200 }}>
              <SplitBar segments={[{ value: 120 }, { value: 60, tone: 'dim' }]} />
              <div className="rowline">
                <span>parts 120k</span>
                <span>labour 60k</span>
              </div>
            </div>
          </Case>
          <Case label="spinner">
            <Spinner />
            <Spinner size={20} />
          </Case>
          <Case label="skeleton">
            <div style={{ width: 220, display: 'grid', gap: '0.4rem' }}>
              <Skeleton height={14} width="60%" />
              <Skeleton height={10} />
              <Skeleton height={10} width="80%" />
            </div>
          </Case>
          <Case label="empty">
            <Card style={{ width: 280, padding: 0 }}>
              <EmptyState
                title="Nothing wrong"
                body="No faults found. Everything I can read is inside its normal range."
                icon={<SeverityBadge level="clear" />}
              />
            </Card>
          </Case>
          <Case label="toast">
            <div style={{ display: 'grid', gap: '0.5rem', width: 300 }}>
              <Toast level="critical" title="Coolant temperature critical" body="Pull over when it is safe to do so." />
              <Toast level="accent" title="Premio dropped to 16.8M" body="Below your 17M alert." />
              <Toast title="Scan complete" body="Two findings." />
            </div>
          </Case>
        </Bench>

        {/* ---------------------------------------------------------- avatar */}
        <Bench
          id="avatar"
          n="07"
          title="Avatar"
          note="Phronesis' four states, side by side. They are separated on several axes — sweep speed, band width, how far the plates float off the shell, brightness and bloom — because brightness alone left listening and responding indistinguishable, which is the one distinction a voice interface cannot afford to blur."
        >
          <Case label="states">
            <div className="orbrow">
              {ORB_STATES.map((st) => (
                <div key={st} className="orbrow__cell">
                  <Halo size={128} state={st} />
                  <span className="orbrow__label">{st}</span>
                </div>
              ))}
            </div>
          </Case>
        </Bench>

        <footer className="foot">
          <span>Phronesis · frontend_V2 · atoms</span>
          <span>Not wired to a backend. That is step four.</span>
        </footer>
      </main>
    </div>
  )
}
