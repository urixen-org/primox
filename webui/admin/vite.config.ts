import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

const apiTarget = process.env.MOX_DEV_API || "http://localhost:1080";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: { allow: [".."] },
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
    },
  },
});
