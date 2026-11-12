<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { age, errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let policies: any[] = []

	onMount(async () => {
		try {
			policies = (await client.MTASTSPolicies()) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})
</script>

<Section title="MTA-STS policies">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<table>
			<thead>
				<tr><th>Domain</th><th>Mode</th><th>Valid until</th><th>Last update</th><th>Record ID</th></tr>
			</thead>
			<tbody>
				{#if policies.length === 0}
					<tr><td colspan="5" class="muted">(None)</td></tr>
				{/if}
				{#each policies as p}
					<tr>
						<td>{p.Domain}</td>
						<td>{p.Mode}</td>
						<td title={p.ValidEnd?.toString?.() || ''}>{age(p.ValidEnd)}</td>
						<td title={p.LastUpdate?.toString?.() || ''}>{age(p.LastUpdate)}</td>
						<td>{p.RecordID}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
