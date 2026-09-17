import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' });
  }

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('en-IE-EmilyNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      audioStream.on('data', (c: Buffer) => chunks.push(c));
      audioStream.on('end', () => resolve());
      audioStream.on('error', reject);
    });

    const audio = Buffer.concat(chunks);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.send(audio);
  } catch (err: any) {
    console.error('TTS error:', err);
    return res.status(502).json({ error: err.message || 'TTS synthesis failed' });
  }
}
