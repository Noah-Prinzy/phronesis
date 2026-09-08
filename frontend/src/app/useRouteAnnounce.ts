import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TITLES: Record<string, string> = {
  '/': 'Phronesis',
  '/welcome': 'Welcome · Phronesis',
  '/start': 'Do you own a car? · Phronesis',
  '/join': 'Your account · Phronesis',
  '/pair': 'Pair an OBD reader · Phronesis',
  '/home': 'Home · Phronesis',
  '/diagnosis': 'Diagnosis · Phronesis',
  '/solutions': 'Solutions · Phronesis',
  '/maps': 'Map · Phronesis',
  '/account': 'Account · Phronesis',
  '/discover': 'Discover · Phronesis',
  '/compare': 'Compare · Phronesis',
  '/styleguide': 'Components · Phronesis',
}

/**
 * Makes route changes perceivable.
 *
 * A single-page app changes the whole screen without any of the things a
 * browser normally does on navigation: the title never changes, focus stays
 * wherever it was, and a screen reader announces nothing at all. Three small
 * corrections, all of them standard:
 *
 * 1. **Set the document title.** It is how a screen reader announces arrival,
 *    and how anyone finds the right tab.
 * 2. **Move focus to the top of the new page**, so the next Tab starts from
 *    the new content rather than from wherever the last click left it.
 * 3. **Announce the change politely**, because moving focus alone is not
 *    reliably spoken across screen readers.
 */
export function useRouteAnnounce(): void {
  const { pathname } = useLocation()

  useEffect(() => {
    const title = TITLES[pathname] ?? 'Phronesis'
    document.title = title

    // The visible page name, without the product suffix.
    const spoken = title.replace(/ · Phronesis$/, '')

    let live = document.getElementById('ph-route-announcer')
    if (!live) {
      live = document.createElement('div')
      live.id = 'ph-route-announcer'
      live.setAttribute('role', 'status')
      live.setAttribute('aria-live', 'polite')
      live.className = 'sr-only'
      document.body.appendChild(live)
    }
    // A frame's delay: setting the text in the same tick as the DOM swap is
    // frequently missed by screen readers.
    const t = window.setTimeout(() => {
      if (live) live.textContent = spoken
    }, 120)

    const main = document.querySelector<HTMLElement>('main, [role="main"]')
    if (main) {
      // -1 so it is focusable programmatically but never a tab stop itself.
      main.setAttribute('tabindex', '-1')
      main.focus({ preventScroll: true })
    }

    return () => window.clearTimeout(t)
  }, [pathname])
}
