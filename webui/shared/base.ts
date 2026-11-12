import { base } from '$app/paths'

// Mount path of the app, e.g. "/account" (empty when served at the root).
export const basePath = base

const origin = typeof location !== 'undefined' ? location.origin : ''

// API endpoint base, always absolute so it works regardless of the current
// SPA route (e.g. /account/password).
export const apiBaseURL = origin + base + '/api/'

// Base for server-side endpoints that live next to the app (e.g. events,
// import, export), not under /api.
export const serverBaseURL = origin + base + '/'

export const serverURL = (path: string): string => serverBaseURL + path.replace(/^\//, '')
