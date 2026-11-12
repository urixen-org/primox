<script lang="ts">
	export let color: 'red' | 'yellow' | 'green' | 'blue' | '' = ''
</script>

<span class="badge {color}"><slot /></span>
