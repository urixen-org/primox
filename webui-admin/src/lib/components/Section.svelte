<script lang="ts">
	export let title: string
	export let hint: string | undefined = undefined
</script>

<section class="section">
	<h2 title={hint}>{title}</h2>
	<slot />
</section>
