<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { age, errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let hooks: any[] = []

	const emptyFilter = () => ({
		Max: 100,
		IDs: null,
		Account: '',
		Submitted: '',
		NextAttempt: '',
		Event: '',
	})
	const idFilter = (id: number) => ({ ...emptyFilter(), Max: 0, IDs: [id] })

	const load = async () => {
		loading = true
		error = ''
		try {
			hooks =
				(await client.HookList(emptyFilter(), {
					Field: 'Queued',
					LastID: 0,
					Last: null,
					Asc: false,
				})) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	}
	onMount(load)

	const cancel = async (h: any) => {
		if (!window.confirm('Cancel webhook ' + h.ID + '?')) return
		error = ''
		try {
			await client.HookCancel(idFilter(h.ID))
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}
	const retry = async (h: any) => {
		error = ''
		try {
			await client.HookNextAttemptSet(idFilter(h.ID), 10)
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section title="Webhook queue">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<div style="overflow-x:auto">
			<table>
				<thead>
					<tr><th>ID</th><th>Submitted</th><th>Account</th><th>Event</th><th>URL</th><th>Attempts</th><th>Actions</th></tr>
				</thead>
				<tbody>
					{#if hooks.length === 0}
						<tr><td colspan="7" class="muted">Webhook queue is empty.</td></tr>
					{/if}
					{#each hooks as h}
						<tr>
							<td>{h.ID}</td>
							<td title={h.Submitted?.toString?.() || ''}>{age(h.Submitted)}</td>
							<td>{h.Account}</td>
							<td>{h.IsIncoming ? 'incoming' : h.OutgoingEvent}</td>
							<td>{h.URL}</td>
							<td>{h.Attempts}</td>
							<td>
								<button on:click={() => retry(h)}>Retry +10m</button>
								<button on:click={() => cancel(h)}>Cancel</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
