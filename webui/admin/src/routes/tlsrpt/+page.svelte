<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'
	import Badge from '@mox/ui/components/Badge.svelte'

	let loading = true
	let error = ''
	let summaries: any[] = []

	onMount(async () => {
		try {
			const end = new Date()
			const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000)
			summaries = (await client.TLSRPTSummaries(start, end, '')) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})
</script>

<Section title="TLS-RPT summaries (past 30 days)">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<table>
			<thead>
				<tr><th>Policy domain</th><th>Successes</th><th>Failures</th></tr>
			</thead>
			<tbody>
				{#if summaries.length === 0}
					<tr><td colspan="3" class="muted">No domains with TLS reports.</td></tr>
				{/if}
				{#each summaries as s}
					<tr>
						<td>{s.PolicyDomain?.Unicode || s.PolicyDomain?.ASCII}</td>
						<td style="text-align:right">{s.Success}</td>
						<td style="text-align:right"
							>{#if s.Failure === 0}{s.Failure}{:else}<Badge color="red">{s.Failure}</Badge>{/if}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
