<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '$lib/format'
	import Section from '$lib/components/Section.svelte'
	import Badge from '$lib/components/Badge.svelte'

	let loading = true
	let error = ''
	let results: any[] = []

	onMount(async () => {
		try {
			results = (await client.TLSRPTResults()) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})
</script>

<Section title="TLS-RPT results">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<div style="overflow-x:auto">
			<table>
				<thead>
					<tr><th>Day</th><th>Policy domain</th><th>Recipient domain</th><th>Host</th><th>Results</th><th>Send report</th></tr>
				</thead>
				<tbody>
					{#if results.length === 0}
						<tr><td colspan="6" class="muted">No TLS results.</td></tr>
					{/if}
					{#each results as r}
						<tr>
							<td>{r.DayUTC}</td>
							<td>{r.PolicyDomain}</td>
							<td>{r.RecipientDomain}</td>
							<td>{r.IsHost ? 'yes' : ''}</td>
							<td>{(r.Results || []).length}</td>
							<td>{#if r.SendReport}<Badge color="green">yes</Badge>{:else}no{/if}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
