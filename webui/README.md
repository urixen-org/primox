# webui — SvelteKit frontends

One folder with all web apps and their shared code:

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
  webmail/           # SvelteKit app, base "/webmail"
    src/
      app.html
      app.css          # three-pane mail layout
      lib/{api,auth,client,format,search,state}.ts
      lib/components/{AppShell,LoginOverlay,TopBar,MailboxList,MessageList,
                      MessageView,Compose,SettingsModal,HelpModal}.svelte
      routes/+page.svelte
    build/            # committed, embedded via embed.go
    embed.go          # package webuiwebmail, //go:embed all:build
    svelte.config.js
    vite.config.ts
    tsconfig.json
```

All apps import shared code as `@mox/ui/...` (e.g. `@mox/ui/format`,
`@mox/ui/components/Section.svelte`, `@mox/ui/app.css`), configured with
`kit.alias` in each app's `svelte.config.js`.

## Why three apps, one folder

`webaccount`, `webadmin` and `webmail` are separate services in mox: different
mount paths (`/account/`, `/admin/`, `/webmail/`), possibly different ports, and
different authentication (account credentials, admin password, and webmail
sessions). So each app is built and embedded separately and served by its own
handler. Sharing `webui/shared` avoids duplicating the theme, helpers and
generic components.

## Build

Each app is self-contained (own `node_modules`, own lockfile). Node 18+.

```sh
cd webui/account && npm ci && MOX_BASE_PATH=account npm run build   # -> webui/account/build
cd webui/admin   && npm ci && MOX_BASE_PATH=admin   npm run build   # -> webui/admin/build
cd webui/webmail && npm ci && MOX_BASE_PATH=webmail npm run build   # -> webui/webmail/build
```

`MOX_BASE_PATH` is the mount path segment (`webmail` → `/webmail`); it accepts
`webmail`, `/webmail`, or a Windows path (last segment used). Empty builds for
serving at the domain root.

`make frontend` rebuilds all three when sources are newer. The builds are
committed (like mox's other generated frontend) so a plain `go build` works;
they are embedded via `webui/account/embed.go`, `webui/admin/embed.go` and
`webui/webmail/embed.go`.

The legacy webmail message-viewer endpoints (`msg.html`, `msg.js`, `text.html`,
`text.js`) remain in `webmail/` and are built separately by `make frontend`.
They share the generated `webmail/api.ts` client with the new app (the Makefile
also generates `webui/webmail/src/lib/api.ts` from the same `api.json`).

Type-check:

```sh
cd webui/account && npm run check
cd webui/admin   && npm run check
cd webui/webmail && npm run check
```

## Base path

`paths.base` is applied at build time, so asset URLs become `/account/_app/...`,
`/admin/_app/...` and `/webmail/_app/...`, and the runtime `base` is used by
`@mox/ui/base` to call `<base>/api/...`. The build must match the configured
mount path.

## Development

```sh
# point at a running mox; account proxies /api,/events,/import,/importprogress,/export,
# admin proxies /api, webmail proxies /api,/events,/msg,/export
MOX_DEV_API=http://localhost:1080 npm run dev
```

## Go integration

`mox.WebappStatic` (`mox-/webappstatic.go`) serves an `fs.FS`, answers unknown
paths with the SPA fallback, caches hashed assets immutably, and injects
`$configdir/<stem>.{css,js}` customizations into the shell. `webaccount/svelte.go`,
`webadmin/svelte.go` and `webmail/svelte.go` wire the embedded `build` (with
`CustomStem` `webaccount`/`webadmin`/`webmail`) and serve the SPA for `/` and
client routes while `/api/...` and data endpoints stay authenticated.

For webmail the SPA shell is public (it contains no data); `/api/...`, `/events`,
`/export` and `/msg/...` still require authentication. `$configdir/webmail.css`
and `$configdir/webmail.js` customizations are injected into the SPA shell by
`WebappStatic`, and into the legacy `msg.html`/`text.html` viewers.

## API clients

`src/lib/api.ts` in each app is generated from the app's `api.json`. The Makefile
generates them with `gents.sh` (`webaccount/api.json` → `webui/account/src/lib/api.ts`,
`webadmin/api.json` → `webui/admin/src/lib/api.ts`, `webmail/api.json` →
`webmail/api.ts` and `webui/webmail/src/lib/api.ts`).

## Status

- **account**: fully ported (all sections).
- **admin**: fully ported (all sections).
- **webmail**: ported to SvelteKit. Covers login, mailboxes, message list/view,
  search, threading and refine filters, real-time SSE updates, message actions
  (read/flag/junk/move/delete), attachment download/view, compose/reply/forward,
  drafts, settings and help. The legacy `msg.html`/`text.html` iframe viewers are
  kept for opening a message in its own window.
