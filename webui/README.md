# webui — SvelteKit frontends

One folder with both web apps and their shared code:

```
webui/
  shared/            # imported as @mox/ui (theme, helpers, generic components)
    app.css
    base.ts          # mount path + absolute API/SSE base URLs
    storage.ts       # safe localStorage
    format.ts        # errmsg, domainName/String, sizes, durations, age, ...
    components/
      Section.svelte
      Badge.svelte
  account/           # SvelteKit app, base "/account"
    src/
      app.html
      lib/{api,auth,client}.ts
      lib/components/{AppShell,LoginOverlay,Sidebar,LoginAttempts}.svelte
      routes/...      # overview, password, loginattempts, tls, junk*, introbox,
                      # rejects, retired, fromid, suppressions, imap, webhooks,
                      # export, import, destinations/[name]
    build/            # committed, embedded via embed.go
    embed.go          # package webuiaccount, //go:embed all:build
    svelte.config.js  # kit.alias @mox/ui -> ../shared, paths.base from MOX_BASE_PATH
    vite.config.ts
    tsconfig.json
  admin/             # SvelteKit app, base "/admin"
    src/
      app.html
      lib/{api,auth,client}.ts
      lib/components/{AppShell,LoginOverlay,Sidebar}.svelte
      routes/...      # overview, accounts/[name], loginattempts, queue(/retired),
                      # webhookqueue(/retired), dmarc(/evaluations), tlsrpt(/results),
                      # mtasts, dnsbl, routes, webserver, config, loglevels,
                      # domains/[name]
    build/            # committed, embedded via embed.go
    embed.go          # package webuiadmin, //go:embed all:build
    svelte.config.js
    vite.config.ts
    tsconfig.json
```

Both apps import shared code as `@mox/ui/...` (e.g.
`@mox/ui/format`, `@mox/ui/components/Section.svelte`, `@mox/ui/app.css`),
configured with `kit.alias` in each app's `svelte.config.js`.

## Why two apps, one folder

`webaccount` and `webadmin` are separate services in mox: different mount paths
(`/account/`, `/admin/`), possibly different ports, and different authentication
(account credentials vs. admin password). So each app is built and embedded
separately and served by its own handler. Sharing `webui/shared` avoids
duplicating the theme, helpers and generic components.

## Build

Each app is self-contained (own `node_modules`, own lockfile). Node 18+.

```sh
cd webui/account && npm ci && MOX_BASE_PATH=account npm run build   # -> webui/account/build
cd webui/admin   && npm ci && MOX_BASE_PATH=admin   npm run build   # -> webui/admin/build
```

`MOX_BASE_PATH` is the mount path segment (`account` → `/account`); it accepts
`account`, `/account`, or a Windows path (last segment used). Empty builds for
serving at the domain root.

`make frontend` rebuilds both when sources are newer. The builds are committed
(like mox's other generated frontend) so a plain `go build` works; they are
embedded via `webui/account/embed.go` and `webui/admin/embed.go`.

Type-check:

```sh
cd webui/account && npm run check
cd webui/admin   && npm run check
```

## Base path

`paths.base` is applied at build time, so asset URLs become `/account/_app/...`
and `/admin/_app/...`, and the runtime `base` is used by `@mox/ui/base` to call
`<base>/api/...`. The build must match the configured mount path.

## Development

```sh
# point at a running mox; account proxies /api,/events,/import,/importprogress,/export,
# admin proxies /api
MOX_DEV_API=http://localhost:1080 npm run dev
```

## Go integration

`mox.WebappStatic` (`mox-/webappstatic.go`) serves an `fs.FS`, answers unknown
paths with the SPA fallback, caches hashed assets immutably, and injects
`$configdir/<stem>.{css,js}` customizations into the shell. `webaccount/svelte.go`
and `webadmin/svelte.go` wire the embedded `build` (with `CustomStem`
`webaccount`/`webadmin`) and serve the SPA for `/` and client routes while
`/api/...` stays authenticated.

## API clients

`src/lib/api.ts` in each app is generated from the app's `api.json`. The Makefile
generates them with `gents.sh` (`webaccount/api.json` → `webui/account/src/lib/api.ts`,
`webadmin/api.json` → `webui/admin/src/lib/api.ts`).

## Status

- **account**: fully ported (all sections).
- **admin**: fully ported (all sections).
- **webmail**: still the legacy app (excluded from this migration).
