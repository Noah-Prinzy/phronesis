/**
 * Which orb renderer is in play.
 *
 * The shipped avatar is a pre-rendered video loop, which looks exactly like
 * the reference because it *is* the reference. Its ceiling is that a recording
 * cannot change what it is doing — states can only alter how it plays. The
 * Three.js orb is generative, so a state can genuinely reshape it, but it has
 * to earn its place against a polished render before it becomes the default.
 *
 * Flip it live rather than at build time, because the only way to judge this
 * is to look at both within a few seconds of each other:
 *
 *     /home?orb=3d       switch to the generative orb, and remember it
 *     /home?orb=video    switch back
 *
 * The choice sticks in localStorage, so it survives navigation and reloads.
 */

export type OrbMode = 'video' | 'three'

const KEY = 'phronesis:orb'

function read(): OrbMode {
  if (typeof window === 'undefined') return 'video'

  // A query param is an explicit instruction, so it wins and is remembered.
  const asked = new URLSearchParams(window.location.search).get('orb')
  if (asked === '3d' || asked === 'three') {
    save('three')
    return 'three'
  }
  if (asked === 'video') {
    save('video')
    return 'video'
  }

  try {
    return localStorage.getItem(KEY) === 'three' ? 'three' : 'video'
  } catch {
    // Private mode, or storage disabled. The shipped renderer is the default.
    return 'video'
  }
}

function save(mode: OrbMode): void {
  try {
    localStorage.setItem(KEY, mode)
  } catch {
    /* the session still works, the choice just will not outlive a reload */
  }
}

/** Read once per load: switching renderer mid-session is not worth the churn. */
const MODE: OrbMode = read()

export function orbMode(): OrbMode {
  return MODE
}
