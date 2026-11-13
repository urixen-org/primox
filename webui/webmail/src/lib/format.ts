import type { Domain, Message, MessageAddress, MessageItem } from './api'
import { Validation } from './api'

export const formatDomain = (d: Domain): string => d.Unicode || d.ASCII

export const formatEmail = (a: MessageAddress): string => a.User + '@' + formatDomain(a.Domain)

const displayName = (s: string): string => {
	// ../rfc/5322:1216 ../rfc/5322:1270
	if (/[()<>\[\]:;@\\,."]/.test(s)) {
		return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"'
	}
	return s
}

// formatAddress formats an address with both name and email address.
export const formatAddress = (a: MessageAddress): string => {
	const email = '<' + a.User + '@' + formatDomain(a.Domain) + '>'
	return a.Name ? displayName(a.Name) + ' ' + email : email
}

export const formatAddressList = (l: MessageAddress[] | null | undefined): string =>
	(l || []).map(formatAddress).join(', ')

// senderName returns a short display name for a message list row.
export const senderName = (a: MessageAddress): string => {
	const n = a.Name
	if (n && !n.includes('<') && !n.includes('@') && !n.includes('>')) {
		return n
	}
	return a.User + '@' + formatDomain(a.Domain)
}

export const messageFrom = (mi: MessageItem): string => {
	const l = mi.Envelope.From || []
	if (l.length === 0) {
		return '(no sender)'
	}
	const names = l.slice(0, 3).map(senderName).join(', ')
	return names + (l.length > 3 ? ', ...' : '')
}

export const messageFromFull = (mi: MessageItem): string => {
	const l = mi.Envelope.From || []
	return l.length === 0 ? '(no sender)' : l.map(formatAddress).join(', ')
}

export const equalAddress = (a: MessageAddress, b: MessageAddress): boolean =>
	(!a.User || !b.User || a.User === b.User) && a.Domain.ASCII === b.Domain.ASCII

export const addressIn = (l: MessageAddress[], a: MessageAddress): boolean => l.some((e) => equalAddress(e, a))

// validationText describes how well the message From domain was validated.
export const validationText = (m: Message): string | null => {
	switch (m.MsgFromValidation) {
		case Validation.ValidationStrict:
			return 'strict DMARC'
		case Validation.ValidationDMARC:
			return 'DMARC'
		case Validation.ValidationRelaxed:
			return 'relaxed DMARC'
		case Validation.ValidationNone:
			return m.IsForward || m.IsMailingList ? 'forwarded/list' : 'no DMARC'
		default:
			return null
	}
}

// pathString turns an attachment path into the path segment used by the
// download/view endpoints, e.g. [0, 2, 1] -> "0.2.1".
export const pathString = (p: number[] | null | undefined): string =>
	p && p.length > 0 ? p.join('.') : '0'
