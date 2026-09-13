import { describe, expect, it } from 'vitest'
import { decodeDtc, parseDtcs } from './elm327'

/**
 * The OBD protocol, tested because it is the one part of this app that cannot
 * be checked by looking at it.
 *
 * A wrong fault code is not a rendering bug — it is Phronesis confidently
 * telling somebody their catalytic converter is failing when the reading said
 * something else entirely, and the user has no way to know. Everywhere else
 * in the product a mistake is visible; here it is invisible and expensive.
 *
 * These are the cases that come off a real adapter, including the malformed
 * ones. No hardware needed: the wire format is just text.
 */

describe('decodeDtc', () => {
  it('reads the system letter out of the top two bits', () => {
    // 00 → P (powertrain), 01 → C (chassis), 10 → B (body), 11 → U (network)
    expect(decodeDtc(0x01, 0x33)?.code).toBe('P0133')
    expect(decodeDtc(0x41, 0x33)?.code).toBe('C0133')
    expect(decodeDtc(0x81, 0x33)?.code).toBe('B0133')
    expect(decodeDtc(0xc1, 0x33)?.code).toBe('U0133')
  })

  it('reads the first digit out of the next two bits', () => {
    expect(decodeDtc(0x01, 0x00)?.code).toBe('P0100')
    expect(decodeDtc(0x11, 0x00)?.code).toBe('P1100')
    expect(decodeDtc(0x21, 0x00)?.code).toBe('P2100')
    expect(decodeDtc(0x31, 0x00)?.code).toBe('P3100')
  })

  it('keeps the leading zeros in the last three digits', () => {
    // 0x0001 is P0001, not P01 — a bare toString(16) loses this.
    expect(decodeDtc(0x00, 0x01)?.code).toBe('P0001')
    expect(decodeDtc(0x00, 0x20)?.code).toBe('P0020')
  })

  it('reads the most common real code correctly', () => {
    // P0420, catalyst efficiency below threshold. The one everybody meets.
    expect(decodeDtc(0x04, 0x20)?.code).toBe('P0420')
  })

  it('uppercases the hex digits', () => {
    expect(decodeDtc(0x0a, 0xbc)?.code).toBe('P0ABC')
  })

  it('treats an all-zero pair as padding rather than a fault', () => {
    // Adapters pad the last frame with zeros. Read literally that is "P0000",
    // a fault code that does not exist, reported on a healthy car.
    expect(decodeDtc(0x00, 0x00)).toBeNull()
  })

  it('names the system as well as the code', () => {
    expect(decodeDtc(0x01, 0x33)?.system).toBeTruthy()
    expect(decodeDtc(0x41, 0x33)?.system).not.toBe(decodeDtc(0x01, 0x33)?.system)
  })
})

describe('parseDtcs', () => {
  it('reads a single-frame reply', () => {
    expect(parseDtcs('43 01 33').map((d) => d.code)).toEqual(['P0133'])
  })

  it('reads several codes out of one frame', () => {
    expect(parseDtcs('43 01 33 04 20').map((d) => d.code)).toEqual(['P0133', 'P0420'])
  })

  it('reads a MULTI-FRAME reply, where every line repeats the 43', () => {
    // The case a naive parser truncates: it finds the first "43", reads that
    // line, and silently drops every fault after it. A car with six faults
    // reports two.
    const raw = ['43 01 33 04 20', '43 01 71 03 00', '43 05 00 00 00'].join('\r\n')
    expect(parseDtcs(raw).map((d) => d.code)).toEqual([
      'P0133',
      'P0420',
      'P0171',
      'P0300',
      'P0500',
    ])
  })

  it('ignores the padding zeros at the end of a frame', () => {
    expect(parseDtcs('43 04 20 00 00 00 00').map((d) => d.code)).toEqual(['P0420'])
  })

  it('survives the adapter echoing and prompting around the data', () => {
    expect(parseDtcs('03\r\n43 04 20\r\n>').map((d) => d.code)).toEqual(['P0420'])
  })

  it('copes with no spaces, which some clones send', () => {
    expect(parseDtcs('430420').map((d) => d.code)).toEqual(['P0420'])
  })

  it('does not report the same fault twice', () => {
    // Frames overlap on some adapters. Two entries for one fault would read as
    // two separate problems.
    const raw = ['43 04 20', '43 04 20'].join('\r\n')
    expect(parseDtcs(raw).map((d) => d.code)).toEqual(['P0420'])
  })

  it('returns nothing for a clean car', () => {
    // Mode 03 with no faults. Must be empty, never a spurious P0000.
    expect(parseDtcs('43 00 00')).toEqual([])
    expect(parseDtcs('NO DATA')).toEqual([])
  })

  it('returns nothing rather than throwing on junk', () => {
    // A wedged adapter emits all sorts. Nothing here may crash the read.
    expect(parseDtcs('')).toEqual([])
    expect(parseDtcs('?')).toEqual([])
    expect(parseDtcs('UNABLE TO CONNECT')).toEqual([])
    expect(parseDtcs('SEARCHING...')).toEqual([])
  })

  it('ignores a trailing half-pair instead of misreading it', () => {
    // A truncated frame should cost you the incomplete code, not invent one.
    expect(parseDtcs('43 04 20 01').map((d) => d.code)).toEqual(['P0420'])
  })
})
