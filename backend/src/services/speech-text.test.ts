import { describe, expect, it } from 'vitest';
import { escapeXml, normaliseForSpeech } from './speech-text';

/**
 * What Phronesis says, as opposed to what is on screen.
 *
 * Two of these rules exist because of failures that were invisible from the
 * code: an unescaped ampersand made the SSML document malformed and the
 * service returned zero bytes — silence, not an error — and unstripped
 * markdown had him pronouncing the hashes in a heading. Neither shows up in a
 * type check, and neither is obvious from reading the function.
 */

describe('escapeXml', () => {
  it('escapes the ampersand that silences the whole reply', () => {
    // msedge-tts interpolates this straight into SSML without escaping. One
    // bare "&" makes the document malformed and the service returns NO AUDIO
    // AT ALL — the retry on a fresh socket fails identically.
    expect(escapeXml('Wear & tear on the pads')).toBe('Wear &amp; tear on the pads');
  });

  it('escapes angle brackets, which would open a bogus tag', () => {
    expect(escapeXml('under <5mm')).toBe('under &lt;5mm');
    expect(escapeXml('over >100k')).toBe('over &gt;100k');
  });

  it('leaves ordinary text alone', () => {
    expect(escapeXml('The pads are worn.')).toBe('The pads are worn.');
  });
});

describe('normaliseForSpeech', () => {
  it('does NOT escape — that belongs to the transport', () => {
    // Gemini sits behind Edge and takes plain text. Escaping here would have
    // it reading the entity aloud as "amp".
    expect(normaliseForSpeech('Wear & tear')).toBe('Wear & tear');
  });

  describe('his own name', () => {
    it('respells it so the model can say it', () => {
      // Greek. Read literally it came out closer to "e na unasis".
      expect(normaliseForSpeech('I am Phronesis.')).toBe('I am Froneesis.');
    });

    it('catches it mid-sentence and in lower case', () => {
      expect(normaliseForSpeech('Ask phronesis about it')).toContain('Froneesis');
    });
  });

  describe('markdown', () => {
    it('strips heading hashes, which were being pronounced', () => {
      // Word-boundary metadata showed "#" and "#" arriving as their own
      // spoken tokens before the sentence began.
      expect(normaliseForSpeech('## What it costs')).toBe('What it costs');
    });

    it('strips emphasis without eating the words', () => {
      expect(normaliseForSpeech('the **front** pads')).toBe('the front pads');
      expect(normaliseForSpeech('the _front_ pads')).toBe('the front pads');
    });

    it('keeps link text and drops the URL', () => {
      expect(normaliseForSpeech('see [the guide](https://x.test/a)')).toBe('see the guide');
    });

    it('strips list bullets', () => {
      expect(normaliseForSpeech('- pads\n- discs')).toBe('pads\ndiscs');
    });

    it('does not turn a horizontal rule into a lone dash', () => {
      expect(normaliseForSpeech('one\n---\ntwo').includes('-')).toBe(false);
    });

    it('drops code fences entirely', () => {
      expect(normaliseForSpeech('before ```P0420``` after')).toBe('before after');
    });
  });

  describe('the domain vocabulary', () => {
    it('says money as an amount followed by the currency', () => {
      // "UGX 280,000" reads as three letters then digits otherwise.
      expect(normaliseForSpeech('UGX 280,000')).toBe('280,000 shillings');
    });

    it('spells fault codes digit by digit', () => {
      // The single most important string this app says.
      expect(normaliseForSpeech('code P0420')).toBe('code P zero four two zero');
      expect(normaliseForSpeech('code U0100')).toBe('code U zero one zero zero');
    });

    it('expands distances', () => {
      expect(normaliseForSpeech('92,000 km')).toBe('92,000 kilometres');
      expect(normaliseForSpeech('13.8 km/L')).toBe('13.8 kilometres per litre');
    });

    it('spaces the acronyms that are read as letters', () => {
      expect(normaliseForSpeech('the OBD reader')).toBe('the O B D reader');
      expect(normaliseForSpeech('the ABS light')).toBe('the A B S light');
    });

    it('says A/C as words', () => {
      expect(normaliseForSpeech('the A/C is weak')).toBe('the air conditioning is weak');
    });

    it('rescues "mic", which came out as "em eye see"', () => {
      expect(normaliseForSpeech('tap the mic')).toBe('tap the mike');
    });

    it('turns an ellipsis into three stops, which buy a real pause', () => {
      // Measured: "…" bought 2.06s against a comma's 2.11s, where "..." buys
      // 2.83s. The character was doing the opposite of its job.
      expect(normaliseForSpeech('Well… maybe')).toBe('Well... maybe');
    });
  });

  it('collapses the whitespace that stripping leaves behind', () => {
    expect(normaliseForSpeech('##   Cost\n\n\n\nIt depends.')).toBe('Cost\n\nIt depends.');
  });

  it('handles a realistic reply end to end', () => {
    const reply = '## Likely cause\nThe **ABS** sensor, code `P0420`, about UGX 180,000 — 92,000 km in.';
    const spoken = normaliseForSpeech(reply);

    expect(spoken).not.toContain('#');
    expect(spoken).not.toContain('**');
    expect(spoken).not.toContain('`');
    expect(spoken).toContain('A B S');
    expect(spoken).toContain('P zero four two zero');
    expect(spoken).toContain('180,000 shillings');
    expect(spoken).toContain('92,000 kilometres');
  });
});
