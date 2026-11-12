<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '$lib/format'
	import Section from '$lib/components/Section.svelte'
	import Badge from '$lib/components/Badge.svelte'

	let loading = true
	let error = ''
	let summaries: any[] = []

	onMount(async () => {
		try {
			const end = new Date()
			const start = new Date(end.getTime() - 30 * 24 * 3600 * 1000)
			summaries = (await client.DMARCSummaries(start, end, '')) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})
</script>

<Section title="DMARC summaries (past 30 days)">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Domain</th><th>Messages</th><th>none</th><th>quarantine</th><th>reject</th>
					<th>DKIM fail</th><th>SPF fail</th>
				</tr>
			</thead>
			<tbody>
				{#if summaries.length === 0}
					<tr><td colspan="7" class="muted">No domains with reports.</td></tr>
				{/if}
				{#each summaries as s}
					<tr>
						<td>{s.Domain}</td>
						<td style="text-align:right">{s.Total}</td>
						<td style="text-align:right">{s.DispositionNone}</td>
						<td style="text-align:right">{s.DispositionQuarantine}</td>
						<td style="text-align:right">{s.DispositionReject}</td>
						<td style="text-align:right"
							>{#if s.DKIMFail === 0}{s.DKIMFail}{:else}<Badge color="red">{s.DKIMFail}</Badge>{/if}</td
						>
						<td style="text-align:right"
							>{#if s.SPFFail === 0}{s.SPFFail}{:else}<Badge color="red">{s.SPFFail}</Badge>{/if}</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
