<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
	let loading = true
	let error = ''
	let entries: { pkg: string; level: string }[] = []
	let addPkg = ''
	let addLevel = 'debug'

	const load = async () => {
		loading = true
		error = ''
		try {
			const m = await client.LogLevels()
			entries = Object.entries(m)
				.map(([pkg, level]) => ({ pkg, level }))
				.sort((a, b) => (a.pkg < b.pkg ? -1 : 1))
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	}
	onMount(load)

	const save = async (e: { pkg: string; level: string }) => {
		error = ''
		try {
			await client.LogLevelSet(e.pkg, e.level)
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}
	const remove = async (pkg: string) => {
		error = ''
		try {
			await client.LogLevelRemove(pkg)
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}
	const add = async (ev: SubmitEvent) => {
		ev.preventDefault()
		error = ''
		try {
			await client.LogLevelSet(addPkg, addLevel)
			addPkg = ''
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section title="Log levels">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<table>
			<thead>
				<tr><th>Package</th><th>Level</th><th></th><th></th></tr>
			</thead>
			<tbody>
				{#if entries.length === 0}<tr><td colspan="4" class="muted">(None)</td></tr>{/if}
				{#each entries as e}
					<tr>
						<td>{e.pkg}</td>
						<td>
							<select bind:value={e.level}>
								{#each levels as l}<option value={l}>{l}</option>{/each}
							</select>
						</td>
						<td><button on:click={() => save(e)}>Save</button></td>
						<td><button on:click={() => remove(e.pkg)}>Remove</button></td>
					</tr>
				{/each}
			</tbody>
		</table>
		<form on:submit={add}>
			<label class="field"><span>Package</span><input bind:value={addPkg} required /></label>
			<label class="field"
				><span>Level</span><select bind:value={addLevel}
					>{#each levels as l}<option value={l}>{l}</option>{/each}</select
				></label
			>
			<div class="toolbar"><button type="submit">Add</button></div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
