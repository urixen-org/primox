<script lang="ts">
	import { onMount } from 'svelte'
	import { client } from '$lib/client'
	import { errmsg } from '$lib/format'
	import { serverURL } from '$lib/base'
	import { CSRF_TOKEN_KEY } from '$lib/auth'
	import { storage } from '$lib/storage'
	import Section from '$lib/components/Section.svelte'

	let fileInput: HTMLInputElement
	let file: File | null = null
	let skipPrefix = ''
	let uploading = false
	let uploadPct = 0
	let error = ''

	let connected = false
	let counts: { mailbox: string; count: number }[] = []
	let problems: string[] = []
	let steps: string[] = []
	let done = false
	let aborted = false
	let importToken = ''
	let es: EventSource | null = null

	const resetProgress = () => {
		connected = false
		counts = []
		problems = []
		steps = []
		done = false
		aborted = false
	}

	const track = (token: string) => {
		importToken = token
		resetProgress()
		if (es) {
			es.close()
		}
		es = new EventSource(serverURL('importprogress?token=' + encodeURIComponent(token)))
		es.addEventListener('open', () => (connected = true))
		es.addEventListener('error', () => (error = 'connection error'))
		es.addEventListener('count', (ev) => {
			const d = JSON.parse((ev as MessageEvent).data)
			const i = counts.findIndex((c) => c.mailbox === d.Mailbox)
			if (i >= 0) {
				counts[i] = { mailbox: d.Mailbox, count: d.Count }
			} else {
				counts = [...counts, { mailbox: d.Mailbox, count: d.Count }]
			}
		})
		es.addEventListener('problem', (ev) => {
			const d = JSON.parse((ev as MessageEvent).data)
			problems = [...problems, d.Message]
		})
		es.addEventListener('step', (ev) => {
			const d = JSON.parse((ev as MessageEvent).data)
			steps = [...steps, d.Title]
		})
		es.addEventListener('done', () => {
			done = true
			es?.close()
			try {
				sessionStorage.removeItem('ImportToken')
			} catch {}
		})
		es.addEventListener('aborted', () => {
			aborted = true
			es?.close()
			try {
				sessionStorage.removeItem('ImportToken')
			} catch {}
		})
	}

	onMount(() => {
		let token = ''
		try {
			token = sessionStorage.getItem('ImportToken') || ''
		} catch {}
		if (token) {
			track(token)
		}
	})

	const upload = (e: SubmitEvent) => {
		e.preventDefault()
		error = ''
		if (!file) {
			error = 'file required'
			return
		}
		uploading = true
		uploadPct = 0
		resetProgress()
		const form = new FormData()
		form.append('file', file)
		form.append('skipMailboxPrefix', skipPrefix)

		const xhr = new XMLHttpRequest()
		xhr.open('POST', serverURL('import'))
		xhr.setRequestHeader('x-mox-csrf', storage.get(CSRF_TOKEN_KEY) || '')
		xhr.upload.addEventListener('progress', (ev) => {
			if (ev.lengthComputable) {
				uploadPct = Math.floor((100 * ev.loaded) / ev.total)
			}
		})
		xhr.addEventListener('load', () => {
			uploading = false
			if (xhr.status !== 200) {
				error = xhr.responseText || 'status ' + xhr.status
				return
			}
			let resp: { Token: string }
			try {
				resp = JSON.parse(xhr.responseText)
			} catch (err) {
				error = 'parsing response: ' + errmsg(err)
				return
			}
			try {
				sessionStorage.setItem('ImportToken', resp.Token)
			} catch {}
			track(resp.Token)
		})
		xhr.addEventListener('error', () => {
			uploading = false
			error = 'upload error'
		})
		xhr.send(form)
	}

	const abort = async () => {
		try {
			await client.ImportAbort(importToken)
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

<Section title="Import">
	<p class="muted">Import messages from a .zip or .tgz file with maildirs and/or mbox files.</p>
	<form on:submit={upload}>
		<label class="field"
			><span>File</span><input
				type="file"
				bind:this={fileInput}
				on:change={() => (file = fileInput.files?.[0] || null)}
			/></label
		>
		<label class="field"
			><span>Skip mailbox prefix (optional)</span><input bind:value={skipPrefix} /></label
		>
		<div class="toolbar">
			<button type="submit" disabled={uploading}>Upload and import</button>
			{#if uploading}<span class="muted">Uploading... {uploadPct}%</span>{/if}
		</div>
	</form>
	{#if error}<p class="error">{error}</p>{/if}

	{#if importToken && !done && !aborted}
		<div class="toolbar"><button on:click={abort}>Abort import</button></div>
	{/if}

	{#if counts.length || steps.length || problems.length || done || aborted || connected}
		<h3>Progress</h3>
		{#if connected && !done && !aborted}<p class="muted">Connected, waiting for updates...</p>{/if}
		{#each steps as s}
			<p><span class="badge blue">Step: {s}</span></p>
		{/each}
		{#if counts.length}
			<table>
				<thead><tr><th>Mailbox</th><th>Messages</th></tr></thead>
				<tbody>
					{#each counts as c}
						<tr><td>{c.mailbox}</td><td style="text-align:right">{c.count}</td></tr>
					{/each}
				</tbody>
			</table>
		{/if}
		{#if problems.length}
			<h3>Problems</h3>
			{#each problems as p}
				<p><span class="badge yellow">{p}</span></p>
			{/each}
		{/if}
		{#if done}<p><span class="badge blue">Import finished</span></p>{/if}
		{#if aborted}<p><span class="badge red">Import aborted, no message imported</span></p>{/if}
	{/if}
</Section>
