<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let saved = false
	let mailbox = ''
	let keep = false

	onMount(async () => {
		try {
			const [acc] = await client.Account()
			mailbox = acc.RejectsMailbox
			keep = acc.KeepRejects
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
			await client.RejectsSave(mailbox, keep)
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section
	title="Rejects"
	hint="Mail that looks like spam is rejected, but a copy can be stored temporarily in this mailbox. Do not use a mailbox with messages you want to keep."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<form on:submit={save}>
			<label class="field"><span>Mailbox</span><input bind:value={mailbox} /></label>
			<div class="toolbar">
				<label title="Do not automatically delete mail in the rejects mailbox."
					><input type="checkbox" bind:checked={keep} /> No cleanup</label
				>
			</div>
			<div class="toolbar">
				<button type="submit">Save</button>
				{#if saved}<span class="muted">Saved.</span>{/if}
			</div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
