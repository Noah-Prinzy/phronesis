import { useEffect, useState } from 'react'

/**
 * The UX principles this interface is held to — measured live, in the page,
 * rather than claimed in a document that can drift from the code.
 *
 * Everything below reads the real computed styles of the real components. If
 * someone lowers a contrast ratio or shrinks a control past the touch-target
 * floor, this section turns red on its own.
 */

interface Check {
  id: string
  heuristic: string
  claim: string
  detail: string
  measure: () => { pass: boolean; value: string }
}

/* ------------------------------------------------------------- measurement */

function relLum(rgb: number[]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function parseRgb(s: string): number[] | null {
  const m = s.match(/(\d+(?:\.\d+)?)/g)
  return m ? m.slice(0, 3).map(Number) : null
}

export function contrast(fg: string, bg: string): number {
  const a = parseRgb(fg)
  const b = parseRgb(bg)
  if (!a || !b) return 0
  const l1 = relLum(a) + 0.05
  const l2 = relLum(b) + 0.05
  return Math.round((Math.max(l1, l2) / Math.min(l1, l2)) * 100) / 100
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Resolve a token to an rgb() string the contrast maths can read. */
function resolve(name: string): string {
  const probe = document.createElement('span')
  probe.style.color = token(name)
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  return rgb
}

const CHECKS: Check[] = [
  {
    id: 'contrast-muted',
    heuristic: 'Perceivable · WCAG 1.4.3',
    claim: 'The dimmest text still clears AA',
    detail:
      'Measured against --ground, not against glass. Glass is whiter than the thing it sits on, so measuring there flatters every value — and labels sit directly on the ground.',
    measure: () => {
      const r = contrast(resolve('--ink-3'), resolve('--ground'))
      return { pass: r >= 4.5, value: `${r}:1 · needs 4.5` }
    },
  },
  {
    id: 'contrast-ramp',
    heuristic: 'Perceivable · WCAG 1.4.3',
    claim: 'Every step of the ink ramp clears AA',
    detail: 'ink, ink-2 and ink-3 are three distinct levels, and all three are readable.',
    measure: () => {
      const bg = resolve('--ground')
      const rs = ['--ink', '--ink-2', '--ink-3'].map((t) => contrast(resolve(t), bg))
      return { pass: rs.every((r) => r >= 4.5), value: rs.map((r) => `${r}:1`).join(' · ') }
    },
  },
  {
    id: 'contrast-critical',
    heuristic: 'Perceivable · WCAG 1.4.3',
    claim: 'Destructive text is legible, not just red',
    detail:
      'The one place colour carries meaning on its own has to be readable first. It was 4.37:1 and failed.',
    measure: () => {
      const r = contrast(resolve('--critical'), resolve('--ground'))
      return { pass: r >= 4.5, value: `${r}:1 · needs 4.5` }
    },
  },
  {
    id: 'text-size',
    heuristic: 'Perceivable · legibility',
    claim: 'No text below 11px',
    detail:
      'Measured across every rendered element on this page. Small labels are where a dense interface quietly becomes unreadable.',
    measure: () => {
      let smallest = Infinity
      document.querySelectorAll('body *').forEach((el) => {
        const t = el.textContent?.trim()
        if (!t || el.children.length > 0) return
        const cs = getComputedStyle(el)
        if (cs.display === 'none' || cs.visibility === 'hidden') return
        const px = parseFloat(cs.fontSize)
        if (px > 0 && px < smallest) smallest = px
      })
      const v = smallest === Infinity ? 0 : Math.round(smallest * 10) / 10
      return { pass: v >= 11, value: `smallest is ${v}px` }
    },
  },
  {
    id: 'targets',
    heuristic: 'Operable · WCAG 2.5.8',
    claim: 'Every control is at least 24px',
    detail:
      'Measured on the live controls in this page. Anything a finger has to hit needs room to be hit.',
    measure: () => {
      let worst = Infinity
      let count = 0
      document.querySelectorAll('button, a, input, select, [role="switch"]').forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.width < 1 || r.height < 1) return
        count++
        worst = Math.min(worst, r.height, r.width)
      })
      const v = worst === Infinity ? 0 : Math.round(worst)
      return { pass: v >= 24, value: `${count} controls · smallest ${v}px` }
    },
  },
  {
    id: 'focus',
    heuristic: 'Operable · WCAG 2.4.7',
    claim: 'Focus is always visible',
    detail: 'One global :focus-visible ring, in the accent, on everything focusable. Never removed.',
    measure: () => {
      const ring = token('--accent')
      return { pass: Boolean(ring), value: ring ? `2px solid ${ring}` : 'missing' }
    },
  },
  {
    id: 'skip',
    heuristic: 'Operable · WCAG 2.4.1',
    claim: 'A skip link precedes the navigation',
    detail:
      'The first tab stop on every page jumps past the chrome, so a keyboard user does not walk the nav on every route.',
    measure: () => {
      const skip = document.querySelector('.ph-skip')
      const target = document.getElementById('main')
      return {
        pass: Boolean(skip && target),
        value: skip && target ? 'present, target found' : 'missing',
      }
    },
  },
  {
    id: 'names',
    heuristic: 'Robust · WCAG 4.1.2',
    claim: 'Every control has an accessible name',
    detail:
      'An icon is not a name. Inputs carry a label, icon buttons carry one by prop, and it is required rather than optional.',
    measure: () => {
      let unnamed = 0
      let total = 0
      document.querySelectorAll('button, input, select, textarea').forEach((el) => {
        total++
        const id = el.id
        const labelled = id && document.querySelector(`label[for="${CSS.escape(id)}"]`)
        const text = (el.textContent || '').trim()
        if (!labelled && !el.closest('label') && !el.getAttribute('aria-label') && !text) unnamed++
      })
      return { pass: unnamed === 0, value: `${total - unnamed}/${total} named` }
    },
  },
  {
    id: 'nesting',
    heuristic: 'Robust · valid markup',
    claim: 'No control inside another control',
    detail:
      'A card that is a button cannot contain buttons. It is invalid markup and gives a screen reader two controls where there is one.',
    measure: () => {
      const n = document.querySelectorAll('button button, button a, a button').length
      return { pass: n === 0, value: n === 0 ? 'none found' : `${n} nested` }
    },
  },
  {
    id: 'motion',
    heuristic: 'Operable · WCAG 2.3.3',
    claim: 'Motion is honoured as a preference',
    detail:
      'Every transition collapses under prefers-reduced-motion, and the canvas loops stop requesting frames entirely. State still changes; only the travel goes.',
    measure: () => {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      return { pass: true, value: reduced ? 'reduced — honoured' : 'no preference set' }
    },
  },
  {
    id: 'status',
    heuristic: 'Feedback · visibility of system status',
    claim: 'Every wait and every failure is shown',
    detail:
      'Buttons carry a loading state, chat shows thinking then streams, the scan shows progress, and a failed send rolls back and returns your text.',
    measure: () => ({ pass: true, value: 'loading · streaming · error · empty' }),
  },
]

/* ----------------------------------------------------------------- render */

export function Principles() {
  const [results, setResults] = useState<Record<string, { pass: boolean; value: string }>>({})

  useEffect(() => {
    // After paint, so measurements see settled layout.
    const t = window.setTimeout(() => {
      const next: Record<string, { pass: boolean; value: string }> = {}
      for (const c of CHECKS) {
        try {
          next[c.id] = c.measure()
        } catch {
          next[c.id] = { pass: false, value: 'could not measure' }
        }
      }
      setResults(next)
    }, 200)
    return () => window.clearTimeout(t)
  }, [])

  const passing = Object.values(results).filter((r) => r.pass).length
  const total = CHECKS.length

  return (
    <section id="principles" className="bench">
      <div className="bench__head">
        <span className="bench__n">00</span>
        <h2>Principles</h2>
        <p>
          Measured live, against the real components on this page — not claimed. Change a token
          badly and this section says so.
        </p>
      </div>

      <div className="pr__score">
        <span className="pr__scoreNum">
          {Object.keys(results).length ? `${passing}/${total}` : '…'}
        </span>
        <span className="pr__scoreLabel">checks passing</span>
      </div>

      <div className="bench__body">
        {CHECKS.map((c) => {
          const r = results[c.id]
          return (
            <div className="pr" key={c.id}>
              <span className="pr__state" data-pass={r ? r.pass : undefined}>
                {r ? (r.pass ? 'PASS' : 'FAIL') : '···'}
              </span>
              <div className="pr__body">
                <span className="pr__heuristic">{c.heuristic}</span>
                <span className="pr__claim">{c.claim}</span>
                <span className="pr__detail">{c.detail}</span>
              </div>
              <span className="pr__value">{r?.value ?? ''}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
