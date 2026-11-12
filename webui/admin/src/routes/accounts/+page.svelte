<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import { client } from "$lib/client";
  import { errmsg } from "@mox/ui/format";
  import Section from "@mox/ui/components/Section.svelte";

  let loading = true;
  let error = "";
  let accounts: string[] = [];
  let disabled: string[] = [];
  let address = "";
  let name = "";
  let saved = false;

  const load = async () => {
    loading = true;
    error = "";
    try {
      const [a, d] = await client.Accounts();
      accounts = a || [];
      disabled = d || [];
    } catch (err) {
      error = errmsg(err);
    } finally {
      loading = false;
    }
  };
  onMount(load);

  const submit = async (e: SubmitEvent) => {
    e.preventDefault();
    error = "";
    saved = false;
    try {
      await client.AccountAdd(name, address);
      address = "";
      name = "";
      saved = true;
      await load();
    } catch (err) {
      error = errmsg(err);
    }
  };
</script>

<Section title="Accounts">
  {#if loading}
    <p class="muted">Loading...</p>
  {:else}
    <ul>
      {#if accounts.length === 0}<li class="muted">(None)</li>{/if}
      {#each accounts as a}<li>
          <a href="{base}/accounts/{encodeURIComponent(a)}">{a}</a>
        </li>{/each}
    </ul>
    {#if disabled.length}
      <h3>Disabled</h3>
      <ul>
        {#each disabled as a}<li>{a} (disabled)</li>{/each}
      </ul>
    {/if}
  {/if}
</Section>

<Section title="Add account">
  <form on:submit={submit}>
    <label class="field"
      ><span>Email address</span><input bind:value={address} required /></label
    >
    <label class="field"
      ><span>Account name</span><input bind:value={name} required /></label
    >
    <div class="toolbar">
      <button type="submit">Add account</button>
      {#if saved}<span class="muted">Added.</span>{/if}
    </div>
  </form>
  {#if error}<p class="error">{error}</p>{/if}
</Section>
