import { useEffect } from 'react'

/**
 * Press is light.
 *
 * Every pressable surface warms from the exact point of contact. Rather than
 * give each component its own pointer handler, one delegated listener at the
 * document sets `--px` / `--py` on whatever `.ph-pressable` was hit and flags
 * it with `data-touch`. The bloom itself is pure CSS (see atoms.css).
 *
 * Call this once, at the app root. Calling it more than once is harmless but
 * pointless — the listeners are identical.
 */
export function usePressLight(): void {
  useEffect(() => {
    const clear = () => {
      document.querySelectorAll<HTMLElement>('.ph-pressable[data-touch="true"]').forEach((el) => {
        el.dataset.touch = 'false'
      })
    }

    const down = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      const el = target?.closest<HTMLElement>('.ph-pressable')
      if (!el) return
      const r = el.getBoundingClientRect()
      // Guard against a zero-size box: a division by zero here would write
      // `NaN%` into the custom property and silently kill the gradient.
      if (r.width === 0 || r.height === 0) return
      el.style.setProperty('--px', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
      el.style.setProperty('--py', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`)
      el.dataset.touch = 'true'
    }

    // Capture phase, so a component that stops propagation still lights up.
    document.addEventListener('pointerdown', down, true)
    document.addEventListener('pointerup', clear, true)
    document.addEventListener('pointercancel', clear, true)
    window.addEventListener('blur', clear)

    return () => {
      document.removeEventListener('pointerdown', down, true)
      document.removeEventListener('pointerup', clear, true)
      document.removeEventListener('pointercancel', clear, true)
      window.removeEventListener('blur', clear)
    }
  }, [])
}
