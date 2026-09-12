import type { ObdConnection } from './transport'

/**
 * The ELM327 command set, as much of it as Phronesis needs.
 *
 * An ELM327 is a serial terminal that happens to speak to a car. You write
 * ASCII, it writes ASCII back, and every reply ends with a `>` prompt. The
 * whole protocol is that plus a vocabulary.
 */

/** Bring the adapter to a known state. Order matters. */
const HANDSHAKE = [
  'ATZ', // full reset — the adapter may be mid-session from another app
  'ATE0', // echo off, or every reply arrives with the command glued to it
  'ATL0', // no linefeeds
  'ATS0', // no spaces, which halves the bytes over a slow BLE link
  'ATSP0', // let the adapter negotiate the car's protocol itself
]

export interface Dtc {
  /** e.g. P0325 */
  code: string
  /** Which system raised it. */
  system: 'powertrain' | 'chassis' | 'body' | 'network'
}

const SYSTEM: Array<Dtc['system']> = ['powertrain', 'chassis', 'body', 'network']
const LETTER = ['P', 'C', 'B', 'U']

/**
 * Decodes one 2-byte DTC.
 *
 * The first two bits pick the system letter, the next two the first digit, and
 * the remaining twelve bits are three hex digits. `0x0133` is `P0133`.
 */
export function decodeDtc(hi: number, lo: number): Dtc | null {
  if (hi === 0 && lo === 0) return null // padding, not a fault
  const which = (hi & 0xc0) >> 6
  const first = (hi & 0x30) >> 4
  const rest = ((hi & 0x0f) << 8) | lo
  return {
    code: `${LETTER[which]}${first}${rest.toString(16).toUpperCase().padStart(3, '0')}`,
    system: SYSTEM[which],
  }
}

/**
 * Parses a mode 03 reply into codes.
 *
 * The reply starts `43`, then pairs of bytes. Multi-frame replies arrive as
 * several lines, each of which repeats `43`, so every line is handled rather
 * than only the first — a car with four faults reports them across two frames
 * and the naive parser silently reports two.
 */
export function parseDtcs(raw: string): Dtc[] {
  const out: Dtc[] = []
  for (const line of raw.split(/[\r\n]+/)) {
    const hex = line.replace(/[^0-9A-Fa-f]/g, '')
    const at = hex.indexOf('43')
    if (at === -1) continue
    const body = hex.slice(at + 2)
    for (let i = 0; i + 3 < body.length + 1; i += 4) {
      const pair = body.slice(i, i + 4)
      if (pair.length < 4) break
      const dtc = decodeDtc(parseInt(pair.slice(0, 2), 16), parseInt(pair.slice(2, 4), 16))
      if (dtc && !out.some((d) => d.code === dtc.code)) out.push(dtc)
    }
  }
  return out
}

export interface ObdSession {
  /** What the adapter called itself at reset — useful in a bug report. */
  adapter: string
  /** False when the adapter is fine but the car is not answering. */
  vehicleResponding: boolean
}

/** Runs the handshake and checks the car is actually on the other end. */
export async function openSession(conn: ObdConnection): Promise<ObdSession> {
  let adapter = 'ELM327'
  for (const cmd of HANDSHAKE) {
    const reply = await conn.send(cmd)
    if (cmd === 'ATZ' && reply.trim()) adapter = reply.replace(/[\r\n>]/g, ' ').trim()
  }

  // Mode 01 PID 00 asks "which PIDs do you support". Any sane reply means the
  // adapter reached the ECU. An adapter with no car attached answers
  // NO DATA / UNABLE TO CONNECT, which is a different failure from a dongle
  // that will not pair, and the UI says so.
  const probe = await conn.send('0100')
  const vehicleResponding = /41\s*00/i.test(probe.replace(/\s/g, ''))

  return { adapter, vehicleResponding }
}

/** Mode 03 — stored trouble codes. */
export async function readDtcs(conn: ObdConnection): Promise<Dtc[]> {
  return parseDtcs(await conn.send('03'))
}

/** Mode 04 — clear codes. Deliberately not called anywhere yet. */
export async function clearDtcs(conn: ObdConnection): Promise<void> {
  await conn.send('04')
}
