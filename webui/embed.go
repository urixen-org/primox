// Package webui embeds the built SvelteKit single-page app (webui/build), so the
// frontend ships inside the mox binary and needs no files at runtime.
package webui

import "embed"

// Build is the adapter-static output: index.html plus hashed _app assets.
// Rebuild with: cd webui && MOX_BASE_PATH=account npm run build
//
//go:embed all:build
var Build embed.FS
