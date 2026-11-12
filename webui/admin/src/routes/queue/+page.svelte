<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { age, errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let msgs: any[] = []
	let busy = false
	let account = ''
	let from = ''
	let to = ''
	let hold = ''
	let max = '100'

	const filter = () => ({
		Max: parseInt(max) || 100,
		IDs: null,
		Account: account,
		From: from,
		To: to,
		Hold: hold === '' ? null : hold === 'on',
		Submitted: '',
		NextAttempt: '',
		Transport: null,
	})
	const idFilter = (id: number) => ({
		Max: 0,
		IDs: [id],
		Account: '',
		From: '',
		To: '',
		Hold: null,
		Submitted: '',
		NextAttempt: '',
		Transport: null,
	})

	const load = async () => {
		loading = true
		error = ''
		try {
			msgs =
				(await client.QueueList(filter(), { Field: 'Queued', LastID: 0, Last: null, Asc: false })) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	}
	onMount(load)

	const act = async (fn: () => Promise<number>) => {
		busy = true
		error = ''
		try {
			await fn()
			await load()
		} catch (err) {
			error = errmsg(err)
		} finally {
			busy = false
		}
	}
	const setHold = (m: any, on: boolean) => act(() => client.QueueHoldSet(idFilter(m.ID), on))
	const retry = (m: any) => act(() => client.QueueNextAttemptSet(idFilter(m.ID), 10))
	const fail = (m: any) => {
		if (window.confirm('Fail delivery and send a DSN for message ' + m.ID + '?')) {
			act(() => client.QueueFail(idFilter(m.ID)))
		}
	}
	const drop = (m: any) => {
		if (window.confirm('Drop message ' + m.ID + ' from the queue?')) {
			act(() => client.QueueDrop(idFilter(m.ID)))
		}
	}
</script>

<Section title="Queue">
	<form on:submit|preventDefault={load}>
		<label class="field"><span>Account</span><input bind:value={account} /></label>
		<label class="field"><span>From</span><input bind:value={from} /></label>
		<label class="field"><span>To</span><input bind:value={to} /></label>
		<label class="field"
			><span>Hold</span><select bind:value={hold}
				><option value="">Any</option><option value="on">On hold</option><option value="off"
					>Not on hold</option
				></select
			></label
		>
		<label class="field"><span>Max</span><input bind:value={max} /></label>
		<div class="toolbar"><button type="submit" disabled={busy}>Refresh</button></div>
	</form>

	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<div style="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th>ID</th><th>Queued</th><th>From</th><th>To</th><th>Attempts</th><th>Hold</th><th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#if msgs.length === 0}
						<tr><td colspan="7" class="muted">Queue is empty.</td></tr>
					{/if}
					{#each msgs as m}
						<tr>
							<td>{m.ID}</td>
							<td title={m.Queued?.toString?.() || ''}>{age(m.Queued)}</td>
							<td>{m.SenderLocalpart}@{m.SenderDomainStr}</td>
							<td>{m.RecipientLocalpart}@{m.RecipientDomainStr}</td>
							<td>{m.Attempts}/{m.MaxAttempts || 8}</td>
							<td>{m.Hold ? 'Yes' : ''}</td>
							<td>
								<button on:click={() => setHold(m, !m.Hold)} disabled={busy}
									>{m.Hold ? 'Unhold' : 'Hold'}</button
								>
								<button on:click={() => retry(m)} disabled={busy}>Retry +10m</button>
								<button on:click={() => fail(m)} disabled={busy}>Fail</button>
								<button on:click={() => drop(m)} disabled={busy}>Drop</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
