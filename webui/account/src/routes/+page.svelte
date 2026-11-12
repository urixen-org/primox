<script lang="ts">
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import { client } from "$lib/client";
  import {
    errmsg,
    domainName,
    domainString,
    formatQuotaSize,
  } from "@mox/ui/format";
  import Section from "@mox/ui/components/Section.svelte";
  import LoginAttempts from "$lib/components/LoginAttempts.svelte";
  import type { Account, LoginAttempt } from "$lib/api";

  let acc: Account | null = null;
  let storageUsed = 0;
  let storageLimit = 0;
  let attempts: LoginAttempt[] = [];
  let loading = true;
  let error = "";

  let fullName = "";
  let savingName = false;
  let savedName = false;

  const load = async () => {
    loading = true;
    error = "";
    try {
      const [a, used, limit] = await client.Account();
      acc = a;
      storageUsed = used;
      storageLimit = limit;
      fullName = a.FullName;
      attempts = (await client.LoginAttempts(10)) || [];
    } catch (err) {
      error = errmsg(err);
    } finally {
      loading = false;
    }
  };

  const saveName = async (e: SubmitEvent) => {
    e.preventDefault();
    savingName = true;
    savedName = false;
    error = "";
    try {
      await client.AccountSaveFullName(fullName);
      savedName = true;
    } catch (err) {
      error = errmsg(err);
    } finally {
      savingName = false;
    }
  };

  onMount(load);
</script>

{#if loading}
  <p class="muted">Loading...</p>
{:else if error && !acc}
  <p class="error">{error}</p>
{:else if acc}
  <Section title="Account">
    <p class="muted">
      Default domain: {acc.DNSDomain.ASCII
        ? domainString(acc.DNSDomain)
        : "(none)"}
    </p>
    <form on:submit={saveName}>
      <label class="field">
        <span>Full name</span>
        <input
          bind:value={fullName}
          title="Name to use in From header when composing messages. Can be overridden per configured address."
        />
      </label>
      <button type="submit" disabled={savingName}>Save</button>
      {#if savedName}<span class="muted" style="margin-left:.5rem">Saved.</span
        >{/if}
    </form>
    {#if error}<p class="error">{error}</p>{/if}
  </Section>

  <Section title="Addresses">
    {#if Object.entries(acc.Destinations || {}).length === 0}
      <p class="muted">(None, login disabled)</p>
    {:else}
      <ul>
        {#each Object.entries(acc.Destinations || {}).sort() as [addr]}
          <li>
            <a href="{base}/destinations/{encodeURIComponent(addr)}">{addr}</a
            >{addr.startsWith("@") ? " (catchall)" : ""}
          </li>
        {/each}
      </ul>
    {/if}
  </Section>

  <Section title="Aliases/lists">
    {#if !acc.Aliases || acc.Aliases.length === 0}
      <p class="muted">None</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Alias address</th>
            <th>Subscription address</th>
            <th>Allowed senders</th>
            <th>Send as alias</th>
          </tr>
        </thead>
        <tbody>
          {#each acc.Aliases as a}
            <tr>
              <td>{a.Alias.LocalpartStr}@{domainName(a.Alias.Domain)}</td>
              <td>{a.SubscriptionAddress}</td>
              <td>{a.Alias.PostPublic ? "Anyone" : "Members only"}</td>
              <td>{a.Alias.AllowMsgFrom ? "Yes" : "No"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </Section>

  <Section title="Disk usage">
    <p>
      Storage used is <b
        >{formatQuotaSize(
          Math.floor(storageUsed / (1024 * 1024)) * 1024 * 1024,
        )}</b
      >{#if storageLimit > 0}, limit is <b>{formatQuotaSize(storageLimit)}</b>
        ({Math.floor((100 * storageUsed) / storageLimit)}%).{:else}, no explicit
        limit is configured.{/if}
    </p>
  </Section>

  <Section
    title="Recent login attempts"
    hint="Login attempts are stored for 30 days. At most 10000 failed login attempts are stored to prevent unlimited growth of the database."
  >
    <LoginAttempts {attempts} />
    {#if attempts.length >= 10}
      <p><a href="{base}/loginattempts">See all login attempts</a>.</p>
    {/if}
  </Section>
{/if}
