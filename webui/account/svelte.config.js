import adapter from "@sveltejs/adapter-static";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import { fileURLToPath } from "node:url";

// Mount path of the app, e.g. "account" for "/account".
const raw = process.env.MOX_BASE_PATH || "";
const seg = raw.split(/[\\/]/).filter(Boolean).pop() || "";
const base = seg ? "/" + seg : "";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: "index.html" }),
    paths: { base },
    alias: { "@mox/ui": fileURLToPath(new URL("../shared", import.meta.url)) },
  },
};

export default config;
