<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let noCustomPassword = false
	let loading = true
	let error = ''
	let message = ''
	let p1 = ''
	let p2 = ''
	let busy = false

	onMount(async () => {
		try {
			const [a] = await client.Account()
			noCustomPassword = a.NoCustomPassword
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})

	const change = async (e: SubmitEvent) => {
		e.preventDefault()
		error = ''
		message = ''
		if (!p1 || p1 !== p2) {
			error = 'Passwords do not match.'
			return
		}
		busy = true
		try {
			await client.SetPassword(p1)
			p1 = ''
			p2 = ''
			message = 'Password changed.'
		} catch (err) {
			error = errmsg(err)
		} finally {
			busy = false
		}
	}

	const generate = async () => {
		error = ''
		busy = true
		try {
			const pw = await client.GeneratePassword()
			window.alert(
				'New password: ' + pw + '\n\nStore it securely, for example in a password manager.',
			)
		} catch (err) {
			error = errmsg(err)
		} finally {
			busy = false
		}
	}
</script>

<Section title="Change password">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else if noCustomPassword}
		<p class="muted">Custom passwords are disabled for this account.</p>
		<button on:click={generate} disabled={busy}>Generate and set new password</button>
	{:else}
		<form on:submit={change}>
			<label class="field">
				<span>New password</span>
				<input type="password" bind:value={p1} autocomplete="new-password" required />
			</label>
			<label class="field">
				<span>New password repeat</span>
				<input type="password" bind:value={p2} autocomplete="new-password" required />
			</label>
			<div class="toolbar">
				<button type="submit" disabled={busy}>Change password</button>
				<button type="button" on:click={generate} disabled={busy}>Generate random password</button>
			</div>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
	{#if message}<p class="muted">{message}</p>{/if}
</Section>
