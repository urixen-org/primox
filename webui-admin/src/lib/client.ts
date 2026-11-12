import { Client } from './api'
import { apiBaseURL } from './base'
import { login, CSRF_TOKEN_KEY } from './auth'
import { storage } from './storage'

export const client = new Client()
	.withOptions({ baseURL: apiBaseURL, csrfHeader: 'x-mox-csrf', login })
	.withAuthToken(storage.get(CSRF_TOKEN_KEY) || '')
