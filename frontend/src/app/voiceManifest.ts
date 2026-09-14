// GENERATED FILE — do not edit by hand.
// Written by backend/scripts/prerender-voice.ts. Run `npm run voice:prerender`
// in backend/ after changing anything in app/lines.ts.

/**
 * Fixed lines that already exist as audio, keyed by the exact text.
 *
 * A miss is not a failure — `useSpeak` falls through to the live endpoint, so
 * an out-of-date manifest costs latency and nothing else. That is deliberate:
 * a stale build should never make Phronesis mute.
 */
export const VOICE_MANIFEST: Readonly<Record<string, string>> = {
  "Hello. My name is Phronesis. Think of me as the friend who actually knows cars, the one you'd call before you call a mechanic. Shall we get you set up?": "/voice/bf0b981738d8.mp3",
  "So before anything else — have you already got a car, or are you still shopping for one?": "/voice/ae1917e0548b.mp3",
  "If you have an OBD reader, plug it in under the dash and I'll connect to it. If you haven't, that's fine — you can just tell me what the car is doing.": "/voice/1b4708633bfc.mp3",
  "This device can't talk to a Bluetooth reader, so just tell me what the car is doing and I'll work from that.": "/voice/16dad0e4bea7.mp3",
  "Last thing, then we're done. Make an account and I'll remember your car and everything we work out together. What should I call you?": "/voice/1da2e2ee3c50.mp3",
  "Last thing, then we're done. Make an account and I'll remember your budget and what you've already ruled out. What should I call you?": "/voice/7a5fc14fa8c9.mp3",
  "Tap my orb or the mic whenever you want to talk. So, what's your car been doing — a noise, a warning light, something that just feels off?": "/voice/79b87e388143.mp3",
  "Tap my orb or the mic whenever you want to talk. So, what are you looking for — a budget, a make you like, something for work?": "/voice/bf70016d41a6.mp3",
  "Sorry — go on.": "/voice/c45c398af07f.mp3",
  "Sorry, you were saying?": "/voice/2bc6af33a7a6.mp3",
  "Go on, I'm listening.": "/voice/5cb2fa0c1f45.mp3",
}
