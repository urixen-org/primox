<script lang="ts">
	import { get } from 'svelte/store'
	import {
		accountAddresses,
		activeMailboxID,
		addComposeFiles,
		closeCompose,
		composeState,
		loginEmail,
		mailboxes,
		removeComposeFile,
		saveDraft,
		sendCompose,
		updateCompose,
	} from '$lib/state'
	import { formatSize } from '@mox/ui/format'
	import type { ComposeState } from '$lib/state'
	import type { MessageAddress } from '$lib/api'

	const initial = get(composeState) as ComposeState

	let from = initial.from
	let to = initial.to
	let cc = initial.cc
	let bcc = initial.bcc
	let replyTo = initial.replyTo
	let subject = initial.subject
	let text = initial.text
	let archiveThread = initial.archiveThread
	let showCC = !!initial.cc || !!initial.bcc
	let error = ''

	const emailOf = (a: MessageAddress): string => a.User + '@' + (a.Domain.Unicode || a.Domain.ASCII)
	const fromOptions = [loginEmail(), ...$accountAddresses.filter((a) => a.User).map(emailOf)].filter(
		(v, i, l) => !!v && l.indexOf(v) === i,
	)

	$: archiveMailbox = $mailboxes.find((mb) => mb.Archive)
	$: archiveMailboxID = initial.archiveMailboxID || $activeMailboxID
	$: hasForward = initial.isForward || initial.responseMessageID > 0

	const values = (): Partial<ComposeState> => ({
		from,
		to,
		cc,
		bcc,
		replyTo,
		subject,
		text,
		archiveThread: hasForward && !!archiveMailbox ? archiveThread : false,
		archiveMailboxID,
	})

	const onFiles = async (e: Event) => {
		const input = e.currentTarget as HTMLInputElement
		if (input.files && input.files.length > 0) {
			try {
				await addComposeFiles(input.files)
			} catch (err) {
				error = 'Could not read attachment: ' + String(err)
			}
		}
		input.value = ''
	}

	const doSend = async () => {
		error = ''
		if (!from) {
			error = 'Choose a From address.'
			return
		}
		updateCompose(values())
		await sendCompose()
	}

	const doDraft = async () => {
		error = ''
		updateCompose(values())
		await saveDraft()
	}

	const discard = () => {
		if (window.confirm('Discard this message?')) {
			closeCompose()
		}
	}
</script>

<div class="modal-overlay wm-composeoverlay">
	<div class="wm-compose">
		<div class="wm-composehead">
			<h1>{initial.draftMessageID ? 'Edit draft' : hasForward ? 'Forward / reply' : 'New message'}</h1>
			<button type="button" on:click={discard} title="Close compose">✕</button>
		</div>

		<form
			class="wm-composeform"
			on:submit={(e) => {
				e.preventDefault()
				void doSend()
			}}
		>
			<div class="wm-composerow">
				<label for="compose-from">From</label>
				<select id="compose-from" bind:value={from}>
					{#each fromOptions as a}
						<option value={a}>{a}</option>
					{/each}
				</select>
			</div>
			<div class="wm-composerow">
				<label for="compose-to">To</label>
				<input id="compose-to" bind:value={to} placeholder="name <user@example.org>, ..." />
				<button type="button" class="wm-linkbtn" on:click={() => (showCC = !showCC)}>Cc/Bcc</button>
			</div>
			{#if showCC}
				<div class="wm-composerow">
					<label for="compose-cc">Cc</label>
					<input id="compose-cc" bind:value={cc} />
				</div>
				<div class="wm-composerow">
					<label for="compose-bcc">Bcc</label>
					<input id="compose-bcc" bind:value={bcc} />
				</div>
			{/if}
			<div class="wm-composerow">
				<label for="compose-subject">Subject</label>
				<input id="compose-subject" bind:value={subject} />
			</div>

			<textarea class="wm-composetext" bind:value={text} rows="16"></textarea>

			{#if $composeState?.files?.length}
				<div class="wm-composefiles">
					<strong>New attachments:</strong>
					<ul>
						{#each $composeState.files as f, i}
							<li>
								{f.Filename} <span class="muted">({formatSize(Math.round((f.DataURI.length * 3) / 4))})</span>
								<button type="button" on:click={() => removeComposeFile(i)}>remove</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if initial.forwardPaths.length > 0}
				<div class="muted">Forwarding {initial.forwardPaths.length} attachment(s) from the original message.</div>
			{/if}

			{#if hasForward && archiveMailbox}
				<label class="wm-composecheck">
					<input type="checkbox" bind:checked={archiveThread} />
					Archive the thread after sending
				</label>
			{/if}

			{#if error || $composeState?.error}
				<p class="error">{error || $composeState?.error}</p>
			{/if}

			<div class="wm-composeactions">
				<button type="submit" class="primary" disabled={$composeState?.busy}>Send</button>
				<button type="button" disabled={$composeState?.busy} on:click={() => void doDraft()}>Save draft</button>
				<label class="wm-fileinput">
					Attach files
					<input type="file" multiple on:change={onFiles} />
				</label>
				<span class="wm-spacer"></span>
				<button type="button" on:click={discard}>Discard</button>
			</div>
		</form>
	</div>
</div>
