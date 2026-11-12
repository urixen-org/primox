<script lang="ts">
	import { age } from '@mox/ui/format'
	import Badge from '@mox/ui/components/Badge.svelte'

	export let attempts: any[]
</script>

<table>
	<thead>
		<tr>
			<th>Time</th>
			<th>Result</th>
			<th>Count</th>
			<th>Login address</th>
			<th>Protocol</th>
			<th>Mechanism</th>
			<th>User agent</th>
			<th>Remote IP</th>
			<th>Local IP</th>
			<th>TLS</th>
			<th>TLS pubkey fingerprint</th>
			<th>First seen</th>
		</tr>
	</thead>
	<tbody>
		{#if attempts.length === 0}
			<tr><td colspan="12" class="muted">No login attempts in past 30 days.</td></tr>
		{/if}
		{#each attempts as la}
			<tr>
				<td title={la.Last?.toString?.() || ''}>{age(la.Last)}</td>
				<td>{#if la.Result === 'ok'}{la.Result}{:else}<Badge color="red">{la.Result}</Badge>{/if}</td>
				<td>{la.Count}</td>
				<td>{la.LoginAddress}</td>
				<td>{la.Protocol}</td>
				<td>{la.AuthMech}</td>
				<td>{la.UserAgent}</td>
				<td>{la.RemoteIP}</td>
				<td>{la.LocalIP}</td>
				<td>{la.TLS}</td>
				<td>{la.TLSPubKeyFingerprint}</td>
				<td title={la.First?.toString?.() || ''}>{age(la.First)}</td>
			</tr>
		{/each}
	</tbody>
</table>
