<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '$lib/format'
	import Section from '$lib/components/Section.svelte'

	let loading = true
	let error = ''
	let saved = false
	let capabilities = ''

	onMount(async () => {
		try {
			const [acc] = await client.Account()
			capabilities = (acc.IMAPCapabilitiesDisabled || []).join(' ')
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
			await client.IMAPSave(capabilities.split(' ').filter((s) => s))
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section
	title="IMAP"
	hint="IMAP capabilities (upper-case) to disable on the connection after authentication, for clients with an incompatible implementation."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<form on:submit={save}>
			<label class="field"
				><span>Disabled IMAP capabilities (space-separated)</span><input
					bind:value={capabilities}
				/></label
			>
			<div class="toolbar">
				<button type="submit">Save</button>
				{#if saved}<span class="muted">Saved.</span>{/if}
			</div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
