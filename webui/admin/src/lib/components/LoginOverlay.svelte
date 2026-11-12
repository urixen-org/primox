<script lang="ts">
	import { loginRequest, submitLogin } from '$lib/auth'
	import { errmsg } from '@mox/ui/format'

	let password = ''
	let busy = false
	let error = ''

	const onSubmit = async (e: SubmitEvent) => {
		e.preventDefault()
		error = ''
		busy = true
		try {
			const token = await submitLogin(password)
			$loginRequest?.resolve(token)
			loginRequest.set(null)
			password = ''
		} catch (err) {
			error = errmsg(err)
		} finally {
			busy = false
		}
	}
</script>

{#if $loginRequest}
	<div class="modal-overlay">
		<form class="modal" on:submit={onSubmit}>
			<h1>Admin</h1>
			{#if $loginRequest.reason}<p class="error">{$loginRequest.reason}</p>{/if}
			<label class="field" style="display:block">
				<span>Password</span>
				<input type="password" bind:value={password} autocomplete="current-password" required />
			</label>
			{#if error}<p class="error">{error}</p>{/if}
			<div style="text-align:center; margin-top:1rem">
				<button type="submit" disabled={busy}>Login</button>
			</div>
		</form>
	</div>
{/if}
