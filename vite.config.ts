// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// GitHub Pages serves a project site at https://<user>.github.io/<repo>/ —
// everything (including asset URLs) needs to be prefixed with /<repo>/.
// Set GITHUB_PAGES_BASE when building for Pages, e.g.:
//   GITHUB_PAGES_BASE=/bujetting/ npm run build
const base = process.env.GITHUB_PAGES_BASE ?? "/";

export default defineConfig({
  // No server-rendering and no server functions anymore (see src/lib/seed.functions.ts) —
  // this app now runs entirely as a static single-page app that talks to Supabase
  // directly from the browser. Disabling nitro means the build produces plain
  // static files instead of a server bundle.
  nitro: false,
  tanstackStart: {
    // Prerender a static shell + client bundle instead of a server entry.
    spa: { enabled: true },
  },
  vite: { base, server: { host: "127.0.0.1" } },
});
