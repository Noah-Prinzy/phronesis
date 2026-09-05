import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, IconButton, SectionHead, SeverityBadge, Spinner, Tabs } from '../ui'
import { Hologram } from '../diagnosis/HologramLazy'
import { FindingCard } from '../components/FindingCard'
import { mockScan } from '../data/findings'
import type { ScanResult, Scenario } from '../data/findings'
import { useMediaQuery } from '../app/useMediaQuery'

/**
 * Diagnosis.
 *
 * Grey until something is wrong. A clean scan carries no colour at all — not
 * green, because "nothing wrong" is the app's default state and spending a hue
 * on it would make the palette shout about the ordinary.
 */
export function Diagnosis() {
  const navigate = useNavigate()
  const wide = useMediaQuery('(min-width: 768px)')

  const [scan, setScan] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [tab, setTab] = useState<'findings' | 'live'>('findings')
  // Review scaffolding: lets both scan outcomes be seen. Goes with the mock.
  const [scenario, setScenario] = useState<Scenario>('faults')

  useEffect(() => {
    let cancelled = false
    setScanning(true)
    mockScan(scenario).then((r) => {
      if (cancelled) return
      setScan(r)
      setScanning(false)
    })
    return () => {
      cancelled = true
    }
  }, [scenario])

  function rescan() {
    setScan(null)
    setSelected(null)
    setScenario((s) => (s === 'faults' ? 'clean' : 'faults'))
  }

  const findings = scan?.findings ?? []
  const mustFix = findings.filter((f) => f.urgent)
  const canWait = findings.filter((f) => !f.urgent)
  const clean = !scanning && findings.length === 0

  const list = (
    <>
      {scanning && (
        <p className="diag__status">
          <Spinner size={12} /> Reading the engine…
        </p>
      )}

      {clean && (
        <div className="diag__clear">
          <SeverityBadge level="clear" />
          <p className="diag__clearBody">
            No faults found. Everything I can read is inside its normal range.
          </p>
          <p className="diag__stamp">last scan · {scan?.at}</p>
        </div>
      )}

      {mustFix.length > 0 && (
        <>
          <SectionHead>Must fix</SectionHead>
          {mustFix.map((f) => (
            <FindingCard
              key={f.id}
              finding={f}
              selected={selected === f.id}
              onSelect={(id) => setSelected(id === selected ? null : id)}
              showExplanation={wide}
            />
          ))}
        </>
      )}

      {canWait.length > 0 && (
        <>
          <SectionHead>Can wait</SectionHead>
          {canWait.map((f) => (
            <FindingCard
              key={f.id}
              finding={f}
              selected={selected === f.id}
              onSelect={(id) => setSelected(id === selected ? null : id)}
              showExplanation={wide}
            />
          ))}
        </>
      )}
    </>
  )

  const holo = (
    <Hologram
      findings={scanning ? [] : findings}
      selectedId={selected}
      onSelect={setSelected}
      scanning={scanning}
      vehicle="2015 TOYOTA PREMIO · UAX 123B"
    />
  )

  /* --------------------------------------------------------------- desktop */
  if (wide) {
    return (
      <main className="diag diag--wide">
        {/* The columns live inside the container, not on it: an @container
            rule cannot style its own container, so the row/column flip has to
            happen one level down. */}
        <div className="diag__cols">
          <div className="diag__stage">{holo}</div>

          <section className="diag__panel">
          <div className="diag__panelHead">
            <Tabs
              label="Diagnosis view"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'findings', label: 'Findings' },
                { value: 'live', label: 'Live data' },
              ]}
            />
            <IconButton label="Scan again" onClick={rescan} disabled={scanning}>
              <RefreshIcon />
            </IconButton>
          </div>

          <div className="diag__list">
            {tab === 'findings' ? (
              list
            ) : (
              <p className="diag__status">Live OBD readouts land here in step 4.</p>
            )}
          </div>

            {findings.length > 0 && (
              <Button size="lg" wide onClick={() => navigate('/solutions')}>
                What will this cost to fix?
              </Button>
            )}
          </section>
        </div>
      </main>
    )
  }

  /* ----------------------------------------------------------------- phone */
  return (
    <main className="diag">
      <header className="diag__bar">
        <IconButton label="Back" onClick={() => navigate('/home')}>
          <BackIcon />
        </IconButton>
        <span className="diag__title">DIAGNOSIS</span>
        <IconButton label="Scan again" onClick={rescan} disabled={scanning}>
          <RefreshIcon />
        </IconButton>
      </header>

      <div className="diag__stage diag__stage--phone">{holo}</div>

      <div className="diag__list">{list}</div>

      {findings.length > 0 && (
        <div className="diag__actions">
          <Button size="lg" wide onClick={() => navigate('/solutions')}>
            What will this cost?
          </Button>
        </div>
      )}
    </main>
  )
}

/* -------------------------------------------------------------------- icons */

function BackIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <path d="M20 11a8 8 0 1 0-.6 4" />
      <path d="M20 4v7h-7" />
    </svg>
  )
}
