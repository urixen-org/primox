<script lang="ts">
	import {
		activeMailboxID,
		createMailbox,
		deleteMailbox,
		emptyMailbox,
		mailboxes,
		markMailboxRead,
		openMailbox,
		renameMailbox,
		searchQuery,
		sortedMailboxes,
	} from '$lib/state'
	import type { Mailbox } from '$lib/api'

	$: activeMB = $activeMailboxID && !$searchQuery ? $mailboxes.find((mb) => mb.ID === $activeMailboxID) || null : null

	const leaf = (name: string): string => name.split('/').pop() || name
	const depth = (name: string): number => Math.max(0, name.split('/').length - 1)

	const create = () => {
		const name = window.prompt('Name of new mailbox (use / for submailboxes):')
		if (name) {
			void createMailbox(name)
		}
	}

	const rename = (mb: Mailbox) => {
		const name = window.prompt('New name for mailbox:', mb.Name)
		if (name) {
			void renameMailbox(mb, name)
		}
	}

	const markActiveRead = () => {
		if (activeMB) void markMailboxRead(activeMB)
	}
	const renameActive = () => {
		if (activeMB) rename(activeMB)
	}
	const emptyActive = () => {
		if (activeMB) void emptyMailbox(activeMB)
	}
	const deleteActive = () => {
		if (activeMB) void deleteMailbox(activeMB)
	}
</script>

<aside class="wm-mailboxes" aria-label="Mailboxes">
	<div class="wm-panelhead">
		<span>Mailboxes</span>
		<button type="button" on:click={create} title="Create mailbox">+</button>
	</div>

	<div class="wm-mblist">
		{#each $sortedMailboxes as mb}
			<button
				type="button"
				class="wm-mbrow"
				class:active={!$searchQuery && $activeMailboxID === mb.ID}
				on:click={() => void openMailbox(mb)}
				title={mb.Name}
			>
				<span class="wm-mbname" style="padding-left:{depth(mb.Name) * 0.9}rem">
					{#if mb.Archive}🗄{:else if mb.Draft}✎{:else if mb.Junk}⚠{:else if mb.Sent}➤{:else if mb.Trash}🗑{:else}▫{/if}
					{leaf(mb.Name)}
				</span>
				{#if mb.Unread > 0}<span class="badge blue">{mb.Unread}</span>{:else if mb.Total > 0}<span class="muted wm-total">{mb.Total}</span>{/if}
			</button>
		{/each}
	</div>

	{#if activeMB}
		<div class="wm-mbactions">
			<div class="wm-mbactions-title">{activeMB.Name}</div>
			<button type="button" on:click={markActiveRead}>Mark all read</button>
			<button type="button" on:click={renameActive}>Rename</button>
			<button type="button" on:click={emptyActive}>Empty</button>
			<button type="button" class="danger" on:click={deleteActive}>Delete</button>
		</div>
	{/if}
</aside>
