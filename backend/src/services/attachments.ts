// backend/src/services/attachments.ts

import { z } from 'zod';

/**
 * A photo of the car, or a recording of the noise it is making.
 *
 * Both of these are the point of the product rather than extras: somebody
 * standing beside a car that is making a sound cannot always describe the
 * sound, and a photo of a leak says more in one frame than a paragraph. The
 * plan has listed multi-modal input since the beginning; this is the first
 * part of the pipe that actually carries it.
 *
 * **Base64 inside the existing JSON body, not multipart.** The chat and
 * diagnosis endpoints are JSON, the client already downscales a photo before
 * it sends one, and a thirty-second Opus recording is well under a megabyte.
 * Multipart would be tidier on the wire and would mean two request paths
 * through every layer to save a third of the bytes — not a trade worth making
 * until something here is actually too big.
 */

/** Everything Gemini can be given without a conversion step. */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const;
const AUDIO_TYPES = ['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'] as const;

/**
 * Per-attachment ceiling, in base64 characters.
 *
 * Base64 is about a third larger than the bytes it encodes, so this is very
 * roughly 6MB of actual file. Enough for a downscaled photo or half a minute
 * of speech, small enough that a malformed client cannot post a video.
 */
const MAX_CHARS = 8_000_000;
const MAX_ATTACHMENTS = 4;

export const attachmentSchema = z.object({
  kind: z.enum(['image', 'audio']),
  /** The media type, which is what the model keys its decoding off. */
  mime: z.string().min(3).max(100),
  /** The file itself, base64, WITHOUT a `data:` prefix. */
  data: z.string().min(1).max(MAX_CHARS),
});

export type Attachment = z.infer<typeof attachmentSchema>;

export const attachmentsSchema = z.array(attachmentSchema).max(MAX_ATTACHMENTS).optional();

/**
 * Why this set of attachments cannot be used, or null if it can.
 *
 * Returned rather than thrown so a route can answer with something a person
 * could act on. Silently dropping a recording somebody just made would be the
 * worst of the options: they would believe he had heard it.
 */
export function rejectAttachments(list: Attachment[] | undefined): string | null {
  if (!list || list.length === 0) return null;

  for (const a of list) {
    if (a.kind === 'image' && !IMAGE_TYPES.includes(a.mime as (typeof IMAGE_TYPES)[number])) {
      return `I cannot read ${a.mime} images. Try a JPEG or a PNG.`;
    }
    if (a.kind === 'audio' && !AUDIO_TYPES.includes(a.mime as (typeof AUDIO_TYPES)[number])) {
      return `I cannot listen to ${a.mime}. Try recording again.`;
    }
  }

  return null;
}

/**
 * Gemini takes them inline, alongside the text, in one `contents` array.
 *
 * One model, both media, one hop. A separate vision pass would hand the
 * diagnosis a paragraph ABOUT the photo instead of the photo, and everything
 * the describer did not think to mention would be gone — so the model that
 * knows what matters for a diagnosis is the one that looks at it.
 */
export function toGeminiParts(list: Attachment[] | undefined) {
  return (list ?? []).map((a) => ({ inlineData: { mimeType: a.mime, data: a.data } }));
}


/**
 * What to tell the model it has been given.
 *
 * Without this the attachment arrives with no framing and the model has to
 * guess why it is looking at a wheel arch. One line costs nothing and is the
 * difference between "describe this image" and "diagnose this car".
 */
export function describeAttachments(list: Attachment[] | undefined): string | null {
  if (!list || list.length === 0) return null;
  const photos = list.filter((a) => a.kind === 'image').length;
  const clips = list.filter((a) => a.kind === 'audio').length;
  const parts: string[] = [];
  if (photos) parts.push(`${photos} photo${photos > 1 ? 's' : ''} of the car`);
  if (clips) parts.push(`${clips} recording${clips > 1 ? 's' : ''} of the noise it is making`);
  return `The driver has also sent ${parts.join(' and ')}. Use them as evidence, and say what you can actually see or hear rather than guessing beyond it.`;
}
