<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { age, errmsg } from '$lib/format'
	import Section from '$lib/components/Section.svelte'

	let loading = true
	let error = ''
	let msgs: any[] = []

	const load = async () => {
		loading = true
		error = ''
		try {
			msgs =
				(await client.RetiredList(
					{ Max: 100, IDs: null, Account: '', From: '', To: '', Submitted: '', LastActivity: '', Transport: null, Success: null },
					{ Field: 'Queued', LastID: 0, Last: null, Asc: false },
				)) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	}
	onMount(load)
</script>

<Section title="Retired messages">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<div style="overflow-x:auto">
			<table>
				<thead>
					<tr><th>ID</th><th>Queued</th><th>From</th><th>To</th><th>Attempts</th><th>Last attempt</th></tr>
				</thead>
				<tbody>
					{#if msgs.length === 0}
						<tr><td colspan="6" class="muted">(None)</td></tr>
					{/if}
					{#each msgs as m}
						<tr>
							<td>{m.ID}</td>
							<td title={m.Queued?.toString?.() || ''}>{age(m.Queued)}</td>
							<td>{m.SenderLocalpart}@{m.SenderDomainStr}</td>
							<td>{m.RecipientLocalpart}@{m.RecipientDomainStr}</td>
							<td>{m.Attempts}/{m.MaxAttempts || 8}</td>
							<td>{#if m.LastAttempt}{age(m.LastAttempt)}{/if}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
