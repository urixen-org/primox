<script lang="ts">
  import { page } from "$app/stores";
  import { base } from "$app/paths";
  import { logout } from "$lib/auth";

  type Item = { group: string } | { path: string; label: string };

  const sections: Item[] = [
    { path: "/", label: "Overview" },
    { path: "/accounts", label: "Accounts" },
    { path: "/queue", label: "Queue" },
    { path: "/webhookqueue", label: "Webhook queue" },
    { group: "Operations" },
    { path: "/mtasts", label: "MTA-STS policies" },
    { group: "Configuration" },
    { path: "/config", label: "Files" },
    { path: "/loglevels", label: "Log levels" },
  ];

  $: pathname = $page.url.pathname;
  $: rel =
    (pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || "/";
</script>

<nav class="sidebar" aria-label="Main navigation">
  <div class="brand">Mox Admin</div>
  {#each sections as s}
    {#if "group" in s}
      <div class="navGroup">{s.group}</div>
    {:else}
      <a
        class="navLink"
        class:active={s.path === "/"
          ? rel === "/" || rel.startsWith("/domains/")
          : rel === s.path || rel.startsWith(s.path + "/")}
        href={base + s.path}>{s.label}</a
      >
    {/if}
  {/each}
  <div class="navGroup">Session</div>
  <button class="navLink" on:click={logout}>Logout</button>
</nav>
