<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	type Row = { from: string; to: string; minAttempts: string; transport: string }

	let loading = true
	let error = ''
	let saved = false
	let transports: string[] = []
	let rows: Row[] = []

	const load = async () => {
		loading = true
		error = ''
		try {
			const [cfg, t] = await Promise.all([client.Config(), client.Transports()])
			transports = Object.keys(t || {}).sort()
			const routes = (cfg as any).Routes || []
			rows = routes.map((r: any) => ({
				from: (r.FromDomain || []).join(', '),
				to: (r.ToDomain || []).join(', '),
				minAttempts: '' + (r.MinimumAttempts || 0),
				transport: r.Transport || transports[0] || '',
			}))
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	}
	onMount(load)

	const add = () => {
		rows = [...rows, { from: '', to: '', minAttempts: '0', transport: transports[0] || '' }]
	}
	const remove = (i: number) => {
		rows = rows.filter((_, j) => j !== i)
	}
	const save = async () => {
		error = ''
		saved = false
		try {
			const routes: any = rows.map((r) => ({
				FromDomain: r.from.split(',').map((s) => s.trim()).filter((s) => s),
				ToDomain: r.to.split(',').map((s) => s.trim()).filter((s) => s),
				MinimumAttempts: parseInt(r.minAttempts) || 0,
				Transport: r.transport,
			}))
			await client.RoutesSave(routes)
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section title="Routes" hint="Routes determine which transport is used to deliver messages. Empty From/To domains match all.">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<div style="overflow-x:auto">
			<table>
				<thead>
					<tr><th>From domains</th><th>To domains</th><th>Min attempts</th><th>Transport</th><th></th></tr>
				</thead>
				<tbody>
					{#if rows.length === 0}
						<tr><td colspan="5" class="muted">No routes.</td></tr>
					{/if}
					{#each rows as r, i}
						<tr>
							<td><input bind:value={r.from} placeholder="comma-separated" /></td>
							<td><input bind:value={r.to} placeholder="comma-separated" /></td>
							<td><input bind:value={r.minAttempts} style="width:6em" /></td>
							<td>
								<select bind:value={r.transport}>
									{#each transports as t}<option value={t}>{t}</option>{/each}
								</select>
							</td>
							<td><button on:click={() => remove(i)}>Remove</button></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<div class="toolbar">
			<button on:click={add}>Add route</button>
			<button on:click={save}>Save</button>
			{#if saved}<span class="muted">Saved.</span>{/if}
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
