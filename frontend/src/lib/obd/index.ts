import { detectTransport, unavailableReason } from './transport'
import type { ObdConnection, ObdDevice, ObdTransport, ObdTransportKind } from './transport'
import { openSession, readDtcs } from './elm327'
import type { Dtc, ObdSession } from './elm327'

export type { Dtc, ObdDevice, ObdSession, ObdTransportKind }
export { detectTransport, unavailableReason }
export { RECOMMENDED_HARDWARE } from './transport'

/**
 * Picks a transport for this platform, or says why there is none.
 *
 * Both implementations are lazy: a browser never loads the native plugin, and
 * the native shell never loads a Web Bluetooth path it cannot use.
 */
export async function getTransport(): Promise<ObdTransport | null> {
  switch (detectTransport()) {
    case 'native-ble':
      return (await import('./nativeBle')).nativeBleTransport
    case 'web-bluetooth':
      return (await import('./webBluetooth')).webBluetoothTransport
    default:
      return null
  }
}

export interface PairedReader {
  device: ObdDevice
  session: ObdSession
  connection: ObdConnection
}

/**
 * The whole pairing sequence, as one call.
 *
 * **Must be invoked from a user gesture** — every platform requires it for the
 * device chooser, and it is the right rule regardless: scanning for nearby
 * radios is not something a page should do on its own.
 */
export async function pairReader(): Promise<PairedReader> {
  const transport = await getTransport()
  if (!transport) throw new Error(unavailableReason())

  const device = await transport.requestDevice()
  const connection = await transport.connect(device)

  try {
    const session = await openSession(connection)
    return { device, session, connection }
  } catch (err) {
    // A half-open connection is worse than none: the adapter stays claimed and
    // the next attempt cannot see it.
    await connection.disconnect().catch(() => {})
    throw err
  }
}

/** Reads stored trouble codes from an already-paired reader. */
export async function scanForFaults(reader: PairedReader): Promise<Dtc[]> {
  return readDtcs(reader.connection)
}
