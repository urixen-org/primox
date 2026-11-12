# webui — SvelteKit frontend

A SvelteKit (Svelte 4) single-page app for mox's web UIs, built as a static SPA
with `@sveltejs/adapter-static`. The Go server serves the built files and proxies
the existing `/api` and `/events` endpoints, so there is no Node backend.

This is the ported **account** app, embedded in the Go binary by default. The
shared pieces are designed to be reused by the admin and webmail apps with
minimal duplication.

## Why this structure

The original UIs are hand-built DOM in one big TypeScript file per app. Here the
repetitive parts live once in `src/lib` and are composed per page:

```
src/
  app.css                    Global theme (colors, tables, forms, sidebar, ...)
  app.html                   SPA shell; renders into #page
  lib/
    api.ts                   Generated sherpa client (from webaccount/api.ts)
    base.ts                  Mount path + absolute API/SSE base URLs
    auth.ts                  Login flow (store + LoginPrep/Login), logout
    storage.ts               Safe localStorage access
    format.ts                domainName/domainString/age/formatQuotaSize/...
    client.ts                Shared authenticated API client
    components/
      AppShell.svelte        Sidebar + content layout, calls moxBeforeDisplay
      Sidebar.svelte         Nav config + active highlighting from the route
      LoginOverlay.svelte    Login modal driven by the client's login callback
      Section.svelte         Consistent section heading/spacing
      Badge.svelte           Colored status tags
      LoginAttempts.svelte   Login-attempts table (shared by two pages)
  routes/                    One directory per section (SPA routes)
    +layout.ts               ssr = false, prerender = false
    +layout.svelte           Imports app.css, wraps pages in AppShell
    +page.svelte             Overview
    password/, loginattempts/, tls/, junkflags/, junkfilter/, introbox/,
    rejects/, retired/, fromid/, suppressions/, imap/, webhooks/, export/,
    import/, destinations/[name]/
```

Key "less repetitive" choices:

- One theme (`app.css`); pages use semantic classes instead of inline styles.
- One API client (`client.ts`) with transparent auth via `auth.ts`; the client
  re-prompts on `user:noAuth`/`user:badAuth` automatically.
- One `Section`, one `Badge`, one `LoginAttempts` table reused across pages.
- One `Sidebar` whose items come from a small array; the active item is derived
  from `$page.url.pathname`, so adding a section is a one-line change.
- `base.ts` computes absolute API/SSE URLs, so they work on any SPA route.

## Requirements & build

Node 18+ (tested with Node 26). Then:

```sh
cd webui
npm ci
MOX_BASE_PATH=account npm run build   # emits webui/build
```

`MOX_BASE_PATH` is the mount path segment (`account` → `/account`). It accepts
`account`, `/account`, or a Windows path (the last segment is used). Use an empty
value to build for serving at the domain root.

Type-check:

```sh
npm run check
```

## Base path

`paths.base` is applied at build time, so asset URLs become
`/account/_app/...` and SvelteKit's runtime `base` is `/account`. `base.ts`
uses that to call `/account/api/...` and `/account/events`, independent of the
current route (e.g. `/account/password`).

Limitation: because the base is baked in at build time, the build must match the
configured mount path. If you need a single build that works at any mount path,
the next step is to inject the base at serve time (rewrite `/_app/` prefixes and
the `__sveltekit_*.base` value in `index.html`), or use `paths.relative`.

## Development

```sh
MOX_DEV_API=http://localhost:1080 npm run dev
```

The Vite dev server proxies `/api`, `/events`, `/import`, `/importprogress` and
`/export` to `MOX_DEV_API`. Point it at a running mox instance whose account
service is reachable at the same paths.

## Build and integration

The reusable server-side handler is `mox.WebappStatic`
(`mox-/webappstatic.go`, tested in `mox-/webappstatic_test.go`). It serves an
`fs.FS`, answers unknown paths with the SPA fallback, uses immutable caching for
hashed assets and `no-cache` for the shell.

The built SPA is embedded in the binary via `webui/embed.go`
(`//go:embed all:build`), so nothing is read from disk at runtime. `webaccount`
serves it for `/` and client routes (`/account/password`, ...), while
`/api/...`, `/export`, `/import` and `/importprogress` keep their behavior.

`webui/build` is committed (like the generated `webmail.js` etc.), so a plain
`go build` works. After changing frontend sources, rebuild it:

```sh
cd webui && MOX_BASE_PATH=account npm run build
```

`make frontend` also rebuilds it when sources are newer, and `make` then embeds
it. The build must use `MOX_BASE_PATH` matching the mount path (`account` →
`/account`).

## Status

Ported to Svelte (working against the existing API). The account app is
feature-complete:

- Login/logout, persistent sidebar with the active section highlighted.
- Overview: account info, full name, addresses (linking to destination pages),
  aliases/lists, disk usage, recent login attempts.
- Password (change + generate when custom passwords are disabled).
- Login attempts (recent and all).
- TLS public keys (list, add via PEM upload, update, remove).
- Automatic junk flags, junk filter, introbox, rejects, keep-retired, FromID
  login addresses, suppression list, IMAP capabilities.
- Webhooks (outgoing/incoming save + test with editable JSON payloads).
- Export (Maildir/Mbox + Tar/Tgz/Zip) and Import (upload with progress + SSE).
- Destination detail pages with a ruleset editor and mobileconfig profile links.

`src/lib/api.ts` is a copy of the generated `webaccount/api.ts`. Regenerate with
`./gents.sh webaccount/api.json webui/src/lib/api.ts` when the API changes.

## Sharing across apps

For admin and webmail, either extract `src/lib` into a workspace package (e.g.
`webui/packages/ui`) imported by each app project, or keep one SvelteKit project
per app and reuse `src/lib` (the components, theme, client, auth, storage and
format helpers are app-agnostic).
