<script lang="ts">
	import { onMount } from 'svelte'
	import { base } from '$app/paths'
	import { client } from '$lib/client'
	import { domainName, errmsg } from '$lib/format'
	import Section from '$lib/components/Section.svelte'

	let loading = true
	let error = ''
	let domains: any[] = []
	let queueSize = 0
	let hooksSize = 0
	let checkUpdates = true
	let accountCount = 0

	let addDomain = ''
	let addAccount = ''
	let addLocalpart = ''
	let addDisabled = false
	let saved = false

	const load = async () => {
		loading = true
		error = ''
		try {
			const [d, qs, hs, cu, [accs, dis]] = await Promise.all([
				client.Domains(),
				client.QueueSize(),
				client.HookQueueSize(),
				client.CheckUpdatesEnabled(),
				client.Accounts(),
			])
			domains = d || []
			queueSize = qs
			hooksSize = hs
			checkUpdates = cu
			accountCount = (accs || []).length + (dis || []).length
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	}
	onMount(load)

	const submit = async (e: SubmitEvent) => {
		e.preventDefault()
		error = ''
		saved = false
		try {
			await client.DomainAdd(addDisabled, addDomain, addAccount, addLocalpart)
			addDomain = ''
			addAccount = ''
			addLocalpart = ''
			saved = true
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

{#if loading}
	<p class="muted">Loading...</p>
{:else}
	{#if !checkUpdates}
		<Section title="Warning">
			<p>
				<span class="badge yellow"
					>Checking for updates is not enabled in mox.conf (CheckUpdates: true). Stay up to date
					through another mechanism.</span
				>
			</p>
		</Section>
	{/if}

	<Section title="Overview">
		<p class="muted">
			<a href="{base}/accounts">{accountCount} accounts</a> · {queueSize} queued messages ·
			{hooksSize} queued webhooks
		</p>
	</Section>

	<Section title="Domains">
		{#if domains.length === 0}
			<p><span class="badge red">No domains</span></p>
		{:else}
			<ul>
				{#each domains as d}
					<li>{domainName(d.Domain)}{d.Disabled ? ' (disabled)' : ''}</li>
				{/each}
			</ul>
		{/if}
	</Section>

	<Section title="Add domain">
		<form on:submit={submit}>
			<label class="field"><span>Domain</span><input bind:value={addDomain} required /></label>
			<label class="field"
				><span>Postmaster/reporting account</span><input bind:value={addAccount} required
				/></label
			>
			<label class="field"><span>Localpart (if new account)</span><input bind:value={addLocalpart} /></label>
			<div class="toolbar">
				<label><input type="checkbox" bind:checked={addDisabled} /> Disabled</label>
			</div>
			<div class="toolbar">
				<button type="submit">Add domain</button>
				{#if saved}<span class="muted">Added.</span>{/if}
			</div>
		</form>
	</Section>
{/if}
{#if error}<p class="error">{error}</p>{/if}
