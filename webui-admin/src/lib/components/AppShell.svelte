<script lang="ts">
	import { onMount } from 'svelte'
	import Sidebar from './Sidebar.svelte'
	import LoginOverlay from './LoginOverlay.svelte'

	onMount(() => {
		const root = document.getElementById('page')
		const hook = (window as unknown as { moxBeforeDisplay?: (r: HTMLElement) => void })
			.moxBeforeDisplay
		if (root && hook) {
			hook(root)
		}
	})
</script>

<div class="app">
	<Sidebar />
	<main class="content">
		<slot />
	</main>
</div>
<LoginOverlay />
