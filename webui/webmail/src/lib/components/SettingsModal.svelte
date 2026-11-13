<script lang="ts">
	import { get } from 'svelte/store'
	import { accountSettings, saveSettings, showSettings } from '$lib/state'
	import { Quoting, type Settings } from '$lib/api'
	import { errmsg } from '@mox/ui/format'

	const initial = get(accountSettings)
	let signature = initial?.Signature || ''
	let quoting = initial?.Quoting || Quoting.Default
	let showAddressSecurity = initial?.ShowAddressSecurity || false
	let showHTML = initial?.ShowHTML || false
	let showShortcuts = !(initial?.NoShowShortcuts || false)
	let showHeaders = (initial?.ShowHeaders || []).join('\n')
	let busy = false
	let error = ''
	let saved = false

	const save = async (e: SubmitEvent) => {
		e.preventDefault()
		busy = true
		error = ''
		saved = false
		const s: Settings = {
			ID: initial?.ID || 1,
			Signature: signature,
			Quoting: quoting,
			ShowAddressSecurity: showAddressSecurity,
			ShowHTML: showHTML,
			NoShowShortcuts: !showShortcuts,
			ShowHeaders: showHeaders
				.split('\n')
				.map((v) => v.trim())
				.filter((v) => !!v),
		}
		try {
			await saveSettings(s)
			saved = true
		} catch (err) {
			error = errmsg(err)
		} finally {
			busy = false
		}
	}
</script>

<div class="modal-overlay">
	<form class="modal wm-settings" on:submit={save}>
		<h1>Settings</h1>
		<label class="field" style="display:block">
			<span>Signature</span>
			<textarea bind:value={signature} rows="4" style="width:100%"></textarea>
		</label>
		<label class="field" style="display:block">
			<span>Reply above/below original</span>
			<select bind:value={quoting}>
				<option value={Quoting.Default}>Auto</option>
				<option value={Quoting.Bottom}>Bottom</option>
				<option value={Quoting.Top}>Top</option>
			</select>
		</label>
		<label class="wm-composecheck">
			<input type="checkbox" bind:checked={showAddressSecurity} />
			Show address security indications
		</label>
		<label class="wm-composecheck">
			<input type="checkbox" bind:checked={showHTML} />
			Show email as HTML instead of text by default for first-time senders
		</label>
		<label class="wm-composecheck">
			<input type="checkbox" bind:checked={showShortcuts} />
			Show shortcut keys in bottom left after interaction with mouse
		</label>
		<label class="field" style="display:block">
			<span>Show additional headers</span>
			<textarea bind:value={showHeaders} rows="4" style="width:100%"></textarea>
			<span class="muted">One header name per line, e.g. Delivered-To, X-Mox-Reason, User-Agent.</span>
		</label>
		{#if error}<p class="error">{error}</p>{/if}
		{#if saved}<p class="muted">Saved.</p>{/if}
		<div class="wm-composeactions">
			<button type="submit" class="primary" disabled={busy}>Save</button>
			<button type="button" on:click={() => showSettings.set(false)}>Close</button>
		</div>
	</form>
</div>
