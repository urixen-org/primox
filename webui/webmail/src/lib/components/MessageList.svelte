<script lang="ts">
	import { age } from '@mox/ui/format'
	import { messageFrom, formatEmail } from '$lib/format'
	import {
		activeMessage,
		deleteMessages,
		findMailboxByID,
		loadMore,
		markFlagged,
		markJunk,
		markRead,
		messages,
		messagesLoading,
		moveMessages,
		openMessage,
		refreshView,
		searchQuery,
		selectedIDs,
		viewEnd,
		viewError,
		mailboxes,
	} from '$lib/state'
	import type { MessageItem } from '$lib/api'

	const toggle = (id: number, checked: boolean) => {
		selectedIDs.update((s) => {
			const next = new Set(s)
			if (checked) next.add(id)
			else next.delete(id)
			return next
		})
	}

	const selectAll = (checked: boolean) => {
		selectedIDs.set(checked ? new Set($messages.map((mi) => mi.Message.ID)) : new Set())
	}

	const onSelectAll = (e: Event) => {
		selectAll((e.currentTarget as HTMLInputElement).checked)
	}

	const onToggle = (e: Event, id: number) => {
		toggle(id, (e.currentTarget as HTMLInputElement).checked)
	}

	const selected = (): number[] => [...$selectedIDs]

	const selectedOrActive = (): number[] => {
		const ids = selected()
		if (ids.length > 0) return ids
		const am = $activeMessage
		return am ? [am.Message.ID] : []
	}

	const onMove = (e: Event) => {
		const sel = e.currentTarget as HTMLSelectElement
		const id = Number(sel.value)
		sel.value = ''
		if (id) {
			void moveMessages(selected(), id)
		}
	}

	const onScroll = (e: Event) => {
		const el = e.currentTarget as HTMLElement
		if (el.scrollTop + el.clientHeight >= el.scrollHeight - 300) {
			void loadMore()
		}
	}

	$: allSelected = $messages.length > 0 && $messages.every((mi) => $selectedIDs.has(mi.Message.ID))
	$: activeIDs = selectedOrActive()
	$: hasSelection = $selectedIDs.size > 0
</script>

<section class="wm-list">
	<div class="wm-listhead">
		<label title="Select all messages">
			<input
				type="checkbox"
				checked={allSelected}
				on:change={onSelectAll}
			/>
		</label>
		<button type="button" on:click={() => void refreshView()} title="Refresh list">⟳</button>
		<button type="button" disabled={!hasSelection} on:click={() => void markRead(activeIDs, true)}>Read</button>
		<button type="button" disabled={!hasSelection} on:click={() => void markRead(activeIDs, false)}>Unread</button>
		<button type="button" disabled={!hasSelection} on:click={() => void markFlagged(activeIDs, true)}>Flag</button>
		<button type="button" disabled={!hasSelection} on:click={() => void markJunk(activeIDs, true)}>Junk</button>
		<select disabled={!hasSelection} on:change={onMove} title="Move selected messages" value="">
			<option value="">Move to...</option>
			{#each $mailboxes as mb}
				<option value={mb.ID}>{mb.Name}</option>
			{/each}
		</select>
		<button type="button" class="danger" disabled={!hasSelection} on:click={() => void deleteMessages(activeIDs)}>
			Delete
		</button>
		{#if $selectedIDs.size > 0}<span class="muted wm-selected-count">{$selectedIDs.size} selected</span>{/if}
	</div>

	{#if $viewError}
		<p class="error wm-listerr">{$viewError}</p>
	{/if}

	<div class="wm-msglist" on:scroll={onScroll}>
		{#if $messagesLoading && $messages.length === 0}
			<p class="muted wm-listempty">Loading messages...</p>
		{:else if $messages.length === 0}
			<p class="muted wm-listempty">No messages.</p>
		{:else}
			{#each $messages as mi (mi.Message.ID)}
				{@const id = mi.Message.ID}
				{@const mb = $searchQuery ? findMailboxByID(mi.Message.MailboxID) : null}
				{@const indent = Math.min(3, mi.Message.ThreadParentIDs?.length || 0)}
				<div
					class="wm-msgrow"
					class:active={$activeMessage?.Message.ID === id}
					class:unread={!mi.Message.Seen}
					class:selected={$selectedIDs.has(id)}
					on:click={() => void openMessage(mi)}
					role="button"
					tabindex="0"
					on:keydown={(e) => {
						if (e.key === 'Enter' || e.key === ' ') {
							e.preventDefault()
							void openMessage(mi)
						}
					}}
				>
					<input
						type="checkbox"
						checked={$selectedIDs.has(id)}
						on:click|stopPropagation
						on:change={(e) => onToggle(e, id)}
					/>
					<span class="wm-flags" title={[
						!mi.Message.Seen ? 'Unread' : '',
						mi.Message.Flagged ? 'Flagged' : '',
						mi.Message.Junk ? 'Junk' : '',
						mi.Attachments?.length ? 'Attachments' : '',
						mi.IsSigned ? 'Signed' : '',
						mi.IsEncrypted ? 'Encrypted' : '',
					].filter(Boolean).join(', ')}>
						{#if !mi.Message.Seen}<span class="wm-unreaddot"></span>{/if}
						{#if mi.Message.Flagged}⚑{/if}
						{#if mi.Message.Junk}⚠{/if}
						{#if mi.IsEncrypted}🔒{/if}
						{#if mi.IsSigned}✍{/if}
						{#if mi.Attachments?.length}📎{/if}
					</span>
					<span class="wm-msgfrom" style="padding-left:{indent * 0.75}rem">
						{#if indent > 0}↳ {/if}{messageFrom(mi)}
					</span>
					<span class="wm-msgsubject">
						{#if mb}<span class="badge wm-mbtag">{mb.Name}</span>{/if}
						{mi.Envelope.Subject || '(no subject)'}
						{#if mi.Message.Preview}
							<span class="wm-preview"> — {mi.Message.Preview.trim().slice(0, 160)}</span>
						{/if}
					</span>
					<span class="wm-msgdate">{age(new Date(mi.Message.Received))}</span>
				</div>
			{/each}
			{#if $messagesLoading}
				<p class="muted wm-listempty">Loading more...</p>
			{:else if $viewEnd}
				<p class="muted wm-listempty">End of list.</p>
			{:else}
				<button type="button" class="wm-loadmore" on:click={() => void loadMore()}>Load more</button>
			{/if}
		{/if}
	</div>
</section>
