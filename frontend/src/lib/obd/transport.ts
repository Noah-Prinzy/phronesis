/**
 * Talking to an OBD reader.
 *
 * Four platform facts shape everything in this folder, and each of them
 * removes an option rather than adding one:
 *
 * 1. **Web Bluetooth does not exist on iOS.** Apple has never implemented it
 *    and has said it will not. A browser-only build can never pair a reader on
 *    an iPhone.
 * 2. **Android's WebView does not implement it either.** It is a Chrome
 *    feature, not a WebView one — so inside the Capacitor shell
 *    `navigator.bluetooth` is undefined even on Android, where the browser
 *    would have supported it.
 * 3. **Web Bluetooth is BLE only.** It cannot see Bluetooth Classic at all.
 * 4. **Most cheap ELM327 dongles are Bluetooth Classic (SPP), not BLE.** They
 *    are invisible to every API here. See `RECOMMENDED_HARDWARE` below — this
 *    is a purchasing decision before it is a code one.
 *
 * So there are two transports and the app picks whichever the platform
 * actually has: Web Bluetooth in a real browser, and the native BLE plugin
 * inside the Capacitor shell. Both speak BLE, which is the only path that
 * works on Android *and* iOS.
 */

export type ObdTransportKind = 'web-bluetooth' | 'native-ble' | 'none'

export interface ObdDevice {
  id: string
  name: string
}

/** A connected reader: a line in, a line out. */
export interface ObdConnection {
  /** Send one command and wait for the ELM327 prompt. */
  send: (command: string) => Promise<string>
  disconnect: () => Promise<void>
  readonly deviceName: string
}

export interface ObdTransport {
  kind: ObdTransportKind
  /**
   * Opens the platform's own device chooser. **Must be called from a user
   * gesture** — Web Bluetooth rejects otherwise, and it is the right rule
   * anyway: a page that scans for nearby radios unprompted is doing something
   * the user did not ask for.
   */
  requestDevice: () => Promise<ObdDevice>
  connect: (device: ObdDevice) => Promise<ObdConnection>
}

/**
 * BLE services an ELM327 might expose. Clones are inconsistent, so all the
 * common ones are offered and whichever answers is used.
 */
export const ELM327_SERVICES = [
  // The most common clone service. Notify on fff1, write on fff2.
  0xfff0,
  // Nordic UART, used by vLinker and some OBDLink units.
  '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
  // Seen on a few BLE adapters.
  0xffe0,
] as const

/**
 * What to tell a user to buy.
 *
 * This is the practical consequence of fact 3 and 4 above, and it is worth
 * stating in the product rather than discovering in a support conversation:
 * the £5 dongle on every marketplace is almost always Bluetooth Classic, and
 * no amount of code reaches it from a phone. iOS cannot use Classic SPP at all
 * without MFi certification.
 */
export const RECOMMENDED_HARDWARE =
  'An ELM327 that says BLE or Bluetooth 4.0. Older "Bluetooth 3.0" or "SPP" dongles cannot be reached from a phone app at all.'

/** Which transport this build can actually use, without touching the radio. */
export function detectTransport(): ObdTransportKind {
  // Capacitor sets this global in the native shell. Checked first: inside the
  // shell the native plugin is the right answer even on Android, where
  // navigator.bluetooth is absent anyway.
  const cap = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  if (cap?.isNativePlatform?.()) return 'native-ble'
  // Check for the method, not the property. `'bluetooth' in navigator` is the
  // usual idiom and it is wrong in exactly the case that matters: a browser
  // that exposes the key but not a working implementation passes it, and the
  // app then offers pairing that can never happen.
  if (typeof navigator !== 'undefined' && typeof navigator.bluetooth?.requestDevice === 'function') {
    return 'web-bluetooth'
  }
  return 'none'
}

/** Why pairing is unavailable, in words a driver can act on. */
export function unavailableReason(): string {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent
  const iOS = /iPad|iPhone|iPod/.test(ua)
  if (iOS) {
    return 'Safari cannot talk to Bluetooth devices. Install the Phronesis app to pair a reader — or describe the symptom and I will work from that.'
  }
  return 'This browser cannot talk to Bluetooth devices. Chrome on Android can, or you can describe the symptom instead.'
}
