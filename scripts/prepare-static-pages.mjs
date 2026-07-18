// Turns the TanStack Start prerendered shell into a plain static site:
//   dist/client/_shell.html  ->  dist/client/index.html
//                             ->  dist/client/404.html
//
// Why 404.html: GitHub Pages (and most static hosts) only serve files that
// exist on disk. This app does its own client-side routing (e.g. /dashboard,
// /transactions), so those paths don't exist as real files. GitHub Pages'
// convention is to serve 404.html for any unknown path — by making 404.html
// identical to index.html, the app's own router loads and takes over.
import { copyFile, access } from "node:fs/promises";
import path from "node:path";

const clientDir = path.resolve(import.meta.dirname, "..", "dist", "client");
const shell = path.join(clientDir, "_shell.html");
const index = path.join(clientDir, "index.html");
const notFound = path.join(clientDir, "404.html");

try {
  await access(shell);
} catch {
  console.error(`[prepare-static-pages] Expected ${shell} to exist after "vite build" — did the prerender step change?`);
  process.exit(1);
}

await copyFile(shell, index);
await copyFile(shell, notFound);
console.log("[prepare-static-pages] Wrote index.html and 404.html from the prerendered shell.");
