<script lang="ts">
	import { formatSize } from '@mox/ui/format'
	import {
		activeMessage,
		attachmentURL,
		attachmentsZipURL,
		bodyURL,
		closeMessage,
		composeForward,
		composeReply,
		deleteMessages,
		markFlagged,
		markJunk,
		markRead,
		messageError,
		messageLoading,
		moveMessages,
		openDraft,
		parsedMessage,
		rawURL,
		uiSettings,
		setUISettings,
		mailboxes,
		ViewMode,
	} from '$lib/state'
	import { formatAddressList, validationText } from '$lib/format'

	let mode: ViewMode | null = null

	$: mi = $activeMessage
	$: pm = $parsedMessage
	$: currentMode = mode || pm?.ViewMode || ViewMode.ModeText
	$: mb = mi ? $mailboxes.find((m) => m.ID === mi!.Message.MailboxID) || null : null

	const reply = (all: boolean) => {
		if (mi) composeReply(mi, pm, all)
	}

	const forward = () => {
		if (mi) composeForward(mi, pm)
	}

	const editDraft = () => {
		if (mi) openDraft(mi, pm)
	}

	const remove = async () => {
		if (!mi) return
		await deleteMessages([mi.Message.ID])
		closeMessage()
	}

	const unread = async () => {
		if (!mi) return
		await markRead([mi.Message.ID], false)
		closeMessage()
	}

	const onMove = (e: Event) => {
		const sel = e.currentTarget as HTMLSelectElement
		const id = Number(sel.value)
		sel.value = ''
		if (id && mi) {
			void moveMessages([mi.Message.ID], id)
		}
	}

	const setMode = (m: ViewMode) => {
		mode = m
	}

	const headerEntries = (): [string, string[]][] => {
		if (!pm?.Headers) return []
		return Object.entries(pm.Headers)
			.filter(([, v]) => !!v)
			.map(([k, v]) => [k, v || []])
	}

	const toggleHeaders = () => {
		setUISettings({ showAllHeaders: !$uiSettings.showAllHeaders })
	}
	$: showHeaders = $uiSettings.showAllHeaders
</script>

<section class="wm-view" class:wm-viewopen={!!mi}>
	{#if !mi}
		<div class="wm-viewempty">
			<p class="muted">Select a message to view it.</p>
		</div>
	{:else}
		<div class="wm-viewhead">
			<div class="wm-viewtitle">
				<h1>{mi.Envelope.Subject || '(no subject)'}</h1>
				<button type="button" on:click={closeMessage} title="Close message">✕</button>
			</div>

			<div class="wm-viewactions">
				<button type="button" on:click={() => reply(false)}>Reply</button>
				<button type="button" on:click={() => reply(true)}>Reply all</button>
				<button type="button" on:click={forward}>Forward</button>
				{#if mb && mb.Draft}
					<button type="button" on:click={editDraft}>Edit draft</button>
				{/if}
				<span class="wm-sep"></span>
				<button type="button" disabled={mi.Message.Seen} on:click={() => void unread()}>Mark unread</button>
				<button type="button" on:click={() => void markFlagged([mi.Message.ID], !mi.Message.Flagged)}>
					{mi.Message.Flagged ? 'Unflag' : 'Flag'}
				</button>
				<button type="button" on:click={() => void markJunk([mi.Message.ID], !mi.Message.Junk)}>
					{mi.Message.Junk ? 'Not junk' : 'Junk'}
				</button>
				<select on:change={onMove} value="" title="Move message">
					<option value="">Move...</option>
					{#each $mailboxes as m}
						<option value={m.ID}>{m.Name}</option>
					{/each}
				</select>
				<button type="button" class="danger" on:click={() => void remove()}>Delete</button>
				<span class="wm-sep"></span>
				<button type="button" class:active={currentMode === ViewMode.ModeText} on:click={() => setMode(ViewMode.ModeText)}>Text</button>
				{#if pm?.HasHTML}
					<button type="button" class:active={currentMode === ViewMode.ModeHTML} on:click={() => setMode(ViewMode.ModeHTML)}>HTML</button>
					<button type="button" class:active={currentMode === ViewMode.ModeHTMLExt} on:click={() => setMode(ViewMode.ModeHTMLExt)}>HTML+external</button>
				{/if}
				<span class="wm-sep"></span>
				<a href={rawURL(mi.Message.ID, false)} target="_blank" rel="noopener noreferrer">Raw</a>
				<a href={rawURL(mi.Message.ID, true)} download>Download .eml</a>
			</div>

			<table class="wm-headers">
				<tbody>
					<tr>
						<th>From</th>
						<td>{formatAddressList(mi.Envelope.From)}</td>
					</tr>
					{#if mi.Envelope.To?.length}
						<tr><th>To</th><td>{formatAddressList(mi.Envelope.To)}</td></tr>
					{/if}
					{#if mi.Envelope.CC?.length}
						<tr><th>Cc</th><td>{formatAddressList(mi.Envelope.CC)}</td></tr>
					{/if}
					{#if mi.Envelope.ReplyTo?.length}
						<tr><th>Reply-To</th><td>{formatAddressList(mi.Envelope.ReplyTo)}</td></tr>
					{/if}
					<tr>
						<th>Date</th>
						<td>{new Date(mi.Envelope.Date).toLocaleString()}</td>
					</tr>
					{#if mb}
						<tr><th>Mailbox</th><td>{mb.Name}</td></tr>
					{/if}
					{#if validationText(mi.Message)}
						<tr><th>Validation</th><td>{validationText(mi.Message)}</td></tr>
					{/if}
					{#if mi.Message.DKIMDomains?.length}
						<tr><th>DKIM</th><td>{mi.Message.DKIMDomains.join(', ')}</td></tr>
					{/if}
					{#each mi.MoreHeaders || [] as h}
						{#if h && h.length > 0}
							<tr><th>{h[0]}</th><td>{h.slice(1).join(', ')}</td></tr>
						{/if}
					{/each}
				</tbody>
			</table>

			<div class="wm-headertoggle">
				<button type="button" on:click={toggleHeaders}>{showHeaders ? 'Hide raw headers' : 'Show raw headers'}</button>
			</div>
			{#if showHeaders}
				<div class="wm-rawheaders">
					{#each headerEntries() as [k, vs]}
						<div><b>{k}</b>: {vs.join(', ')}</div>
					{/each}
				</div>
			{/if}

			{#if mi.Attachments?.length}
				<div class="wm-attachments">
					<strong>Attachments:</strong>
					<a href={attachmentsZipURL(mi.Message.ID)} download>download all (.zip)</a>
					<ul>
						{#each mi.Attachments as a}
							<li>
								<a href={attachmentURL(mi.Message.ID, a.Path, true)} download>{a.Filename || '(unnamed)'}</a>
								<span class="muted">({formatSize(a.Part.DecodedSize)})</span>
								<a href={attachmentURL(mi.Message.ID, a.Path, false)} target="_blank" rel="noopener noreferrer">view</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>

		<div class="wm-viewbody">
			{#if messageLoading}
				<p class="muted wm-viewnote">Loading message...</p>
			{:else if messageError}
				<p class="error wm-viewnote">{messageError}</p>
			{:else if currentMode !== ViewMode.ModeText && pm?.HasHTML}
				<iframe
					title="Message body"
					src={bodyURL(mi.Message.ID, currentMode)}
					sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
				></iframe>
			{:else if pm?.Texts?.length}
				<div class="wm-textbody">
					{#each pm.Texts as t}
						<pre>{t}</pre>
					{/each}
				</div>
			{:else}
				<p class="muted wm-viewnote">This message has no text content.</p>
			{/if}
		</div>
	{/if}
</section>
