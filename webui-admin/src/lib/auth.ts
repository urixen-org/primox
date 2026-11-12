import { writable } from 'svelte/store'
import { Client } from './api'
import { apiBaseURL } from './base'
import { storage } from './storage'

export const CSRF_TOKEN_KEY = 'webadmincsrftoken'

export type LoginRequest = {
	reason: string
	resolve: (token: string) => void
	reject: (err: unknown) => void
}

export const loginRequest = writable<LoginRequest | null>(null)

export const login = (reason: string): Promise<string> => {
	return new Promise<string>((resolve, reject) => {
		loginRequest.set({ reason, resolve, reject })
	})
}

// submitLogin performs the admin login (password only) and persists the token.
export const submitLogin = async (password: string): Promise<string> => {
	const c = new Client().withOptions({ baseURL: apiBaseURL })
	const prep = await c.LoginPrep()
	const token = await c.Login(prep, password)
	storage.set(CSRF_TOKEN_KEY, token)
	return token
}

export const logout = (): void => {
	storage.remove(CSRF_TOKEN_KEY)
	window.location.reload()
}
