<script lang="ts">
	import { logout } from '$lib/auth'
	import { formatEmail } from '$lib/format'
	import {
		accountPath,
		accountAddresses,
		composeNew,
		connectionState,
		loginAddress,
		mailboxes,
		refreshView,
		reconnect,
		search,
		searchQuery,
		setRefine,
		setUISettings,
		showHelp,
		showSettings,
		uiSettings,
		ThreadMode,
	} from '$lib/state'
	import type { Mailbox, MessageAddress } from '$lib/api'

	let q = ''
	$: q = $searchQuery

	const emailOf = (a: MessageAddress): string => a.User + '@' + (a.Domain.Unicode || a.Domain.ASCII)

	const onSubmit = (e: SubmitEvent) => {
		e.preventDefault()
		void search(q)
	}

	const onThreading = (e: Event) => {
		const v = (e.currentTarget as HTMLSelectElement).value as ThreadMode
		setUISettings({ threading: v })
		void refreshView()
	}

	const onOrder = (e: Event) => {
		const v = (e.currentTarget as HTMLSelectElement).value === 'asc'
		setUISettings({ orderAsc: v })
		void refreshView()
	}

	const onRefine = (e: Event) => {
		void setRefine((e.currentTarget as HTMLSelectElement).value)
	}

	$: labels = Array.from(
		new Set(($mailboxes as Mailbox[]).flatMap((mb) => mb.Keywords || [])),
	).sort()

	$: unread = ($mailboxes as Mailbox[]).find((mb) => mb.Name === 'Inbox')?.Unread || 0
	$: {
		if ($loginAddress) {
			const addr = emailOf($loginAddress)
			document.title = (unread > 0 ? '(' + unread + ') ' : '') + 'Mox Webmail - ' + addr
		}
	}
</script>

<header class="wm-top">
	<div class="wm-brand">
		<span class="wm-logo">✉</span>
		<span>Mox Webmail</span>
	</div>

	<form class="wm-search" on:submit={onSubmit} role="search">
		<input
			bind:value={q}
			type="search"
			placeholder="Search messages, e.g. subject:invoice from:jane@example.org"
			title="Search supports free-form words, and filters like mailbox:, from:, to:, subject:, label:, start:, end:, attachments:, minsize:, maxsize: and header:name:value."
			aria-label="Search messages"
		/>
		<button type="submit" disabled={$connectionState !== 'connected'}>Search</button>
		{#if $searchQuery}
			<button
				type="button"
				title="Clear search"
				on:click={() => {
					q = ''
					void search('')
				}}>✕</button
			>
		{/if}
	</form>

	<div class="wm-topcontrols">
		<select
			value={$uiSettings.refine}
			on:change={onRefine}
			title="Quick filter for the current list"
		>
			<option value="">All messages</option>
			<option value="unread">Unread</option>
			<option value="read">Read</option>
			<option value="attachments">With attachments</option>
			<option value="flagged">Flagged</option>
			{#each labels as l}
				<option value={'label:' + l}>Label: {l}</option>
			{/each}
		</select>

		<select value={$uiSettings.threading} on:change={onThreading} title="Threading mode">
			<option value={ThreadMode.ThreadOn}>Threads</option>
			<option value={ThreadMode.ThreadOff}>No threads</option>
			<option value={ThreadMode.ThreadUnread}>Unread threads</option>
		</select>

		<select value={$uiSettings.orderAsc ? 'asc' : 'desc'} on:change={onOrder} title="Sort order">
			<option value="desc">Newest first</option>
			<option value="asc">Oldest first</option>
		</select>

		<button
			type="button"
			class="primary"
			disabled={$connectionState !== 'connected'}
			on:click={composeNew}
			title="Compose a new message"
		>
			Compose
		</button>
		<button type="button" on:click={() => showSettings.set(true)} disabled={$connectionState !== 'connected'}>
			Settings
		</button>
		<button type="button" on:click={() => showHelp.set(true)}>Help</button>
	</div>

	<div class="wm-account">
		{#if $connectionState !== 'connected'}
			<span class="wm-disconnected" role="status">
				{#if $connectionState === 'connecting'}Connecting...{:else}Not connected{/if}
			</span>
			<button type="button" on:click={() => void reconnect()}>Reconnect</button>
		{/if}
		{#if $accountPath}
			<a href={$accountPath}>Account</a>
		{/if}
		{#if $loginAddress}
			<span class="wm-address" title="{$accountAddresses.map(emailOf).join('\n')}">
				{formatEmail($loginAddress)}
			</span>
		{/if}
		<button type="button" on:click={logout} title="Log out">Logout</button>
	</div>
</header>
