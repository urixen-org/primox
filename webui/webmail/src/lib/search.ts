import { AttachmentType, type Filter, type Mailbox, type NotFilter } from './api'

// Parse size as used in minsize: and maxsize: in the search bar.
const parseSearchSize = (s: string): [string, number] => {
	s = s.trim()
	if (!s) {
		return ['', 0]
	}
	const digits = s.match(/^([0-9]+)/)?.[1]
	if (!digits) {
		return ['', 0]
	}
	const num = parseInt(digits)
	if (isNaN(num)) {
		return ['', 0]
	}
	const suffix = s.substring(digits.length).trim().toLowerCase()
	if (['b', 'kb', 'mb', 'gb'].includes(suffix)) {
		return [digits + suffix, num * Math.pow(2, 10 * ['b', 'kb', 'mb', 'gb'].indexOf(suffix))]
	}
	if (['k', 'm', 'g'].includes(suffix)) {
		return [digits + suffix + 'b', num * Math.pow(2, 10 * (1 + ['k', 'm', 'g'].indexOf(suffix)))]
	}
	return ['', 0]
}

// JS date does not allow months and days as single digit, it requires a 0
// prefix in those cases, so fix up such dates.
const fixDate = (dt: string): string => {
	const t = dt.split('-')
	if (t.length !== 3) {
		return dt
	}
	if (t[1].length === 1) {
		t[1] = '0' + t[1]
	}
	if (t[2].length === 1) {
		t[2] = '0' + t[2]
	}
	return t.join('-')
}

// Parse date and/or time, for use with start: and end:.
const parseSearchDateTime = (s: string, isstart: boolean): string | undefined => {
	const t = s.split('T', 2)
	if (t.length === 2) {
		const d = new Date(fixDate(t[0]) + 'T' + t[1])
		return d ? d.toJSON() : undefined
	} else if (t.length === 1) {
		const fds = fixDate(t[0])
		if (!isNaN(Date.parse(fds))) {
			const d = new Date(fds)
			if (!isstart) {
				d.setDate(d.getDate() + 1)
			}
			return d.toJSON()
		} else {
			const tm = t[0]
			const now = new Date()
			const pad0 = (v: number) => (v <= 9 ? '0' + v : '' + v)
			const d = new Date([now.getFullYear(), pad0(now.getMonth() + 1), pad0(now.getDate())].join('-') + 'T' + tm)
			return d ? d.toJSON() : undefined
		}
	}
	return undefined
}

// A token has a minus prefix ("not" match), a tag (e.g. "minsize" in
// "minsize:1m"), a string, and whether the string was quoted.
type Token = [boolean, string, boolean, string]

const dquote = (s: string): string => '"' + s.replaceAll('"', '""') + '"'
const needsDquote = (s: string): boolean => /[ \t"]/.test(s)
export const packToken = (t: Token): string => (t[0] ? '-' : '') + (t[1] ? t[1] + ':' : '') + (t[2] || needsDquote(t[3]) ? dquote(t[3]) : t[3])

// Parse the text from the search input into tokens. All input is valid.
export const parseSearchTokens = (s: string): Token[] => {
	if (!s) {
		return []
	}
	const l: Token[] = []

	let not = false
	let quoted = false
	let quoteend = false
	let t = ''
	let tquoted = false
	const add = () => {
		if (t && (tquoted || !t.includes(':'))) {
			l.push([not, '', tquoted, t])
		} else if (t) {
			const tag = t.split(':', 1)[0]
			l.push([not, tag, tquoted, t.substring(tag.length + 1)])
		}
		t = ''
		quoted = false
		quoteend = false
		tquoted = false
		not = false
	}
	;[...s].forEach((c) => {
		if (quoteend) {
			if (c === '"') {
				t += '"'
				quoteend = false
			} else if (t) {
				add()
			}
		} else if (quoted && c === '"') {
			quoteend = true
		} else if (c === '"') {
			quoted = true
			if (!t) {
				tquoted = true
			}
		} else if (!quoted && (c === ' ' || c === '\t')) {
			add()
		} else if (c === '-' && !t && !tquoted && !not) {
			not = true
		} else {
			t += c
		}
	})
	add()
	return l
}

// returns a filter with empty/zero required fields.
export const newFilter = (): Filter => {
	return {
		MailboxID: 0,
		MailboxChildrenIncluded: false,
		MailboxName: '',
		Attachments: AttachmentType.AttachmentIndifferent,
		SizeMin: 0,
		SizeMax: 0,
	}
}

export const newNotFilter = (): NotFilter => {
	return {
		Attachments: AttachmentType.AttachmentIndifferent,
	}
}

// We keep the original strings typed in by the user, we don't send them to the
// backend, so we keep them separately from Filter.
export type FilterStrs = {
	Oldest: string
	Newest: string
	SizeMin: string
	SizeMax: string
}

export type MailboxLookup = (name: string) => Mailbox | null

// Parse search bar into filters that we can use to send to the server.
export const parseSearch = (searchquery: string, findMailbox: MailboxLookup): [Filter, NotFilter, FilterStrs] => {
	const tokens = parseSearchTokens(searchquery)

	const fpos = newFilter()
	fpos.MailboxID = -1 // All mailboxes excluding Trash/Junk/Rejects.
	const notf = newNotFilter()
	const strs = { Oldest: '', Newest: '', SizeMin: '', SizeMax: '' }
	tokens.forEach((t) => {
		const [not, tag, , s] = t
		const f = not ? notf : fpos

		if (!not) {
			if (tag === 'mb' || tag === 'mailbox') {
				const mb = findMailbox(s)
				if (mb) {
					fpos.MailboxID = mb.ID
				} else if (s === '') {
					fpos.MailboxID = 0 // All mailboxes, including Trash/Junk/Rejects.
				} else {
					fpos.MailboxName = s
					fpos.MailboxID = 0
				}
				return
			} else if (tag === 'submb') {
				fpos.MailboxChildrenIncluded = true
				return
			} else if (tag === 'start') {
				const dt = parseSearchDateTime(s, true)
				if (dt) {
					fpos.Oldest = new Date(dt)
					strs.Oldest = s
					return
				}
			} else if (tag === 'end') {
				const dt = parseSearchDateTime(s, false)
				if (dt) {
					fpos.Newest = new Date(dt)
					strs.Newest = s
					return
				}
			} else if (tag === 'a' || tag === 'attachments') {
				if (s === 'none' || s === 'any' || s === 'image' || s === 'pdf' || s === 'archive' || s === 'zip' || s === 'spreadsheet' || s === 'document' || s === 'presentation') {
					fpos.Attachments = s as AttachmentType
					return
				}
			} else if (tag === 'h' || tag === 'header') {
				const k = s.split(':')[0]
				const v = s.substring(k.length + 1)
				if (!fpos.Headers) {
					fpos.Headers = [[k, v]]
				} else {
					fpos.Headers.push([k, v])
				}
				return
			} else if (tag === 'minsize') {
				const [str, size] = parseSearchSize(s)
				if (str) {
					fpos.SizeMin = size
					strs.SizeMin = str
					return
				}
			} else if (tag === 'maxsize') {
				const [str, size] = parseSearchSize(s)
				if (str) {
					fpos.SizeMax = size
					strs.SizeMax = str
					return
				}
			}
		}
		if (tag === 'f' || tag === 'from') {
			f.From = f.From || []
			f.From.push(s)
			return
		} else if (tag === 't' || tag === 'to') {
			f.To = f.To || []
			f.To.push(s)
			return
		} else if (tag === 's' || tag === 'subject') {
			f.Subject = f.Subject || []
			f.Subject.push(s)
			return
		} else if (tag === 'l' || tag === 'label') {
			f.Labels = f.Labels || []
			f.Labels.push(s)
			return
		}
		f.Words = f.Words || []
		f.Words.push((tag ? tag + ':' : '') + s)
	})
	return [fpos, notf, strs]
}

// Turn filters from the search bar into filters with the refine filters (quick
// filters above the message list) applied. The original filters are not
// modified.
export const refineFilters = (f: Filter, notf: NotFilter, refine: string): [Filter, NotFilter] => {
	if (refine) {
		f = { ...f }
		notf = { ...notf }
		if (refine === 'unread') {
			notf.Labels = [...(notf.Labels || []), '\\Seen']
		} else if (refine === 'read') {
			f.Labels = [...(f.Labels || []), '\\Seen']
		} else if (refine === 'attachments') {
			f.Attachments = AttachmentType.AttachmentAny
		} else if (refine === 'flagged') {
			f.Labels = [...(f.Labels || []), '\\Flagged']
		} else if (refine.startsWith('label:')) {
			f.Labels = [...(f.Labels || []), refine.substring('label:'.length)]
		}
	}
	return [f, notf]
}
