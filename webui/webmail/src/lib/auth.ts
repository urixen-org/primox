import { writable } from 'svelte/store'
import { Client } from './api'
import { apiBaseURL } from '@mox/ui/base'
import { storage } from '@mox/ui/storage'

export const CSRF_TOKEN_KEY = 'webmailcsrftoken'

export type LoginRequest = {
	reason: string
	resolve: (token: string) => void
	reject: (err: unknown) => void
}

// loginRequest is set while the app needs the user to log in. LoginOverlay
// renders the form and resolves it.
export const loginRequest = writable<LoginRequest | null>(null)

// login is passed to the API client. When authentication is required, the
// client calls it and waits for the CSRF token.
export const login = (reason: string): Promise<string> => {
	return new Promise<string>((resolve, reject) => {
		loginRequest.set({ reason, resolve, reject })
	})
}

// submitLogin performs the two-step login and persists the CSRF token.
export const submitLogin = async (address: string, password: string): Promise<string> => {
	const c = new Client().withOptions({ baseURL: apiBaseURL })
	const prep = await c.LoginPrep()
	const token = await c.Login(prep, address, password)
	storage.set(CSRF_TOKEN_KEY, token)
	return token
}

export const logout = (): void => {
	storage.remove(CSRF_TOKEN_KEY)
	// Reload so all in-memory state is cleared.
	window.location.reload()
}
