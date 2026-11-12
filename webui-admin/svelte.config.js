import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

// Mount path of the app, e.g. "account" for "/account". Accepts "", "account",
// "/account", and tolerates Git-Bash path mangling by taking the last segment.
const raw = process.env.MOX_BASE_PATH || "";
const seg = raw.split(/[\\/]/).filter(Boolean).pop() || "";
const base = seg ? "/" + seg : "";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // SPA mode: the Go server serves index.html for all app routes and
    // forwards /api and /events to the backend.
    adapter: adapter({ fallback: "index.html" }),
    paths: { base },
  },
};

export default config;
