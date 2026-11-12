<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { age, errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let hooks: any[] = []

	const load = async () => {
		loading = true
		error = ''
		try {
			hooks =
				(await client.HookRetiredList(
					{ Max: 100, IDs: null, Account: '', Submitted: '', LastActivity: '', Event: '' },
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

<Section title="Retired webhooks">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<div style="overflow-x:auto">
			<table>
				<thead>
					<tr><th>ID</th><th>Submitted</th><th>Account</th><th>Event</th><th>URL</th><th>Superseded by</th></tr>
				</thead>
				<tbody>
					{#if hooks.length === 0}
						<tr><td colspan="6" class="muted">(None)</td></tr>
					{/if}
					{#each hooks as h}
						<tr>
							<td>{h.ID}</td>
							<td title={h.Submitted?.toString?.() || ''}>{age(h.Submitted)}</td>
							<td>{h.Account}</td>
							<td>{h.IsIncoming ? 'incoming' : h.OutgoingEvent}</td>
							<td>{h.URL}</td>
							<td>{h.SupersededByID || ''}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
