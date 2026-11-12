<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg, formatDuration, parseDuration } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let saved = false
	let messages = ''
	let webhooks = ''

	onMount(async () => {
		try {
			const [acc] = await client.Account()
			messages = formatDuration(acc.KeepRetiredMessagePeriod)
			webhooks = formatDuration(acc.KeepRetiredWebhookPeriod)
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})

	const save = async (e: SubmitEvent) => {
		e.preventDefault()
		error = ''
		saved = false
		try {
			await client.KeepRetiredPeriodsSave(parseDuration(messages), parseDuration(webhooks))
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section
	title="Keep messages/webhooks retired from queue"
	hint="Keep delivered messages/webhooks around for a while, useful for relating DSNs to sent messages and for debugging. Use values like 3d, 12h, 30m, 10s, 2w."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<form on:submit={save}>
			<label class="field"><span>Message deliveries</span><input bind:value={messages} placeholder="3d" /></label>
			<label class="field"><span>Webhook deliveries</span><input bind:value={webhooks} placeholder="3d" /></label>
			<div class="toolbar">
				<button type="submit">Save</button>
				{#if saved}<span class="muted">Saved.</span>{/if}
			</div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
