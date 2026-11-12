<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { base } from "$app/paths";
  import { client } from "$lib/client";
  import { errmsg } from "$lib/format";
  import Section from "$lib/components/Section.svelte";

  let loading = true;
  let error = "";
  let name = "";
  let config: any = null;
  let records: string[] = [];
  let check: any = null;
  let checking = false;

  const load = async () => {
    loading = true;
    error = "";
    try {
      config = await client.DomainConfig(name);
      records = (await client.DomainRecords(name)) || [];
    } catch (err) {
      error = errmsg(err);
    } finally {
      loading = false;
    }
  };
  onMount(() => {
    name = $page.params.name || "";
    load();
  });

  const runCheck = async () => {
    checking = true;
    error = "";
    try {
      check = await client.CheckDomain(name);
    } catch (err) {
      error = errmsg(err);
    } finally {
      checking = false;
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove domain " + name + "? This cannot be undone."))
      return;
    error = "";
    try {
      await client.DomainRemove(name);
      window.location.href = base + "/";
    } catch (err) {
      error = errmsg(err);
    }
  };
</script>

{#if loading}
  <p class="muted">Loading...</p>
{:else if !config}
  <p class="error">Domain not found.</p>
{:else}
  <Section title="Domain {name}">
    <p class="muted"><a href="{base}/">← Back to overview</a></p>
    {#if config.Disabled}<p>
        <span class="badge yellow">Domain is disabled.</span>
      </p>{/if}
  </Section>

  <Section title="Required DNS records">
    <pre class="literal">{records.join("\n")}</pre>
  </Section>

  <Section title="Configuration">
    <pre class="literal">{JSON.stringify(config, undefined, "\t")}</pre>
  </Section>

  <Section title="DNS check">
    <button on:click={runCheck} disabled={checking}
      >{checking ? "Checking..." : "Run DNS check"}</button
    >
    {#if check}
      {#each Object.entries(check) as [k, v]}
        {#if k !== "Domain"}
          <details>
            <summary>{k}</summary>
            <pre class="literal">{JSON.stringify(v, undefined, "\t")}</pre>
          </details>
        {/if}
      {/each}
    {/if}
  </Section>

  <Section title="Remove domain">
    <button on:click={remove}>Remove domain</button>
  </Section>

  {#if error}<p class="error">{error}</p>{/if}
{/if}
