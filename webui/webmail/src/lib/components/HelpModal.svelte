<script lang="ts">
	import { showHelp, serverVersion } from '$lib/state'

	const close = () => showHelp.set(false)
</script>

<div class="modal-overlay" on:click|self={close} role="presentation">
	<div class="modal wm-help">
		<div class="wm-composehead">
			<h1>Webmail help</h1>
			<button type="button" on:click={close} title="Close help">✕</button>
		</div>

		<h2>Search</h2>
		<p>The search bar accepts free-form words and filters:</p>
		<ul>
			<li><code>from:jane@example.org</code>, <code>to:...</code>, <code>subject:invoice</code></li>
			<li><code>mailbox:Archive</code> or <code>mb:Archive</code>, <code>submb:</code> to include submailboxes</li>
			<li><code>label:work</code>, <code>a:attachments</code> (or <code>a:pdf</code>, <code>a:image</code>, ...)</li>
			<li><code>start:2024-01-01</code>, <code>end:2024-12-31</code>, <code>minsize:1m</code>, <code>maxsize:10m</code></li>
			<li><code>header:List-Id:...</code></li>
			<li>Prefix a term with <code>-</code> to exclude it, and quote values with spaces.</li>
		</ul>

		<h2>Message actions</h2>
		<p>
			Select messages with the checkboxes in the list, then mark them read/unread, flag, mark as junk,
			move, or delete. Opening a message marks it read and (outside special mailboxes) as not junk.
		</p>
		<p>
			The message view can show the plain text or HTML version. HTML is rendered in a restricted
			iframe; use "HTML+external" to load remote images and styles.
		</p>

		<h2>Keyboard</h2>
		<ul>
			<li><kbd>Enter</kbd> on a focused message opens it.</li>
			<li><kbd>Esc</kbd> closes dialogs.</li>
		</ul>

		{#if $serverVersion}
			<p class="muted">Server version: {$serverVersion}</p>
		{/if}

		<div class="wm-composeactions">
			<button type="button" on:click={close}>Close</button>
		</div>
	</div>
</div>
