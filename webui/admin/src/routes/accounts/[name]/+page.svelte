<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/stores";
  import { base } from "$app/paths";
  import { client } from "$lib/client";
  import { errmsg, formatQuotaSize, parseQuotaSize } from "@mox/ui/format";
  import Section from "@mox/ui/components/Section.svelte";

  let loading = true;
  let error = "";
  let name = "";
  let acc: any = null;
  let address = "";
  let newPassword = "";
  let loginDisabled = "";
  let maxOut = "1000";
  let maxFirst = "200";
  let quota = "";
  let firstTimeDelay = false;
  let noCustomPassword = false;
  let saved = false;

  const load = async () => {
    loading = true;
    error = "";
    try {
      const [a] = await client.Account(name);
      acc = a;
      loginDisabled = a.LoginDisabled;
      maxOut = "" + (a.MaxOutgoingMessagesPerDay || 1000);
      maxFirst = "" + (a.MaxFirstTimeRecipientsPerDay || 200);
      quota = formatQuotaSize(a.QuotaMessageSize);
      firstTimeDelay = !a.NoFirstTimeSenderDelay;
      noCustomPassword = a.NoCustomPassword;
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

  const addAddress = async (e: SubmitEvent) => {
    e.preventDefault();
    error = "";
    try {
      await client.AddressAdd(address, name);
      address = "";
      await load();
    } catch (err) {
      error = errmsg(err);
    }
  };
  const removeAddress = async (addr: string) => {
    if (!window.confirm("Remove address " + addr + "?")) return;
    error = "";
    try {
      await client.AddressRemove(addr);
      await load();
    } catch (err) {
      error = errmsg(err);
    }
  };
  const setPassword = async (e: SubmitEvent) => {
    e.preventDefault();
    error = "";
    saved = false;
    try {
      await client.SetPassword(name, newPassword);
      newPassword = "";
      saved = true;
    } catch (err) {
      error = errmsg(err);
    }
  };
  const saveLoginDisabled = async (e: SubmitEvent) => {
    e.preventDefault();
    error = "";
    saved = false;
    try {
      await client.AccountLoginDisabledSave(name, loginDisabled);
      saved = true;
    } catch (err) {
      error = errmsg(err);
    }
  };
  const saveSettings = async (e: SubmitEvent) => {
    e.preventDefault();
    error = "";
    saved = false;
    try {
      await client.AccountSettingsSave(
        name,
        parseInt(maxOut) || 0,
        parseInt(maxFirst) || 0,
        parseQuotaSize(quota),
        firstTimeDelay,
        noCustomPassword,
      );
      saved = true;
    } catch (err) {
      error = errmsg(err);
    }
  };

  const removeAccount = async () => {
    if (!window.confirm("Remove account " + name + "? This cannot be undone."))
      return;
    error = "";
    try {
      await client.AccountRemove(name);
      window.location.hash = "";
      window.location.href = base + "/accounts";
    } catch (err) {
      error = errmsg(err);
    }
  };
</script>

{#if loading}
  <p class="muted">Loading...</p>
{:else if !acc}
  <p class="error">Account not found.</p>
{:else}
  <Section title="Account {name}">
    <p class="muted"><a href="{base}/accounts">← Back to accounts</a></p>
    <p>Full name: {acc.FullName || "(none)"}</p>
    {#if acc.LoginDisabled}<p>
        <span class="badge yellow">Login disabled: {acc.LoginDisabled}</span>
      </p>{/if}
  </Section>

  <Section title="Addresses">
    <ul>
      {#if Object.keys(acc.Destinations || {}).length === 0}<li class="muted">
          (None)
        </li>{/if}
      {#each Object.keys(acc.Destinations || {}).sort() as addr}
        <li>
          {addr} <button on:click={() => removeAddress(addr)}>Remove</button>
        </li>
      {/each}
    </ul>
    <form on:submit={addAddress}>
      <label class="field"
        ><span>Address</span><input bind:value={address} required /></label
      >
      <div class="toolbar"><button type="submit">Add address</button></div>
    </form>
  </Section>

  <Section title="Password">
    <form on:submit={setPassword}>
      <label class="field"
        ><span>New password</span><input
          type="password"
          bind:value={newPassword}
          required
        /></label
      >
      <div class="toolbar">
        <button type="submit">Set password</button>{#if saved}<span
            class="muted">Saved.</span
          >{/if}
      </div>
    </form>
  </Section>

  <Section title="Login">
    <form on:submit={saveLoginDisabled}>
      <label class="field"
        ><span>Login disabled message (empty to enable login)</span><input
          bind:value={loginDisabled}
        /></label
      >
      <div class="toolbar"><button type="submit">Save</button></div>
    </form>
  </Section>

  <Section title="Settings">
    <form on:submit={saveSettings}>
      <label class="field"
        ><span>Max outgoing messages per day</span><input
          type="number"
          bind:value={maxOut}
        /></label
      >
      <label class="field"
        ><span>Max first-time recipients per day</span><input
          type="number"
          bind:value={maxFirst}
        /></label
      >
      <label class="field"
        ><span>Disk usage quota</span><input
          bind:value={quota}
          placeholder="1g"
        /></label
      >
      <div class="toolbar">
        <label
          ><input type="checkbox" bind:checked={firstTimeDelay} /> Delay deliveries
          from first-time senders</label
        >
      </div>
      <div class="toolbar">
        <label
          ><input type="checkbox" bind:checked={noCustomPassword} /> Don't allow account
          to set a password of their choice</label
        >
      </div>
      <div class="toolbar"><button type="submit">Save settings</button></div>
    </form>
  </Section>

  <Section title="Remove account">
    <button on:click={removeAccount}>Remove account</button>
  </Section>

  {#if error}<p class="error">{error}</p>{/if}
{/if}
