import { derived, get, writable } from 'svelte/store'
import { serverURL } from '@mox/ui/base'
import { errmsg, formatSize } from '@mox/ui/format'
import { storage } from '@mox/ui/storage'
import {
	AttachmentType,
	Quoting,
	ThreadMode,
	ViewMode,
	parser,
	type ComposeMessage,
	type EventViewChanges,
	type EventViewErr,
	type EventViewMsgs,
	type EventViewReset,
	type Filter,
	type Mailbox,
	type MessageAddress,
	type MessageItem,
	type NotFilter,
	type ParsedMessage,
	type Query,
	type Request,
	type Settings,
	type SubmitMessage,
	type File as AttachmentFile,
} from './api'
import { client } from './client'
import { newFilter, newNotFilter, parseSearch, refineFilters } from './search'

// Local UI settings, persisted in localStorage under the same key as the
// legacy app ("settings") so existing preferences keep working.
export type UISettings = {
	orderAsc: boolean
	threading: ThreadMode
	refine: string
	showAllHeaders: boolean
}

const defaultUISettings: UISettings = {
	orderAsc: false,
	threading: ThreadMode.ThreadOn,
	refine: '',
	showAllHeaders: false,
}

const parseUISettings = (): UISettings => {
	try {
		const raw = storage.get('settings')
		if (!raw) {
			return { ...defaultUISettings }
		}
		const v = JSON.parse(raw)
		return {
			orderAsc: typeof v.orderAsc === 'boolean' ? v.orderAsc : defaultUISettings.orderAsc,
			threading:
				v.threading === ThreadMode.ThreadOff ||
				v.threading === ThreadMode.ThreadOn ||
				v.threading === ThreadMode.ThreadUnread
					? v.threading
					: defaultUISettings.threading,
			refine: typeof v.refine === 'string' ? v.refine : defaultUISettings.refine,
			showAllHeaders:
				typeof v.showAllHeaders === 'boolean' ? v.showAllHeaders : defaultUISettings.showAllHeaders,
		}
	} catch {
		return { ...defaultUISettings }
	}
}

export const uiSettings = writable<UISettings>(parseUISettings())
export const setUISettings = (patch: Partial<UISettings>) => {
	uiSettings.update((s) => {
		const next = { ...s, ...patch }
		storage.set('settings', JSON.stringify(next))
		return next
	})
}

// Connection state.
export const connected = writable(false)
export const connectionState = writable<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting')
export const connectionError = writable('')
export const serverVersion = writable('')
export const loginAddress = writable<MessageAddress | null>(null)
export const accountAddresses = writable<MessageAddress[]>([])
export const accountPath = writable('')
export const mailboxes = writable<Mailbox[]>([])
export const accountSettings = writable<Settings | null>(null)

// View state.
export const activeMailboxID = writable<number>(0)
export const searchQuery = writable('')
export const messages = writable<MessageItem[]>([])
export const messagesLoading = writable(false)
export const viewEnd = writable(false)
export const viewError = writable('')
export const selectedIDs = writable<Set<number>>(new Set())
export const activeMessage = writable<MessageItem | null>(null)
export const parsedMessage = writable<ParsedMessage | null>(null)
export const messageLoading = writable(false)
export const messageError = writable('')

// Modal state.
export const showSettings = writable(false)
export const showHelp = writable(false)
export const composeState = writable<ComposeState | null>(null)

export type ComposeAttachment = {
	Filename: string
	DataURI: string
}

export type ComposeState = {
	from: string
	to: string
	cc: string
	bcc: string
	replyTo: string
	subject: string
	text: string
	files: ComposeAttachment[]
	forwardMessageID: number
	forwardPaths: (number[] | null)[]
	isForward: boolean
	responseMessageID: number
	draftMessageID: number
	archiveThread: boolean
	archiveMailboxID: number
	busy: boolean
	error: string
}

let events: EventSource | null = null
let sseID = 0
let viewID = 0
let requestID = 0
let requestSeq = 0
let anchorMessageID = 0
let currentFilter: Filter = newFilter()
let currentNotFilter: NotFilter = newNotFilter()
let pendingMessageID = 0
let pendingEditID = 0
let openSeq = 0
let reconnectTimer = 0
let manualDisconnect = false
let connecting = false

export const findMailboxByID = (id: number): Mailbox | null =>
	get(mailboxes).find((mb) => mb.ID === id) || null

export const findMailboxByName = (name: string): Mailbox | null =>
	get(mailboxes).find((mb) => mb.Name === name) || null

export const specialMailbox = (mb: Mailbox | null): boolean =>
	!!mb && (mb.Archive || mb.Draft || mb.Junk || mb.Sent || mb.Trash)

const emailOf = (a: MessageAddress): string =>
	a.User + '@' + (a.Domain.Unicode || a.Domain.ASCII)

export const loginEmail = (): string => {
	const a = get(loginAddress)
	return a ? emailOf(a) : ''
}

// mailboxRank orders special mailboxes first, like the legacy UI.
export const mailboxRank = (mb: Mailbox): number => {
	if (mb.Name === 'Inbox') return 0
	if (mb.Draft) return 1
	if (mb.Sent) return 2
	if (mb.Archive) return 3
	if (mb.Junk) return 4
	if (mb.Trash) return 5
	return 10
}

export const sortedMailboxes = derived(mailboxes, ($mbs) =>
	[...$mbs].sort((a, b) => {
		const ra = mailboxRank(a)
		const rb = mailboxRank(b)
		if (ra !== rb) return ra - rb
		return a.Name.localeCompare(b.Name)
	}),
)

const buildQuery = (): Query => {
	const [f, notf] = refineFilters(currentFilter, currentNotFilter, get(uiSettings).refine)
	const us = get(uiSettings)
	return {
		OrderAsc: us.orderAsc,
		Threading: us.threading,
		Filter: f,
		NotFilter: notf,
	}
}

const parseHash = (): { search: string; mailbox: string; msgID: number; editID: number } => {
	let hash = decodeURIComponent((window.location.hash || '#').substring(1))
	let editID = 0
	const em = hash.match(/,compose:([0-9]+)$/)
	if (em) {
		editID = parseInt(em[1])
		hash = hash.substring(0, hash.length - em[0].length)
	}
	let msgID = 0
	const mm = hash.match(/,([0-9]+)$/)
	if (mm) {
		msgID = parseInt(mm[1])
		hash = hash.substring(0, hash.length - mm[0].length)
	}
	if (hash.startsWith('search ')) {
		return { search: hash.substring('search '.length).trim(), mailbox: '', msgID, editID }
	}
	return { search: '', mailbox: hash || 'Inbox', msgID, editID }
}

const updateHash = () => {
	const q = get(searchQuery)
	let trail = ''
	const am = get(activeMessage)
	if (am) {
		trail = ',' + am.Message.ID
	}
	let base: string
	if (q) {
		base = 'search ' + q
	} else {
		const mb = findMailboxByID(get(activeMailboxID))
		base = mb ? mb.Name : 'Inbox'
	}
	const url = window.location.pathname + window.location.search + '#' + base + trail
	window.history.replaceState(undefined, '', url)
}

const appendMessageItems = (items: MessageItem[]) => {
	messages.update((cur) => {
		const seen = new Set(cur.map((mi) => mi.Message.ID))
		const add = items.filter((mi) => !seen.has(mi.Message.ID))
		return add.length === 0 ? cur : [...cur, ...add]
	})
}

const patchMessageFlags = (ids: number[], patch: Partial<MessageItem['Message']>) => {
	const idSet = new Set(ids)
	messages.update((cur) =>
		cur.map((mi) =>
			idSet.has(mi.Message.ID) ? { ...mi, Message: { ...mi.Message, ...patch } } : mi,
		),
	)
	activeMessage.update((am) =>
		am && idSet.has(am.Message.ID) ? { ...am, Message: { ...am.Message, ...patch } } : am,
	)
}

const flattenThreads = (items: (MessageItem[] | null)[] | null | undefined): MessageItem[] => {
	const out: MessageItem[] = []
	for (const thread of items || []) {
		if (thread) {
			out.push(...thread)
		}
	}
	return out
}

const resetView = () => {
	messages.set([])
	selectedIDs.set(new Set())
	viewEnd.set(false)
	viewError.set('')
	anchorMessageID = 0
}

const sendRequest = async (destMessageID: number) => {
	if (!sseID) {
		return
	}
	requestSeq++
	requestID = requestSeq
	pendingMessageID = destMessageID
	messagesLoading.set(true)
	const req: Request = {
		ID: requestID,
		SSEID: sseID,
		ViewID: viewID,
		Cancel: false,
		Query: buildQuery(),
		Page: {
			AnchorMessageID: anchorMessageID,
			Count: 100,
			DestMessageID: destMessageID,
		},
	}
	try {
		await client.Request(req)
	} catch (err) {
		messagesLoading.set(false)
		viewError.set(errmsg(err))
	}
}

export const requestNewView = async (destMessageID = 0) => {
	if (!sseID) {
		return
	}
	viewID++
	resetView()
	await sendRequest(destMessageID)
}

export const openMailbox = async (mb: Mailbox | null, name = 'Inbox', destMessageID = 0) => {
	activeMessage.set(null)
	parsedMessage.set(null)
	messageError.set('')
	searchQuery.set('')
	activeMailboxID.set(mb ? mb.ID : 0)
	currentFilter = newFilter()
	currentFilter.MailboxID = mb ? mb.ID : 0
	currentFilter.MailboxName = mb ? mb.Name : name
	currentNotFilter = newNotFilter()
	updateHash()
	await requestNewView(destMessageID)
}

export const openMailboxByName = async (name: string, destMessageID = 0) => {
	const mb = findMailboxByName(name)
	await openMailbox(mb, name, destMessageID)
}

export const search = async (q: string, destMessageID = 0) => {
	const query = q.trim()
	activeMessage.set(null)
	parsedMessage.set(null)
	messageError.set('')
	if (!query) {
		await openMailboxByName('Inbox', destMessageID)
		return
	}
	const [f, notf] = parseSearch(query, findMailboxByName)
	currentFilter = f
	currentNotFilter = notf
	searchQuery.set(query)
	activeMailboxID.set(f.MailboxID > 0 ? f.MailboxID : 0)
	updateHash()
	await requestNewView(destMessageID)
}

export const refreshView = async () => {
	await requestNewView()
}

// applyLocationHash applies the mailbox/search encoded in the URL hash, e.g.
// after browser back/forward navigation.
export const applyLocationHash = async () => {
	const h = parseHash()
	if (h.search) {
		await search(h.search, h.msgID)
	} else {
		await openMailboxByName(h.mailbox, h.msgID)
	}
	if (h.editID) {
		await findDraftByID(h.editID)
	}
}

export const loadMore = async () => {
	if (get(viewEnd) || get(messagesLoading)) {
		return
	}
	await sendRequest(0)
}

export const setRefine = async (refine: string) => {
	setUISettings({ refine })
	await requestNewView()
}

// --- SSE connection ---

const dropConnection = () => {
	if (events) {
		events.close()
		events = null
	}
	sseID = 0
	connected.set(false)
}

const scheduleReconnect = () => {
	if (manualDisconnect || reconnectTimer) {
		return
	}
	reconnectTimer = window.setTimeout(() => {
		reconnectTimer = 0
		if (!manualDisconnect && !events) {
			void connect()
		}
	}, 3000)
}

const handleStart = (data: any) => {
	const start = parser.EventStart(data)
	sseID = start.SSEID
	serverVersion.set(start.Version)
	accountPath.set(start.AccountPath)
	loginAddress.set(start.LoginAddress)
	accountAddresses.set(
		[...(start.Addresses || [])].sort((a, b) =>
			emailOf(a).localeCompare(emailOf(b)),
		),
	)
	accountSettings.set(start.Settings)
	mailboxes.set(start.Mailboxes || [])
	connected.set(true)
	connectionState.set('connected')
	connectionError.set('')

	// Determine the active mailbox from the pending filter.
	let mb: Mailbox | null = null
	if (currentFilter.MailboxID > 0) {
		mb = (start.Mailboxes || []).find((m) => m.ID === currentFilter.MailboxID) || null
	}
	if (!mb && currentFilter.MailboxName) {
		mb = (start.Mailboxes || []).find((m) => m.Name === currentFilter.MailboxName) || null
	}
	if (mb) {
		activeMailboxID.set(mb.ID)
		currentFilter.MailboxID = mb.ID
	}
	if (start.MailboxName) {
		const smb = (start.Mailboxes || []).find((m) => m.Name === start.MailboxName)
		if (smb && !get(searchQuery)) {
			activeMailboxID.set(smb.ID)
		}
	}

	if (pendingEditID) {
		const id = pendingEditID
		pendingEditID = 0
		void findDraftByID(id)
	}
}

const handleViewMsgs = (vm: EventViewMsgs) => {
	if (vm.ViewID !== viewID || vm.RequestID !== requestID) {
		return
	}
	const items = flattenThreads(vm.MessageItems)
	if (items.length > 0) {
		appendMessageItems(items)
		const last = vm.MessageItems![vm.MessageItems!.length - 1]
		if (last && last[0]) {
			anchorMessageID = last[0].Message.ID
		}
	}
	if (vm.ParsedMessage) {
		parsedMessage.set(vm.ParsedMessage)
		const found = get(messages).find((mi) => mi.Message.ID === vm.ParsedMessage!.ID)
		if (found) {
			activeMessage.set(found)
		} else {
			void client.MessageItem(vm.ParsedMessage.ID).then((mi) => activeMessage.set(mi)).catch(() => undefined)
		}
	}
	if (vm.ViewEnd) {
		viewEnd.set(true)
	}
	if (items.length === 0 || vm.ViewEnd) {
		messagesLoading.set(false)
		requestID = 0
		pendingMessageID = 0
	}
}

const updateMailbox = (id: number, fn: (mb: Mailbox) => Mailbox) => {
	mailboxes.update((mbs) => mbs.map((mb) => (mb.ID === id ? fn(mb) : mb)))
}

const removeMessagesFromView = (msgIDs: number[], uids: number[], mailboxID: number) => {
	const ids = new Set(msgIDs)
	const uidSet = new Set(uids)
	messages.update((cur) =>
		cur.filter(
			(mi) =>
				!ids.has(mi.Message.ID) &&
				!(mi.Message.MailboxID === mailboxID && uidSet.has(mi.Message.UID)),
		),
	)
	const am = get(activeMessage)
	if (am && ids.has(am.Message.ID)) {
		activeMessage.set(null)
		parsedMessage.set(null)
	}
	selectedIDs.update((s) => {
		const next = new Set(s)
		for (const id of ids) next.delete(id)
		return next
	})
}

const handleChanges = (vc: EventViewChanges) => {
	if (vc.ViewID !== viewID) {
		return
	}
	for (const tc of vc.Changes || []) {
		if (!tc) {
			continue
		}
		const [tag, raw] = tc
		try {
			if (tag === 'ChangeMailboxCounts') {
				const c = parser.ChangeMailboxCounts(raw)
				updateMailbox(c.MailboxID, (mb) => ({
					...mb,
					Total: c.Total,
					Deleted: c.Deleted,
					Unread: c.Unread,
					Unseen: c.Unseen,
					Size: c.Size,
				}))
			} else if (tag === 'ChangeMailboxSpecialUse') {
				const c = parser.ChangeMailboxSpecialUse(raw)
				updateMailbox(c.MailboxID, (mb) => ({ ...mb, ...c.SpecialUse }))
			} else if (tag === 'ChangeMailboxKeywords') {
				const c = parser.ChangeMailboxKeywords(raw)
				updateMailbox(c.MailboxID, (mb) => ({ ...mb, Keywords: c.Keywords || [] }))
			} else if (tag === 'ChangeMsgAdd') {
				const c = parser.ChangeMsgAdd(raw)
				appendMessageItems(c.MessageItems || [])
			} else if (tag === 'ChangeMsgRemove') {
				const c = parser.ChangeMsgRemove(raw)
				removeMessagesFromView(c.MsgIDs || [], c.UIDs || [], c.MailboxID)
			} else if (tag === 'ChangeMsgFlags') {
				const c = parser.ChangeMsgFlags(raw)
				messages.update((cur) =>
					cur.map((mi) => {
						if (mi.Message.MailboxID !== c.MailboxID || mi.Message.UID !== c.UID) {
							return mi
						}
						return {
							...mi,
							Message: {
								...mi.Message,
								Seen: c.Flags.Seen,
								Answered: c.Flags.Answered,
								Flagged: c.Flags.Flagged,
								Forwarded: c.Flags.Forwarded,
								Junk: c.Flags.Junk,
								Notjunk: c.Flags.Notjunk,
								Deleted: c.Flags.Deleted,
								Draft: c.Flags.Draft,
								Phishing: c.Flags.Phishing,
								MDNSent: c.Flags.MDNSent,
								Keywords: c.Keywords || [],
							},
						}
					}),
				)
				activeMessage.update((am) => {
					if (!am || am.Message.MailboxID !== c.MailboxID || am.Message.UID !== c.UID) {
						return am
					}
					return {
						...am,
						Message: {
							...am.Message,
							Seen: c.Flags.Seen,
							Answered: c.Flags.Answered,
							Flagged: c.Flags.Flagged,
							Forwarded: c.Flags.Forwarded,
							Junk: c.Flags.Junk,
							Notjunk: c.Flags.Notjunk,
							Deleted: c.Flags.Deleted,
							Draft: c.Flags.Draft,
							Phishing: c.Flags.Phishing,
							MDNSent: c.Flags.MDNSent,
							Keywords: c.Keywords || [],
						},
					}
				})
			} else if (tag === 'ChangeMsgThread') {
				const c = parser.ChangeMsgThread(raw)
				const ids = new Set(c.MessageIDs || [])
				messages.update((cur) =>
					cur.map((mi) =>
						ids.has(mi.Message.ID)
							? {
									...mi,
									Message: {
										...mi.Message,
										ThreadMuted: c.Muted,
										ThreadCollapsed: c.Collapsed,
									},
								}
							: mi,
					),
				)
				activeMessage.update((am) =>
					am && ids.has(am.Message.ID)
						? {
								...am,
								Message: {
									...am.Message,
									ThreadMuted: c.Muted,
									ThreadCollapsed: c.Collapsed,
								},
							}
						: am,
				)
			} else if (tag === 'ChangeMailboxRemove') {
				const c = parser.ChangeMailboxRemove(raw)
				mailboxes.update((mbs) => mbs.filter((mb) => mb.ID !== c.MailboxID))
			} else if (tag === 'ChangeMailboxAdd') {
				const c = parser.ChangeMailboxAdd(raw)
				mailboxes.update((mbs) => [...mbs.filter((mb) => mb.ID !== c.Mailbox.ID), c.Mailbox])
			} else if (tag === 'ChangeMailboxRename') {
				const c = parser.ChangeMailboxRename(raw)
				updateMailbox(c.MailboxID, (mb) => ({ ...mb, Name: c.NewName }))
			}
		} catch (err) {
			console.error('webmail: parsing SSE change', tag, err)
		}
	}
}

export const connect = async () => {
	if (connecting || events) {
		return
	}
	connecting = true
	manualDisconnect = false
	connectionState.set('connecting')
	connectionError.set('')

	let token: string
	try {
		token = await client.Token()
	} catch (err) {
		connecting = false
		connectionState.set('failed')
		connectionError.set(errmsg(err))
		return
	}
	if (manualDisconnect) {
		connecting = false
		return
	}

	const h = parseHash()
	if (!get(searchQuery) && !get(mailboxes).length) {
		if (h.search) {
			const [f, notf] = parseSearch(h.search, findMailboxByName)
			currentFilter = f
			currentNotFilter = notf
			searchQuery.set(h.search)
		} else {
			const mb = findMailboxByName(h.mailbox)
			currentFilter = newFilter()
			currentFilter.MailboxID = mb ? mb.ID : 0
			currentFilter.MailboxName = mb ? mb.Name : h.mailbox
			currentNotFilter = newNotFilter()
			activeMailboxID.set(mb ? mb.ID : 0)
		}
	}
	pendingMessageID = h.msgID
	pendingEditID = h.editID
	viewID++
	resetView()
	messagesLoading.set(true)

	requestSeq++
	requestID = requestSeq
	const req: Request = {
		ID: requestID,
		SSEID: 0,
		ViewID: viewID,
		Cancel: false,
		Query: buildQuery(),
		Page: {
			AnchorMessageID: 0,
			Count: 100,
			DestMessageID: h.msgID,
		},
	}

	const url =
		serverURL('events') +
		'?singleUseToken=' +
		encodeURIComponent(token) +
		'&request=' +
		encodeURIComponent(JSON.stringify(req))

	try {
		events = new EventSource(url)
	} catch (err) {
		connecting = false
		connectionState.set('failed')
		connectionError.set(errmsg(err))
		return
	}
	const es = events

	es.addEventListener('open', () => {
		connecting = false
	})
	es.addEventListener('start', (e: MessageEvent) => {
		connecting = false
		try {
			handleStart(JSON.parse(e.data))
		} catch (err) {
			connectionError.set('invalid start event: ' + errmsg(err))
			connectionState.set('failed')
		}
	})
	es.addEventListener('viewMsgs', (e: MessageEvent) => {
		try {
			handleViewMsgs(parser.EventViewMsgs(JSON.parse(e.data)))
		} catch (err) {
			console.error('webmail: viewMsgs', err)
		}
	})
	es.addEventListener('viewChanges', (e: MessageEvent) => {
		try {
			handleChanges(parser.EventViewChanges(JSON.parse(e.data)))
		} catch (err) {
			console.error('webmail: viewChanges', err)
		}
	})
	es.addEventListener('viewErr', (e: MessageEvent) => {
		const ve = parser.EventViewErr(JSON.parse(e.data))
		if (ve.ViewID === viewID && (ve.RequestID === requestID || requestID === 0)) {
			messagesLoading.set(false)
			viewError.set(ve.Err)
		}
	})
	es.addEventListener('viewReset', (e: MessageEvent) => {
		const vr = parser.EventViewReset(JSON.parse(e.data))
		if (vr.ViewID === viewID) {
			resetView()
			void sendRequest(pendingMessageID)
		}
	})
	es.addEventListener('fatalErr', (e: MessageEvent) => {
		let msg = 'server error'
		try {
			msg = JSON.parse(e.data) || msg
		} catch {
			// keep default
		}
		connectionError.set(msg)
		connectionState.set('failed')
		connecting = false
		dropConnection()
	})
	es.addEventListener('serverShutdown', () => {
		connectionError.set('server is shutting down, reconnecting...')
		connecting = false
		dropConnection()
		scheduleReconnect()
	})
	es.addEventListener('error', () => {
		connecting = false
		connectionState.set('disconnected')
		connectionError.set('connection lost')
		dropConnection()
		scheduleReconnect()
	})
}

export const disconnect = () => {
	manualDisconnect = true
	if (reconnectTimer) {
		clearTimeout(reconnectTimer)
		reconnectTimer = 0
	}
	dropConnection()
}

export const reconnect = async () => {
	if (reconnectTimer) {
		clearTimeout(reconnectTimer)
		reconnectTimer = 0
	}
	manualDisconnect = false
	dropConnection()
	await connect()
}

export const openMessage = async (mi: MessageItem) => {
	const seq = ++openSeq
	activeMessage.set(mi)
	parsedMessage.set(null)
	messageError.set('')
  messageLoading.set(true)
	
	updateHash()
	try {
    const pm = await client.ParsedMessage(mi.Message.ID)
		
		if (seq === openSeq) {
      parsedMessage.set(pm)
			
		}
  } catch (err) {
   
		if (seq === openSeq) {
			messageError.set(errmsg(err))
		}
	} finally {
		if (seq === openSeq) {
      messageLoading.set(false)
		}
	}
	if (seq !== openSeq) {
		return
	}

	const mb = findMailboxByID(mi.Message.MailboxID)
	try {
		if (!mi.Message.Seen) {
			await client.FlagsAdd([mi.Message.ID], ['\\seen'])
			if (seq === openSeq) patchMessageFlags([mi.Message.ID], { Seen: true })
		}
		if (!specialMailbox(mb) && !mi.Message.Junk && !mi.Message.Notjunk) {
			await client.FlagsAdd([mi.Message.ID], ['$notjunk'])
			if (seq === openSeq) patchMessageFlags([mi.Message.ID], { Notjunk: true })
		}
	} catch (err) {
		console.error('webmail: marking message read/not junk', err)
	}
}

export const closeMessage = () => {
	openSeq++
	activeMessage.set(null)
	parsedMessage.set(null)
	messageError.set('')
	updateHash()
}

export const markRead = async (ids: number[], read: boolean) => {
	if (ids.length === 0) return
	try {
		if (read) {
			await client.FlagsAdd(ids, ['\\seen'])
			patchMessageFlags(ids, { Seen: true })
		} else {
			await client.FlagsClear(ids, ['\\seen', '$junk', '$notjunk'])
			patchMessageFlags(ids, { Seen: false, Junk: false, Notjunk: false })
		}
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const markFlagged = async (ids: number[], flagged: boolean) => {
	if (ids.length === 0) return
	try {
		if (flagged) {
			await client.FlagsAdd(ids, ['\\flagged'])
		} else {
			await client.FlagsClear(ids, ['\\flagged'])
		}
		patchMessageFlags(ids, { Flagged: flagged })
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const markJunk = async (ids: number[], junk: boolean) => {
	if (ids.length === 0) return
	try {
		if (junk) {
			await client.FlagsAdd(ids, ['$junk'])
			patchMessageFlags(ids, { Junk: true, Notjunk: false })
		} else {
			await client.FlagsAdd(ids, ['$notjunk'])
			await client.FlagsClear(ids, ['$junk'])
			patchMessageFlags(ids, { Junk: false, Notjunk: true })
		}
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const moveMessages = async (ids: number[], mailboxID: number) => {
	if (ids.length === 0) return
	// Skip messages that are already in the destination mailbox: the API returns
	// an error for those, and selecting mixed messages should still move the rest.
	const mailboxOf = new Map<number, number>()
	for (const mi of get(messages)) mailboxOf.set(mi.Message.ID, mi.Message.MailboxID)
	const am = get(activeMessage)
	if (am) mailboxOf.set(am.Message.ID, am.Message.MailboxID)
	ids = ids.filter((id) => mailboxOf.get(id) !== mailboxID)
	if (ids.length === 0) return
	try {
		await client.MessageMove(ids, mailboxID, false)
		if (get(activeMessage) && ids.includes(get(activeMessage)!.Message.ID)) {
			activeMessage.set(null)
			parsedMessage.set(null)
		}
		selectedIDs.set(new Set())
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const deleteMessages = async (ids: number[]) => {
	if (ids.length === 0) return
	const mb = findMailboxByID(get(activeMailboxID))
	const trash = get(mailboxes).find((m) => m.Trash)
	try {
		if (trash && (!mb || mb.ID !== trash.ID)) {
			await client.MessageMove(ids, trash.ID, false)
		} else {
			await client.MessageDelete(ids)
		}
		if (get(activeMessage) && ids.includes(get(activeMessage)!.Message.ID)) {
			activeMessage.set(null)
			parsedMessage.set(null)
		}
		selectedIDs.set(new Set())
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const markMailboxRead = async (mb: Mailbox) => {
	try {
		await client.MailboxesMarkRead([mb.ID])
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const createMailbox = async (name: string) => {
	name = name.trim()
	if (!name) return
	try {
		await client.MailboxCreate(name)
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const renameMailbox = async (mb: Mailbox, name: string) => {
	name = name.trim()
	if (!name || name === mb.Name) return
	try {
		await client.MailboxRename(mb.ID, name)
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const deleteMailbox = async (mb: Mailbox) => {
	if (!window.confirm('Delete mailbox "' + mb.Name + '" and all its messages?')) {
		return
	}
	try {
		await client.MailboxDelete(mb.ID)
		if (get(activeMailboxID) === mb.ID) {
			await openMailboxByName('Inbox')
		}
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const emptyMailbox = async (mb: Mailbox) => {
	if (!window.confirm('Remove all messages from "' + mb.Name + '"?')) {
		return
	}
	try {
		await client.MailboxEmpty(mb.ID)
	} catch (err) {
		viewError.set(errmsg(err))
	}
}

export const saveSettings = async (settings: Settings) => {
	try {
		await client.SettingsSave(settings)
		accountSettings.set(settings)
	} catch (err) {
		throw err
	}
}

// --- Compose ---

const splitAddresses = (s: string): string[] =>
	s
		.split(/[,;]/)
		.map((v) => v.trim())
		.filter((v) => !!v)

const quoteText = (pm: ParsedMessage | null): string => {
	if (!pm || !pm.Texts || pm.Texts.length === 0) {
		return ''
	}
	return pm.Texts.map((t) =>
		t
			.split(/\r?\n/)
			.map((line) => '> ' + line)
			.join('\n'),
	).join('\n\n')
}

const replySubject = (subject: string): string =>
	/^re:/i.test(subject.trim()) ? subject : 'Re: ' + subject

const forwardSubject = (subject: string): string =>
	/^fwd?:/i.test(subject.trim()) ? subject : 'Fwd: ' + subject

const signature = (): string => {
	const s = get(accountSettings)
	if (!s || !s.Signature) {
		return ''
	}
	return '\n\n-- \n' + s.Signature
}

// replyFromAddress picks the account address that received the message, so a
// reply comes from the same address (relevant for aliases), falling back to the
// login address.
const replyFromAddress = (mi: MessageItem): string => {
	const known = new Set([loginEmail(), ...get(accountAddresses).map(emailOf)])
	const a = (mi.Envelope.To || []).find((a) => known.has(emailOf(a)))
	return a ? emailOf(a) : loginEmail()
}

const newComposeState = (partial: Partial<ComposeState>): ComposeState => ({
	from: loginEmail(),
	to: '',
	cc: '',
	bcc: '',
	replyTo: '',
	subject: '',
	text: '',
	files: [],
	forwardMessageID: 0,
	forwardPaths: [],
	isForward: false,
	responseMessageID: 0,
	draftMessageID: 0,
	archiveThread: false,
	archiveMailboxID: 0,
	busy: false,
	error: '',
	...partial,
})

export const updateCompose = (patch: Partial<ComposeState>) => {
	composeState.update((c) => (c ? { ...c, ...patch } : c))
}

export const composeNew = () => {
	composeState.set(newComposeState({ text: signature() }))
}

export const composeReply = (mi: MessageItem, pm: ParsedMessage | null, all: boolean) => {
	const env = mi.Envelope
	const self = loginEmail()
	const recipients: MessageAddress[] = []
	for (const a of env.ReplyTo || []) recipients.push(a)
	if (recipients.length === 0) {
		for (const a of env.From || []) recipients.push(a)
	}
	const to = recipients.map((a) => (a.Name ? `${a.Name} <${emailOf(a)}>` : emailOf(a)))
	if (all) {
		for (const a of env.To || []) {
			if (emailOf(a) !== self) to.push(a.Name ? `${a.Name} <${emailOf(a)}>` : emailOf(a))
		}
		for (const a of env.CC || []) {
			if (emailOf(a) !== self) to.push(a.Name ? `${a.Name} <${emailOf(a)}>` : emailOf(a))
		}
	}
	const text = quoteText(pm)
	const quoted = get(accountSettings)?.Quoting
	composeState.set(
		newComposeState({
			from: replyFromAddress(mi),
			to: [...new Set(to)].join(', '),
			subject: replySubject(env.Subject || ''),
			text:
				quoted === Quoting.Bottom
					? '\n\n' + text + signature()
					: signature() + '\n\n' + text,
			responseMessageID: mi.Message.ID,
		}),
	)
}

export const composeForward = (mi: MessageItem, pm: ParsedMessage | null) => {
	const env = mi.Envelope
	const fromText = (env.From || []).map((a) => (a.Name ? `${a.Name} <${emailOf(a)}>` : emailOf(a))).join(', ')
	const body =
		'\n\n---------- Forwarded message ----------\n' +
		'From: ' +
		fromText +
		'\nDate: ' +
		new Date(env.Date).toLocaleString() +
		'\nSubject: ' +
		(env.Subject || '') +
		'\n\n' +
		(pm?.Texts || []).join('\n\n') +
		signature()
	const paths = (mi.Attachments || []).map((a) => a.Path || null)
	composeState.set(
		newComposeState({
			subject: forwardSubject(env.Subject || ''),
			text: body,
			forwardMessageID: mi.Message.ID,
			forwardPaths: paths,
			isForward: true,
			responseMessageID: mi.Message.ID,
		}),
	)
}

export const openDraft = (mi: MessageItem, pm: ParsedMessage | null) => {
	const env = mi.Envelope
	const text = (pm?.Texts || []).join('\n\n')
	const known = new Set([loginEmail(), ...get(accountAddresses).map(emailOf)])
	const from = (env.From || []).map(emailOf).find((a) => known.has(a)) || loginEmail()
	composeState.set(
		newComposeState({
			from,
			to: (env.To || []).map(emailOf).join(', '),
			cc: (env.CC || []).map(emailOf).join(', '),
			bcc: (env.BCC || []).map(emailOf).join(', '),
			replyTo: (env.ReplyTo || []).map(emailOf).join(', '),
			subject: env.Subject || '',
			text,
			draftMessageID: mi.Message.ID,
			responseMessageID: mi.Message.ID,
		}),
	)
}

export const closeCompose = () => {
	composeState.set(null)
}

export const addComposeFiles = async (files: FileList) => {
	const cs = get(composeState)
	if (!cs) return
	const added: ComposeAttachment[] = []
	for (const f of Array.from(files)) {
		const dataURI = await new Promise<string>((resolve, reject) => {
			const r = new FileReader()
			r.onload = () => resolve(String(r.result || ''))
			r.onerror = () => reject(r.error)
			r.readAsDataURL(f)
		})
		added.push({ Filename: f.name, DataURI: dataURI })
	}
	composeState.update((c) => (c ? { ...c, files: [...c.files, ...added] } : c))
}

export const removeComposeFile = (index: number) => {
	composeState.update((c) => (c ? { ...c, files: c.files.filter((_, i) => i !== index) } : c))
}

export const saveDraft = async () => {
	const cs = get(composeState)
	if (!cs) return
	const draft = get(mailboxes).find((mb) => mb.Draft)
	if (!draft) {
		updateCompose({ error: 'No Draft mailbox configured.' })
		return
	}
	updateCompose({ busy: true, error: '' })
	const msg: ComposeMessage = {
		From: cs.from,
		To: splitAddresses(cs.to),
		Cc: splitAddresses(cs.cc),
		Bcc: splitAddresses(cs.bcc),
		ReplyTo: cs.replyTo,
		Subject: cs.subject,
		TextBody: cs.text,
		ResponseMessageID: cs.responseMessageID,
		DraftMessageID: cs.draftMessageID,
	}
	try {
		await client.MessageCompose(msg, draft.ID)
		composeState.set(null)
	} catch (err) {
		updateCompose({ busy: false, error: errmsg(err) })
	}
}

export const sendCompose = async () => {
	const cs = get(composeState)
	if (!cs) return
	updateCompose({ busy: true, error: '' })
	const files: AttachmentFile[] = cs.files.map((f) => ({ Filename: f.Filename, DataURI: f.DataURI }))
	const msg: SubmitMessage = {
		From: cs.from,
		To: splitAddresses(cs.to),
		Cc: splitAddresses(cs.cc),
		Bcc: splitAddresses(cs.bcc),
		ReplyTo: cs.replyTo,
		Subject: cs.subject,
		TextBody: cs.text,
		Attachments: files.length > 0 ? files : null,
		ForwardAttachments: {
			MessageID: cs.forwardMessageID,
			Paths: cs.forwardPaths.length > 0 ? cs.forwardPaths : null,
		},
		IsForward: cs.isForward,
		ResponseMessageID: cs.responseMessageID,
		UserAgent: 'Mox Webmail',
		RequireTLS: null,
		FutureRelease: null,
		ArchiveThread: cs.archiveThread,
		ArchiveReferenceMailboxID: cs.archiveMailboxID,
		DraftMessageID: cs.draftMessageID,
	}
	try {
		await client.MessageSubmit(msg)
		composeState.set(null)
	} catch (err) {
		updateCompose({ busy: false, error: errmsg(err) })
	}
}

export const findDraftByID = async (id: number) => {
	try {
		const [mi, pm] = await Promise.all([client.MessageItem(id), client.ParsedMessage(id)])
		openDraft(mi, pm)
	} catch (err) {
		window.alert('Error opening draft message: ' + errmsg(err))
	}
}

// --- Helpers ---

export { errmsg, formatSize }

// Attachments use a path joined with dots, e.g. [0, 1] -> "0.1".
const pathString = (p: number[] | null | undefined): string => (p && p.length > 0 ? p.join('.') : '0')

export const attachmentURL = (msgID: number, p: number[] | null | undefined, download: boolean): string => {
	const base = serverURL('msg/' + msgID + '/' + (download ? 'download' : 'view') + '/' + pathString(p))
	return base
}

export const attachmentsZipURL = (msgID: number): string => serverURL('msg/' + msgID + '/attachments.zip')

export const bodyURL = (msgID: number, mode: ViewMode): string => {
	if (mode === ViewMode.ModeHTMLExt) {
		return serverURL('msg/' + msgID + '/htmlexternal')
	}
	return serverURL('msg/' + msgID + '/html')
}

export const rawURL = (msgID: number, download: boolean): string =>
	serverURL('msg/' + msgID + '/' + (download ? 'rawdl' : 'raw'))

// Export the enums/helpers components need, so they only import from state.
export { AttachmentType, Quoting, ThreadMode, ViewMode }
