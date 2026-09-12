import type { CapacitorConfig } from '@capacitor/cli'

/**
 * The native wrapper.
 *
 * Phronesis is a web app and stays one. Capacitor exists here for exactly one
 * reason: **an OBD reader is Bluetooth, and the web cannot reach Bluetooth on
 * iOS at all** — Apple has never implemented Web Bluetooth and has said it
 * will not. Pairing a reader is a headline feature, so a browser-only build
 * can never be the whole product.
 *
 * Nothing about the app changes to accommodate this. The same bundle Vite
 * already produces is what ships inside the shell.
 */
const config: CapacitorConfig = {
  appId: 'app.phronesis',
  appName: 'Phronesis',
  webDir: 'dist',
  android: {
    // The splash is the app's own Loading route; a second native one would
    // just be a flash of a different thing first.
    backgroundColor: '#101013',
  },
  server: {
    // Native WebViews are served over http://localhost by default, which
    // Firebase Auth and getUserMedia both treat as a secure origin.
    androidScheme: 'https',
  },
}

export default config
