import { ELM327_SERVICES } from './transport'
import type { ObdConnection, ObdDevice, ObdTransport } from './transport'

/**
 * Native BLE — the Capacitor path.
 *
 * This is the transport that works on **both** platforms, and the reason the
 * native shell exists at all. Android's WebView has no Web Bluetooth, and iOS
 * has none anywhere, so inside the app this plugin is the only way to reach a
 * reader on either.
 *
 * The plugin is imported lazily. A browser build should not pull a native
 * module into its bundle for a code path it can never take.
 */

const REPLY_TIMEOUT_MS = 5000
const PROMPT = '>'

/** Normalised to the 128-bit form the plugin expects. */
function fullUuid(short: string | number): string {
  if (typeof short === 'string') return short.toLowerCase()
  return `0000${short.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`
}

const SERVICE_UUIDS = ELM327_SERVICES.map(fullUuid)

type Ble = typeof import('@capacitor-community/bluetooth-le')['BleClient']

let cached: Ble | null = null
async function client(): Promise<Ble> {
  if (cached) return cached
  const mod = await import('@capacitor-community/bluetooth-le')
  await mod.BleClient.initialize({ androidNeverForLocation: true })
  cached = mod.BleClient
  return cached
}

export const nativeBleTransport: ObdTransport = {
  kind: 'native-ble',

  async requestDevice(): Promise<ObdDevice> {
    const ble = await client()
    // The plugin's own chooser, which is the platform's. Same reasoning as the
    // web path: no service filter, because clone dongles often advertise none
    // and a filtered list that comes back empty is a dead end.
    const device = await ble.requestDevice({ optionalServices: SERVICE_UUIDS })
    return { id: device.deviceId, name: device.name ?? 'Unnamed device' }
  },

  async connect(target: ObdDevice): Promise<ObdConnection> {
    const ble = await client()
    await ble.connect(target.id, () => {
      // Disconnect callback. The session is torn down by the caller when a
      // command times out, so this only needs to not throw.
    })

    // Find a service that answers, then pick pipes by property rather than by
    // UUID — clones disagree about which characteristic is which.
    let serviceUuid: string | null = null
    let rxUuid: string | null = null
    let txUuid: string | null = null

    const services = await ble.getServices(target.id)
    for (const svc of services) {
      if (!SERVICE_UUIDS.includes(svc.uuid.toLowerCase())) continue
      const rx = svc.characteristics.find((c) => c.properties.notify || c.properties.indicate)
      const tx = svc.characteristics.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse,
      )
      if (rx && tx) {
        serviceUuid = svc.uuid
        rxUuid = rx.uuid
        txUuid = tx.uuid
        break
      }
    }

    if (!serviceUuid || !rxUuid || !txUuid) {
      await ble.disconnect(target.id)
      throw new Error('That device does not look like an OBD reader — no serial service on it.')
    }

    let buffer = ''
    let settle: ((value: string) => void) | null = null

    await ble.startNotifications(target.id, serviceUuid, rxUuid, (value) => {
      buffer += new TextDecoder().decode(value)
      if (buffer.includes(PROMPT) && settle) {
        const reply = buffer.slice(0, buffer.indexOf(PROMPT))
        buffer = ''
        const done = settle
        settle = null
        done(reply)
      }
    })

    const encoder = new TextEncoder()

    return {
      deviceName: target.name,

      async send(command: string) {
        buffer = ''
        const wait = new Promise<string>((resolve, reject) => {
          settle = resolve
          setTimeout(() => {
            if (settle) {
              settle = null
              reject(new Error(`The reader did not answer "${command}".`))
            }
          }, REPLY_TIMEOUT_MS)
        })
        const bytes = encoder.encode(`${command}\r`)
        await ble.write(
          target.id,
          serviceUuid,
          txUuid,
          new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
        )
        return wait
      },

      async disconnect() {
        try {
          await ble.stopNotifications(target.id, serviceUuid, rxUuid)
        } catch {
          /* already gone; disconnecting is still the right next step */
        }
        await ble.disconnect(target.id)
      },
    }
  },
}
