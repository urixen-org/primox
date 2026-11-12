<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let staticPath = ''
	let staticText = ''
	let dynamicPath = ''
	let dynamicText = ''

	onMount(async () => {
		try {
			;[staticPath, staticText, dynamicPath, dynamicText] = await client.ConfigFiles()
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})
</script>

{#if loading}
	<p class="muted">Loading...</p>
{:else if error}
	<p class="error">{error}</p>
{:else}
	<Section title={staticPath}><pre class="literal">{staticText}</pre></Section>
	<Section title={dynamicPath}><pre class="literal">{dynamicText}</pre></Section>
{/if}
