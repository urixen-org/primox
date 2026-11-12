<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { age, errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'
	import type { TLSPublicKey } from '$lib/api'
	import { ADDRESS_KEY } from '$lib/auth'
	import { storage } from '@mox/ui/storage'

	let loading = true
	let error = ''
	let keys: TLSPublicKey[] = []

	let addLoginAddress = ''
	let addName = ''
	let addNoIMAPPreauth = false
	let addFile: File | null = null
	let fileInput: HTMLInputElement

	const load = async () => {
		loading = true
		error = ''
		try {
			keys = (await client.TLSPublicKeys()) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	}

	onMount(() => {
		addLoginAddress = storage.get(ADDRESS_KEY) || ''
		load()
	})

	const update = async (k: TLSPublicKey) => {
		error = ''
		try {
			await client.TLSPublicKeyUpdate(k)
		} catch (err) {
			error = errmsg(err)
		}
	}

	const remove = async (k: TLSPublicKey) => {
		error = ''
		try {
			await client.TLSPublicKeyRemove(k.Fingerprint)
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}

	const add = async (e: SubmitEvent) => {
		e.preventDefault()
		error = ''
		if (!addFile) {
			error = 'exactly 1 certificate required'
			return
		}
		try {
			const certPEM = await addFile.text()
			await client.TLSPublicKeyAdd(addLoginAddress, addName, addNoIMAPPreauth, certPEM)
			addName = ''
			addNoIMAPPreauth = false
			addFile = null
			if (fileInput) fileInput.value = ''
			await load()
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section
	title="TLS public keys"
	hint="For TLS client authentication with certificates, for IMAP and/or submission. Only the public key of the certificate is used; names, expiration and constraints are not verified."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<table>
			<thead>
				<tr>
					<th>Login address</th>
					<th>Name</th>
					<th>Type</th>
					<th>No IMAP preauth</th>
					<th>Fingerprint</th>
					<th>Created</th>
					<th></th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#if keys.length === 0}
					<tr><td colspan="8" class="muted">None</td></tr>
				{/if}
				{#each keys as k}
					<tr>
						<td><input bind:value={k.LoginAddress} required /></td>
						<td><input bind:value={k.Name} required /></td>
						<td>{k.Type}</td>
						<td><input type="checkbox" bind:checked={k.NoIMAPPreauth} /></td>
						<td><code>{k.Fingerprint}</code></td>
						<td title={k.Created?.toString?.() || ''}>{age(k.Created)}</td>
						<td><button on:click={() => update(k)}>Update</button></td>
						<td><button on:click={() => remove(k)}>Remove</button></td>
					</tr>
				{/each}
			</tbody>
		</table>

		<h3>Add TLS public key</h3>
		<form on:submit={add}>
			<label class="field"
				><span>Login address</span><input bind:value={addLoginAddress} required
				/><span class="muted" style="display:block; font-size:.85em"
					>Login address used for sessions using this key.</span
				></label
			>
			<label class="field"><span>Name (optional)</span><input bind:value={addName} /></label>
			<div class="toolbar">
				<label><input type="checkbox" bind:checked={addNoIMAPPreauth} /> No IMAP preauth</label>
			</div>
			<label class="field"
				><span>Certificate (PEM)</span><input
					type="file"
					bind:this={fileInput}
					on:change={() => (addFile = fileInput.files?.[0] || null)}
				/></label
			>
			<div class="toolbar"><button type="submit">Add</button></div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
