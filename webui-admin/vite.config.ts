import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

// During development, proxy API and event-stream requests to a running mox.
const apiTarget = process.env.MOX_DEV_API || 'http://localhost:1080'

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api': { target: apiTarget, changeOrigin: true },
			'/events': { target: apiTarget, changeOrigin: true },
			'/import': { target: apiTarget, changeOrigin: true },
			'/importprogress': { target: apiTarget, changeOrigin: true },
			'/export': { target: apiTarget, changeOrigin: true },
		},
	},
})
