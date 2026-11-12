// Package webuiadmin embeds the built admin SvelteKit single-page app
// (webui-admin/build), so it ships inside the mox binary.
package webuiadmin

import "embed"

// Build is the adapter-static output: index.html plus hashed _app assets.
// Rebuild with: cd webui-admin && MOX_BASE_PATH=admin npm run build
//
//go:embed all:build
var Build embed.FS
