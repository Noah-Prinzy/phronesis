// Avatar_Element/preview/vite.config.mts
//
// Config for the standalone lab. Two deliberate constraints:
//
//   * It imports nothing from `vite` itself (a plain exported object, no
//     defineConfig), so Vite can load this file even though there is no
//     node_modules beside it. That is what lets Avatar_Element stay a
//     portable folder with no install of its own.
//   * Every shared dependency is aliased to the copy in frontend/node_modules.
//     Without that, `three` and `react` would resolve to the repo-root copies
//     while the entry used the frontend ones — two Reacts and two Threes in
//     one page, which fails in confusing ways rather than obvious ones.
//
// Run it from the repo root:
//   node frontend/node_modules/vite/bin/vite.js --config Avatar_Element/preview/vite.config.mts

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const deps = path.join(repoRoot, 'frontend', 'node_modules');

/** Exact-match alias so `react` does not also swallow `react-dom`. */
const alias = (id: string, target = id) => ({
  find: new RegExp(`^${id.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}$`),
  replacement: path.join(deps, target),
});

export default {
  root: here,

  // No @vitejs/plugin-react here — it could not be resolved from this folder.
  // Vite's own esbuild transform handles .tsx fine; the only thing given up
  // is Fast Refresh, so edits reload the page instead of hot-patching it.
  esbuild: { jsx: 'automatic' as const },

  resolve: {
    alias: [
      alias('react/jsx-dev-runtime'),
      alias('react/jsx-runtime'),
      alias('react-dom/client'),
      alias('react-dom'),
      alias('react'),
      alias('three'),
      alias('@react-three/fiber'),
    ],
  },

  server: {
    port: 5180,
    // The entry lives here but the source lives one level up in ../src.
    fs: { allow: [repoRoot] },
  },
};
