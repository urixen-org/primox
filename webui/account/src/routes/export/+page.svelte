<script lang="ts">
	import { serverURL } from '@mox/ui/base'
	import { CSRF_TOKEN_KEY } from '$lib/auth'
	import { storage } from '@mox/ui/storage'
	import Section from '@mox/ui/components/Section.svelte'

	let format = 'maildir'
	let archive = 'tgz'
</script>

<Section title="Export">
	<p class="muted">Export all messages in all mailboxes.</p>
	<form method="POST" action={serverURL('export')} target="_blank">
		<input type="hidden" name="csrf" value={storage.get(CSRF_TOKEN_KEY) || ''} />
		<input type="hidden" name="mailbox" value="" />
		<input type="hidden" name="recursive" value="on" />
		<div class="toolbar">
			<label><input type="radio" name="format" value="maildir" bind:group={format} /> Maildir</label>
			<label><input type="radio" name="format" value="mbox" bind:group={format} /> Mbox</label>
		</div>
		<div class="toolbar">
			<label><input type="radio" name="archive" value="tar" bind:group={archive} /> Tar</label>
			<label><input type="radio" name="archive" value="tgz" bind:group={archive} /> Tgz</label>
			<label><input type="radio" name="archive" value="zip" bind:group={archive} /> Zip</label>
		</div>
		<div class="toolbar"><button type="submit">Export</button></div>
	</form>
</Section>
