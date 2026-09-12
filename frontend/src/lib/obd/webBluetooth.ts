import { ELM327_SERVICES } from './transport'
import type { ObdConnection, ObdDevice, ObdTransport } from './transport'

/**
 * Web Bluetooth — the browser path.
 *
 * Works in Chrome on Android and desktop Chrome. Absent on iOS entirely, and
 * absent inside Capacitor's WebView, which is why `nativeBle.ts` exists.
 */

/** How long to wait for the `>` prompt before giving up on a command. */
const REPLY_TIMEOUT_MS = 5000

/** The adapter is a terminal: everything ends at the prompt. */
const PROMPT = '>'

async function findPipes(server: BluetoothRemoteGATTServer) {
  // Characteristics are picked by their *properties*, not by hard-coded UUIDs.
  // ELM327 clones disagree about which UUID is which — some swap write and
  // notify between fff1 and fff2 — but none of them lie about whether a
  // characteristic can be written to or can notify.
  for (const uuid of ELM327_SERVICES) {
    let service: BluetoothRemoteGATTService
    try {
      service = await server.getPrimaryService(uuid as BluetoothServiceUUID)
    } catch {
      continue // this adapter does not expose that service; try the next
    }

    const chars = await service.getCharacteristics()
    const rx = chars.find((c) => c.properties.notify || c.properties.indicate)
    const tx = chars.find((c) => c.properties.write || c.properties.writeWithoutResponse)
    if (rx && tx) return { rx, tx }
  }
  throw new Error('That device does not look like an OBD reader — no serial service on it.')
}

export const webBluetoothTransport: ObdTransport = {
  kind: 'web-bluetooth',

  async requestDevice(): Promise<ObdDevice> {
    // `acceptAllDevices` rather than a service filter, deliberately. Cheap
    // ELM327 clones frequently advertise no service UUID at all, and a
    // filtered chooser then shows an empty list with no way to recover —
    // the user cannot retry without another gesture. Showing everything and
    // letting them pick the one called OBDII is worse in theory and far
    // better in a car park.
    const device = await navigator.bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [...ELM327_SERVICES] as BluetoothServiceUUID[],
    })
    return { id: device.id, name: device.name ?? 'Unnamed device' }
  },

  async connect(target: ObdDevice): Promise<ObdConnection> {
    const devices = await navigator.bluetooth.getDevices?.().catch(() => [])
    const device = devices?.find((d) => d.id === target.id)
    if (!device) {
      throw new Error('Lost track of that reader. Tap pair again.')
    }
    const server = await device.gatt?.connect()
    if (!server) throw new Error('Could not open a connection to the reader.')

    const { rx, tx } = await findPipes(server)
    await rx.startNotifications()

    // One buffer, because replies arrive in whatever chunks the radio felt
    // like. A frame boundary means nothing; the prompt is the only delimiter.
    let buffer = ''
    let settle: ((value: string) => void) | null = null

    rx.addEventListener('characteristicvaluechanged', () => {
      const value = (rx.value as DataView | undefined) ?? new DataView(new ArrayBuffer(0))
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
      deviceName: device.name ?? target.name,

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
        // Carriage return, not newline — the ELM327 wants CR and ignores LF.
        const payload = encoder.encode(`${command}\r`)
        if (tx.properties.writeWithoutResponse) {
          await tx.writeValueWithoutResponse(payload)
        } else {
          await tx.writeValueWithResponse(payload)
        }
        return wait
      },

      async disconnect() {
        try {
          await rx.stopNotifications()
        } catch {
          /* the device may already be gone; disconnecting is still correct */
        }
        device.gatt?.disconnect()
      },
    }
  },
}
