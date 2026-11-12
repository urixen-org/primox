// Safe localStorage access, which can throw in private/incognito modes.
export const storage = {
	get(k: string): string | null {
		try {
			return window.localStorage.getItem(k)
		} catch {
			return null
		}
	},
	set(k: string, v: string): void {
		try {
			window.localStorage.setItem(k, v)
		} catch {
			// ignore
		}
	},
	remove(k: string): void {
		try {
			window.localStorage.removeItem(k)
		} catch {
			// ignore
		}
	},
}
