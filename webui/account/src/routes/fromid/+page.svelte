<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '@mox/ui/format'
	import Section from '@mox/ui/components/Section.svelte'

	let loading = true
	let error = ''
	let saved = false
	let addresses: string[] = []

	onMount(async () => {
		try {
			const [acc] = await client.Account()
			addresses = [...(acc.FromIDLoginAddresses || [])]
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})

	const add = () => {
		addresses = [...addresses, '']
	}
	const remove = (i: number) => {
		addresses = addresses.filter((_, j) => j !== i)
	}

	const save = async (e: SubmitEvent) => {
		e.preventDefault()
		error = ''
		saved = false
		try {
			await client.FromIDLoginAddressesSave(addresses)
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section
	title="Unique SMTP MAIL FROM login addresses (FromID)"
	hint="Login addresses that cause outgoing email to be sent with a unique id in the SMTP MAIL FROM address, so delivery status notifications can be related to the original message and recipient."
>
	{#if loading}
		<p class="muted">Loading...</p>
	{:else}
		<form on:submit={save}>
			<table>
				<tbody>
					{#if addresses.length === 0}
						<tr><td class="muted">(None)</td><td></td></tr>
					{/if}
					{#each addresses as _, i}
						<tr>
							<td><input bind:value={addresses[i]} required /></td>
							<td><button type="button" on:click={() => remove(i)}>Remove</button></td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr><td></td><td><button type="button" on:click={add}>Add</button></td></tr>
					<tr>
						<td colspan="2">
							<button type="submit">Save</button>
							{#if saved}<span class="muted">Saved.</span>{/if}
						</td>
					</tr>
				</tfoot>
			</table>
		</form>
	{/if}
	{#if error}<p class="error">{error}</p>{/if}
</Section>
