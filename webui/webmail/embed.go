// Package webuiwebmail embeds the built webmail SvelteKit SPA
// (webui/webmail/build), so it ships inside the mox binary.
package webuiwebmail

import "embed"

// Build is the adapter-static output: index.html plus hashed _app assets.
// Rebuild with: cd webui/webmail && MOX_BASE_PATH=webmail npm run build
//
//go:embed all:build
var Build embed.FS
