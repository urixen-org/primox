<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'
	import Badge from '@mox/ui/components/Badge.svelte'

	let loading = true
	let error = ''
	let stats: any[] = []

	const load = async () => {
		loading = true
		error = ''
		try {
			const m = (await client.DMARCEvaluationStats()) || {}
			stats = Object.entries(m)
				.map(([domain, v]) => ({ domain, ...(v as any) }))
				.sort((a, b) => (a.domain < b.domain ? -1 : 1))
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	}
	onMount(load)

	const remove = async (domain: string) => {
		if (!window.confirm('Remove DMARC evaluations for ' + domain + '?')) return
		error = ''
		try {
			await client.DMARCRemoveEvaluations(domain)
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section title="DMARC evaluations">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<table>
			<thead><tr><th>Domain</th><th>Evaluations</th><th>Report pending</th><th></th></tr></thead>
			<tbody>
				{#if stats.length === 0}
					<tr><td colspan="4" class="muted">No evaluations.</td></tr>
				{/if}
				{#each stats as s}
					<tr>
						<td>{s.domain}</td>
						<td>{s.Count}</td>
						<td>{#if s.SendReport}<Badge color="green">yes</Badge>{:else}no{/if}</td>
						<td><button on:click={() => remove(s.domain)}>Remove</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
