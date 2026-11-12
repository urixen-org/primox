<script lang="ts">
  import { onMount } from "svelte";
  import { client } from "$lib/client";
  import { age, errmsg } from "@mox/ui/format";
  import Section from "@mox/ui/components/Section.svelte";
  import type { Suppression } from "$lib/api";

  let loading = true;
  let error = "";
  let list: Suppression[] = [];
  let address = "";
  let reason = "";

  const load = async () => {
    loading = true;
    error = "";
    try {
      list = (await client.SuppressionList()) || [];
    } catch (err) {
      error = errmsg(err);
    } finally {
      loading = false;
    }
  };

  const add = async () => {
    error = "";
    try {
      await client.SuppressionAdd(address, true, reason);
      address = "";
      reason = "";
      await load();
    } catch (err) {
      error = errmsg(err);
    }
  };

  const remove = async (addr: string) => {
    error = "";
    try {
      await client.SuppressionRemove(addr);
      await load();
    } catch (err) {
      error = errmsg(err);
    }
  };

  onMount(load);
</script>

<Section
  title="Suppression list"
  hint="Messages queued for delivery to recipients on the suppression list immediately fail. Entries can be added automatically after repeated delivery failures."
>
  <p class="muted">
    Messages queued for delivery to recipients on the suppression list will
    immediately fail.
  </p>
  {#if loading}
    <p class="muted">Loading...</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Address</th>
          <th>Manual</th>
          <th>Reason</th>
          <th>Since</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {#if list.length === 0}
          <tr><td colspan="5" class="muted">(None)</td></tr>
        {/if}
        {#each list as s}
          <tr>
            <td title={s.BaseAddress}>{s.OriginalAddress}</td>
            <td>{s.Manual ? "✓" : ""}</td>
            <td>{s.Reason}</td>
            <td title={s.Created?.toString?.() || ""}>{age(s.Created)}</td>
            <td
              ><button on:click={() => remove(s.OriginalAddress)}>Remove</button
              ></td
            >
          </tr>
        {/each}
      </tbody>
      <tfoot>
        <tr>
          <td><input bind:value={address} placeholder="address" /></td>
          <td></td>
          <td
            ><input
              bind:value={reason}
              placeholder="reason"
              style="width:100%"
            /></td
          >
          <td></td>
          <td><button on:click={add}>Add suppression</button></td>
        </tr>
      </tfoot>
    </table>
  {/if}
  {#if error}<p class="error">{error}</p>{/if}
</Section>
