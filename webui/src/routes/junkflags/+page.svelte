<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '$lib/format'
	import Section from '$lib/components/Section.svelte'

	let loading = true
	let error = ''
	let saved = false
	let enabled = false
	let junk = ''
	let neutral = ''
	let notJunk = ''

	onMount(async () => {
		try {
			const [acc] = await client.Account()
			const f = acc.AutomaticJunkFlags
			enabled = f.Enabled
			junk = f.JunkMailboxRegexp
			neutral = f.NeutralMailboxRegexp
			notJunk = f.NotJunkMailboxRegexp
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
			await client.AutomaticJunkFlagsSave(enabled, junk, neutral, notJunk)
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section
	title="Automatic junk flags"
	hint="Set junk/nonjunk flags automatically when messages are moved to mailboxes matching the regular expressions. Messages are matched in order junk, neutral, not junk, and the search stops on the first match. Mailboxes are lowercased before matching."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<form on:submit={save}>
			<div class="toolbar">
				<label><input type="checkbox" bind:checked={enabled} /> Enabled</label>
			</div>
			<label class="field"><span>Junk mailbox regexp</span><input bind:value={junk} /></label>
			<label class="field"><span>Neutral mailbox regexp</span><input bind:value={neutral} /></label>
			<label class="field"><span>Not junk mailbox regexp</span><input bind:value={notJunk} /></label>
			<div class="toolbar">
				<button type="submit">Save</button>
				{#if saved}<span class="muted">Saved.</span>{/if}
			</div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
