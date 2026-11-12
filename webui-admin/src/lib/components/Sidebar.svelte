<script lang="ts">
  import { page } from "$app/stores";
  import { base } from "$app/paths";
  import { logout } from "$lib/auth";

  type Item = { group: string } | { path: string; label: string };

  const sections: Item[] = [
    { path: "/", label: "Overview" },
    { path: "/accounts", label: "Accounts" },
    { path: "/loginattempts", label: "Login attempts" },
    { group: "Queues" },
    { path: "/queue", label: "Outgoing" },
    { path: "/queue/retired", label: "Retired" },
    { path: "/webhookqueue", label: "Webhook queue" },
    { path: "/webhookqueue/retired", label: "Webhook retired" },
    { group: "Reports" },
    { path: "/dmarc", label: "DMARC" },
    { path: "/tlsrpt", label: "TLS-RPT" },
    { path: "/mtasts", label: "MTA-STS" },
    { group: "Configuration" },
    { path: "/routes", label: "Routes" },
    { path: "/webserver", label: "Webserver" },
    { path: "/config", label: "Files" },
    { path: "/loglevels", label: "Log levels" },
  ];

  $: pathname = $page.url.pathname;
  $: rel =
    (pathname.startsWith(base) ? pathname.slice(base.length) : pathname) || "/";
  // Longest matching section wins, so /queue/retired beats /queue.
  $: activePath = (() => {
    let best = "";
    for (const s of sections) {
      if ("path" in s) {
        const p = s.path;
        const match =
          p === "/"
            ? rel === "/" || rel.startsWith("/domains/")
            : rel === p || rel.startsWith(p + "/");
        if (match && p.length > best.length) {
          best = p;
        }
      }
    }
    return best;
  })();
</script>

<nav class="sidebar" aria-label="Main navigation">
  <div class="brand">Mox Admin</div>
  {#each sections as s}
    {#if "group" in s}
      <div class="navGroup">{s.group}</div>
    {:else}
      <a
        class="navLink"
        class:active={s.path === activePath}
        href={base + s.path}>{s.label}</a
      >
    {/if}
  {/each}
  <div class="navGroup">Session</div>
  <button class="navLink" on:click={logout}>Logout</button>
</nav>
