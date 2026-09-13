import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectTransport } from './transport'

/**
 * Which Bluetooth path this device actually has.
 *
 * This function got it wrong once in a way worth locking down. It tested
 * `'bluetooth' in navigator`, which is the usual idiom and is true on iOS
 * Safari — where the property exists and is unusable. The app then offered to
 * pair with a reader it could never reach, and the failure surfaced as a
 * silent nothing after a user tapped a button in a car park.
 *
 * The permission prompts are the user's to trigger, so the globals are
 * stubbed rather than exercised: this asks what the code decides, never what
 * the radio does.
 */

const g = globalThis as Record<string, unknown>

afterEach(() => {
  vi.unstubAllGlobals()
  delete g.Capacitor
})

describe('detectTransport', () => {
  it('picks native BLE inside Capacitor', () => {
    // The WebView has no Web Bluetooth — it is a Chrome feature, not a
    // WebView one — so the native plugin is the only path that exists here.
    g.Capacitor = { isNativePlatform: () => true }
    vi.stubGlobal('navigator', { bluetooth: { requestDevice: () => {} } })

    expect(detectTransport()).toBe('native-ble')
  })

  it('prefers native BLE even where Web Bluetooth also looks available', () => {
    g.Capacitor = { isNativePlatform: () => true }
    vi.stubGlobal('navigator', { bluetooth: { requestDevice: () => {} } })

    expect(detectTransport()).toBe('native-ble')
  })

  it('picks Web Bluetooth in Chrome', () => {
    g.Capacitor = { isNativePlatform: () => false }
    vi.stubGlobal('navigator', { bluetooth: { requestDevice: () => {} } })

    expect(detectTransport()).toBe('web-bluetooth')
  })

  it('reports none on iOS Safari, where the property exists but is unusable', () => {
    // THE REGRESSION. `'bluetooth' in navigator` is true here; the object has
    // no requestDevice, so nothing can ever be paired.
    vi.stubGlobal('navigator', { bluetooth: {} })

    expect(detectTransport()).toBe('none')
  })

  it('reports none when requestDevice is present but not callable', () => {
    vi.stubGlobal('navigator', { bluetooth: { requestDevice: 'nope' } })

    expect(detectTransport()).toBe('none')
  })

  it('reports none in a browser with no Bluetooth at all', () => {
    vi.stubGlobal('navigator', {})

    expect(detectTransport()).toBe('none')
  })

  it('does not throw when Capacitor is half-present', () => {
    // A partially initialised shim should degrade, not crash the page.
    g.Capacitor = {}
    vi.stubGlobal('navigator', { bluetooth: { requestDevice: () => {} } })

    expect(detectTransport()).toBe('web-bluetooth')
  })
})
