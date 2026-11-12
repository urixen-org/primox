// Package webuiaccount embeds the built account SvelteKit SPA
// (webui/account/build), so it ships inside the mox binary.
package webuiaccount

import "embed"

// Build is the adapter-static output: index.html plus hashed _app assets.
// Rebuild with: cd webui/account && MOX_BASE_PATH=account npm run build
//
//go:embed all:build
var Build embed.FS
