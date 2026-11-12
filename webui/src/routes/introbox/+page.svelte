<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '$lib/format'
	import Section from '$lib/components/Section.svelte'

	let loading = true
	let error = ''
	let saved = false
	let mailbox = ''

	onMount(async () => {
		try {
			const [acc] = await client.Account()
			mailbox = acc.Introbox
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
			await client.IntroboxSave(mailbox)
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section
	title="Introbox"
	hint="Deliver messages from new first-time senders to this mailbox instead of Inbox. Must differ from Inbox and the Rejects mailbox. Empty disables it."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<form on:submit={save}>
			<label class="field"><span>Mailbox</span><input bind:value={mailbox} /></label>
			<div class="toolbar">
				<button type="submit">Save</button>
				{#if saved}<span class="muted">Saved.</span>{/if}
			</div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
