<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let saved = false
	let text = ''
	let oldConf: any = null

	onMount(async () => {
		try {
			oldConf = await client.WebserverConfig()
			text = JSON.stringify(oldConf, undefined, '\t')
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})

	const save = async () => {
		error = ''
		saved = false
		try {
			const n = JSON.parse(text)
			oldConf = await client.WebserverConfigSave(oldConf, n)
			text = JSON.stringify(oldConf, undefined, '\t')
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section title="Webserver config" hint="JSON editor for the dynamic webserver configuration.">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<textarea bind:value={text} rows="24" style="width:100%" class="literal" spellcheck="false" />
		<div class="toolbar">
			<button on:click={save}>Save</button>
			{#if saved}<span class="muted">Saved.</span>{/if}
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
