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
  "How has the car been?": "/voice/ff89b1cc5849.mp3",
  "Morning. How has the car been?": "/voice/d83a4acfa05b.mp3",
  "Afternoon. How has the car been?": "/voice/ebb89dc3fce4.mp3",
  "Evening. How has the car been?": "/voice/896864de3b19.mp3",
  "What is it doing today?": "/voice/52bb19876a1f.mp3",
  "Morning. What is it doing today?": "/voice/c5b3fc124f2b.mp3",
  "Afternoon. What is it doing today?": "/voice/3fe95eacb2a1.mp3",
  "Evening. What is it doing today?": "/voice/19e79106b5ea.mp3",
  "Anything playing up?": "/voice/8ba6fe31e66c.mp3",
  "Morning. Anything playing up?": "/voice/5752ce0ad652.mp3",
  "Afternoon. Anything playing up?": "/voice/704cad483bed.mp3",
  "Evening. Anything playing up?": "/voice/7dd66d22ca95.mp3",
  "What can I look at for you?": "/voice/f7cc8f466f76.mp3",
  "Morning. What can I look at for you?": "/voice/998ff27d811e.mp3",
  "Afternoon. What can I look at for you?": "/voice/e016abb229a8.mp3",
  "Evening. What can I look at for you?": "/voice/201976df0852.mp3",
  "How are things with the car?": "/voice/34104d564e1d.mp3",
  "Morning. How are things with the car?": "/voice/581bea72fe03.mp3",
  "Afternoon. How are things with the car?": "/voice/4c416120b764.mp3",
  "Evening. How are things with the car?": "/voice/ba062a4ea099.mp3",
  "How is the search going?": "/voice/dbeb58d79c96.mp3",
  "Morning. How is the search going?": "/voice/e45f3fefbe5c.mp3",
  "Afternoon. How is the search going?": "/voice/af3fc6c72aeb.mp3",
  "Evening. How is the search going?": "/voice/a770057eb339.mp3",
  "Found anything you like?": "/voice/20480ca0f6ad.mp3",
  "Morning. Found anything you like?": "/voice/d7700697b7b5.mp3",
  "Afternoon. Found anything you like?": "/voice/bca92030c11d.mp3",
  "Evening. Found anything you like?": "/voice/762748e9a50f.mp3",
  "What are we looking at today?": "/voice/b26645507a7f.mp3",
  "Morning. What are we looking at today?": "/voice/135ad736e162.mp3",
  "Afternoon. What are we looking at today?": "/voice/5766315009b2.mp3",
  "Evening. What are we looking at today?": "/voice/ed92811f8c26.mp3",
  "Seen anything worth a second look?": "/voice/d520e76b4289.mp3",
  "Morning. Seen anything worth a second look?": "/voice/1ee3512b300d.mp3",
  "Afternoon. Seen anything worth a second look?": "/voice/8ff02b93d5c8.mp3",
  "Evening. Seen anything worth a second look?": "/voice/3fb20743ff3f.mp3",
  "Where did we get to?": "/voice/45c6ed9c2b41.mp3",
  "Morning. Where did we get to?": "/voice/c379e985e5b4.mp3",
  "Afternoon. Where did we get to?": "/voice/b03af6d17736.mp3",
  "Evening. Where did we get to?": "/voice/06cbd2aa421e.mp3",
}
