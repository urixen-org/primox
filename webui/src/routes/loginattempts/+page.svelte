<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '$lib/format'
	import Section from '$lib/components/Section.svelte'
	import LoginAttempts from '$lib/components/LoginAttempts.svelte'
	import type { LoginAttempt } from '$lib/api'

	let attempts: LoginAttempt[] = []
	let loading = true
	let error = ''

	onMount(async () => {
		try {
			attempts = (await client.LoginAttempts(0)) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})
</script>

<Section
	title="Login attempts"
	hint="Login attempts are stored for 30 days. At most 10000 failed login attempts are stored per account to prevent unlimited growth of the database."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else if error}
		<p class="error">{error}</p>
	{:else}
		<LoginAttempts {attempts} />
	{/if}
</Section>
