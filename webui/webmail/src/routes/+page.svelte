<script lang="ts">
	import { onDestroy, onMount } from 'svelte'
	import TopBar from '$lib/components/TopBar.svelte'
	import MailboxList from '$lib/components/MailboxList.svelte'
	import MessageList from '$lib/components/MessageList.svelte'
	import MessageView from '$lib/components/MessageView.svelte'
	import Compose from '$lib/components/Compose.svelte'
	import SettingsModal from '$lib/components/SettingsModal.svelte'
	import HelpModal from '$lib/components/HelpModal.svelte'
	import {
		applyLocationHash,
		connect,
		connectionError,
		connectionState,
		disconnect,
		composeState,
		reconnect,
		showHelp,
		showSettings,
	} from '$lib/state'

	const onKey = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			showSettings.set(false)
			showHelp.set(false)
		}
	}

	const onHash = () => {
		if ($connectionState === 'connected') {
			void applyLocationHash()
		}
	}

	onMount(() => {
		void connect()
		window.addEventListener('keydown', onKey)
		window.addEventListener('hashchange', onHash)
		return () => {
			window.removeEventListener('keydown', onKey)
			window.removeEventListener('hashchange', onHash)
		}
	})

	onDestroy(disconnect)
</script>

<div class="wm">
	<TopBar />
	{#if $connectionState === 'failed' && $connectionError}
		<div class="wm-listerr error" role="alert">
			{$connectionError}
			<button type="button" on:click={() => void reconnect()}>Reconnect</button>
		</div>
	{/if}
	<div class="wm-body">
		<MailboxList />
		<MessageList />
		<MessageView />
	</div>
</div>

{#if $composeState}
	<Compose />
{/if}
{#if $showSettings}
	<SettingsModal />
{/if}
{#if $showHelp}
	<HelpModal />
{/if}
