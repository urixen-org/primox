<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { age, errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'
	import Badge from '@mox/ui/components/Badge.svelte'

	let loading = true
	let error = ''
	let attempts: any[] = []

	onMount(async () => {
		try {
			attempts = (await client.LoginAttempts('', 0)) || []
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})
</script>

<Section title="Login attempts">
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<div style="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th>Time</th><th>Account</th><th>Login address</th><th>Result</th><th>Count</th>
						<th>Protocol</th><th>Mechanism</th><th>User agent</th><th>Remote IP</th><th>Local IP</th>
					</tr>
				</thead>
				<tbody>
					{#if attempts.length === 0}
						<tr><td colspan="10" class="muted">No login attempts in past 30 days.</td></tr>
					{/if}
					{#each attempts as la}
						<tr>
							<td title={la.Last?.toString?.() || ''}>{age(la.Last)}</td>
							<td>{la.AccountName}</td>
							<td>{la.LoginAddress}</td>
							<td>{#if la.Result === 'ok'}{la.Result}{:else}<Badge color="red">{la.Result}</Badge>{/if}</td>
							<td>{la.Count}</td>
							<td>{la.Protocol}</td>
							<td>{la.AuthMech}</td>
							<td>{la.UserAgent}</td>
							<td>{la.RemoteIP}</td>
							<td>{la.LocalIP}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
