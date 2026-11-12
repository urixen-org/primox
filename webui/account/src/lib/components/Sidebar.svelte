<script lang="ts">
  import { page } from "$app/stores";
  import { base } from "$app/paths";
  import { storage } from "@mox/ui/storage";
  import { logout, ADDRESS_KEY } from "$lib/auth";

  type Item = { group: string } | { path: string; label: string };

  // Single source of truth for navigation. The active item is derived from the
  // current route directly in the template (not via a helper function) so Svelte
  // re-evaluates it on client-side navigation.
  const sections: Item[] = [
    { path: "/", label: "Overview" },
    { path: "/password", label: "Password" },
    { path: "/loginattempts", label: "Login attempts" },
    { group: "Settings" },
    { path: "/tls", label: "TLS public keys" },
    { path: "/junkflags", label: "Automatic junk flags" },
    { path: "/junkfilter", label: "Junk filter" },
    { path: "/introbox", label: "Introbox" },
    { path: "/rejects", label: "Rejects" },
    { path: "/retired", label: "Keep retired" },
    { path: "/fromid", label: "FromID addresses" },
    { path: "/suppressions", label: "Suppression list" },
    { path: "/imap", label: "IMAP" },
    { group: "Webhooks" },
    { path: "/webhooks", label: "Webhooks" },
    { group: "Data" },
    { path: "/export", label: "Export" },
    { path: "/import", label: "Import" },
  ];

  $: pathname = $page.url.pathname;
  $: rel =
    (pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || "/";
  $: address = storage.get(ADDRESS_KEY) || "(unknown)";
</script>

<nav class="sidebar" aria-label="Main navigation">
  <div class="brand">Mox Account</div>
  <div class="muted" style="font-size:.8rem; margin-bottom:1rem">{address}</div>
  {#each sections as s}
    {#if "group" in s}
      <div class="navGroup">{s.group}</div>
    {:else}
      <a
        class="navLink"
        class:active={s.path === "/"
          ? rel === "/" || rel.startsWith("/destinations/")
          : rel === s.path || rel.startsWith(s.path + "/")}
        href={base + s.path}>{s.label}</a
      >
    {/if}
  {/each}
  <div class="navGroup">Session</div>
  <button class="navLink" on:click={logout}>Logout</button>
</nav>
