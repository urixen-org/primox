<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'
	import type { JunkFilter } from '$lib/api'

	let loading = true
	let error = ''
	let saved = false
	let enabled = false
	let threshold = '0.95'
	let onegrams = false
	let twograms = false
	let threegrams = false
	let maxPower = '0.01'
	let topWords = '10'
	let ignoreWords = '0.1'
	let rareWords = '2'

	onMount(async () => {
		try {
			const [acc] = await client.Account()
			const f = acc.JunkFilter
			enabled = !!f
			threshold = '' + (f?.Threshold ?? 0.95)
			onegrams = !!f?.Onegrams
			twograms = !!f?.Twograms
			threegrams = !!f?.Threegrams
			maxPower = '' + (f?.MaxPower ?? 0.01)
			topWords = '' + (f?.TopWords ?? 10)
			ignoreWords = '' + (f?.IgnoreWords ?? 0.1)
			rareWords = '' + (f?.RareWords ?? 2)
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})

	const save = async (e: SubmitEvent) => {
		e.preventDefault()
		error = ''
		saved = false
		try {
			let f: JunkFilter | null = null
			if (enabled) {
				f = {
					Threshold: parseFloat(threshold),
					Onegrams: onegrams,
					Twograms: twograms,
					Threegrams: threegrams, // ignored by the server
					MaxPower: parseFloat(maxPower),
					TopWords: parseInt(topWords),
					IgnoreWords: parseFloat(ignoreWords),
					RareWords: parseInt(rareWords),
				}
			}
			await client.JunkFilterSave(f)
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section
	title="Junk filter"
	hint="Content-based filtering, using the junk-status of individual messages to rank words. Train it by marking messages as junk/nonjunk."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<form on:submit={save}>
			<div class="toolbar">
				<label><input type="checkbox" bind:checked={enabled} /> Enabled</label>
			</div>
			<label class="field"><span>Threshold</span><input bind:value={threshold} /></label>
			<label class="field"><span>Max power</span><input bind:value={maxPower} /></label>
			<label class="field"><span>Top words</span><input bind:value={topWords} /></label>
			<label class="field"><span>Ignore words</span><input bind:value={ignoreWords} /></label>
			<label class="field"><span>Rare words</span><input bind:value={rareWords} /></label>
			<div class="toolbar">
				<label><input type="checkbox" bind:checked={onegrams} /> Onegrams</label>
				<label><input type="checkbox" bind:checked={twograms} /> Twograms</label>
				<label title="Can only be changed by admin."
					><input type="checkbox" checked={threegrams} disabled /> Threegrams</label
				>
			</div>
			<div class="toolbar">
				<button type="submit">Save</button>
				{#if saved}<span class="muted">Saved.</span>{/if}
			</div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
