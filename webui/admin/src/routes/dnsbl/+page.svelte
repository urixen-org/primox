<script lang="ts">
  import { onMount } from "svelte";
  import { client } from "$lib/client";
  import { errmsg } from "@mox/ui/format";
  import Section from "@mox/ui/components/Section.svelte";
  import Badge from "@mox/ui/components/Badge.svelte";

  let loading = true;
  let error = "";
  let saved = false;
  let text = "";
  let status: any = {};

  onMount(async () => {
    try {
      const [cfg, [st]] = await Promise.all([
        client.Config(),
        client.DNSBLStatus(),
      ]);
      text = ((cfg as any).MonitorDNSBLs || []).join("\n");
      status = st || {};
    } catch (err) {
      error = errmsg(err);
    } finally {
      loading = false;
    }
  });

  const save = async () => {
    error = "";
    saved = false;
    try {
      await client.MonitorDNSBLsSave(text);
      saved = true;
    } catch (err) {
      error = errmsg(err);
    }
  };
</script>

<Section title="DNSBL">
  {#if loading}
    <p class="muted">Loading...</p>
  {:else}
    <h3>Monitored DNSBLs</h3>
    <p class="muted">
      One DNSBL zone per line. The special value <code
        >sbl.spamhaus.org/domain</code
      > style zones are also accepted.
    </p>
    <textarea
      bind:value={text}
      rows="6"
      style="width:100%"
      class="literal"
      placeholder="zen.spamhaus.org"
    />
    <div class="toolbar">
      <button on:click={save}>Save</button>
      {#if saved}<span class="muted">Saved.</span>{/if}
    </div>

    <h3>Status</h3>
    <table>
      <thead><tr><th>IP</th><th>DNSBL</th><th>Status</th></tr></thead>
      <tbody>
        {#if Object.keys(status).length === 0}
          <tr><td colspan="3" class="muted">No status yet.</td></tr>
        {/if}
        {#each Object.keys(status) as ip}
          {#each Object.keys(status[ip]) as zone}
            <tr>
              <td>{ip}</td>
              <td>{zone}</td>
              <td
                >{#if status[ip][zone] === "pass"}<Badge color="green"
                    >pass</Badge
                  >{:else}<Badge color="red">{status[ip][zone]}</Badge>{/if}</td
              >
            </tr>
          {/each}
        {/each}
      </tbody>
    </table>
  {/if}
  {#if error}<p class="error">{error}</p>{/if}
</Section>
