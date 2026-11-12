<script lang="ts">
  import { onMount } from "svelte";
  import { client } from "$lib/client";
  import { errmsg } from "$lib/format";
  import Section from "$lib/components/Section.svelte";

  const events = [
    "delivered",
    "suppressed",
    "delayed",
    "failed",
    "relayed",
    "expanded",
    "canceled",
    "unrecognized",
  ];

  let loading = true;
  let error = "";
  let savedOut = false;
  let savedIn = false;

  let outURL = "";
  let outAuth = "";
  let outEvents: string[] = [];

  let inURL = "";
  let inAuth = "";

  let testKind: "" | "outgoing" | "incoming" = "";
  let testJSON = "";
  let testResult = "";

  onMount(async () => {
    try {
      const [acc] = await client.Account();
      outURL = acc.OutgoingWebhook?.URL || "";
      outAuth = acc.OutgoingWebhook?.Authorization || "";
      outEvents = [...(acc.OutgoingWebhook?.Events || [])];
      inURL = acc.IncomingWebhook?.URL || "";
      inAuth = acc.IncomingWebhook?.Authorization || "";
    } catch (err) {
      error = errmsg(err);
    } finally {
      loading = false;
    }
  });

  const basic = (current: string): string => {
    const u = window.prompt("Username");
    if (u === null) return current;
    const p = window.prompt("Password (shown in clear)");
    if (p === null) return current;
    return "Basic " + btoa(u + ":" + p);
  };

  const saveOut = async (e: SubmitEvent) => {
    e.preventDefault();
    error = "";
    savedOut = false;
    try {
      await client.OutgoingWebhookSave(outURL, outAuth, outEvents);
      savedOut = true;
    } catch (err) {
      error = errmsg(err);
    }
  };

  const saveIn = async (e: SubmitEvent) => {
    e.preventDefault();
    error = "";
    savedIn = false;
    try {
      await client.IncomingWebhookSave(inURL, inAuth);
      savedIn = true;
    } catch (err) {
      error = errmsg(err);
    }
  };

  const outgoingDefault = () => ({
    Version: 0,
    Event: "delivered",
    DSN: false,
    Suppressing: false,
    QueueMsgID: 1,
    FromID: "abc123",
    MessageID: "<test@localhost>",
    Subject: "Test message",
    WebhookQueued: new Date(),
    SMTPCode: 0,
    SMTPEnhancedCode: "",
    Error: "",
  });

  const incomingDefault = () => ({
    Version: 0,
    From: [{ Name: "Remote", Address: "remote@remote.example" }],
    To: [{ Name: "", Address: "mox@localhost" }],
    Subject: "Test message",
    MessageID: "<test@remote.example>",
    InReplyTo: "",
    Text: "This is a test message.",
    HTML: "",
    Structure: {
      ContentType: "text/plain",
      ContentID: "",
      ContentDisposition: "",
      Filename: "",
      DecodedSize: 21,
    },
    Meta: {
      MsgID: 1,
      MailFrom: "remote@remote.example",
      MailFromValidated: true,
      MsgFromValidated: true,
      RcptTo: "mox@localhost",
      RemoteIP: "127.0.0.1",
      Received: new Date(),
      MailboxName: "Inbox",
      Automated: false,
    },
  });

  const openTest = (kind: "outgoing" | "incoming") => {
    testKind = kind;
    testResult = "";
    testJSON = JSON.stringify(
      kind === "outgoing" ? outgoingDefault() : incomingDefault(),
      undefined,
      "\t",
    );
  };

  const runTest = async () => {
    testResult = "";
    try {
      const data = JSON.parse(testJSON);
      if (testKind === "outgoing") {
        const [code, resp, err] = await client.OutgoingWebhookTest(
          outURL,
          outAuth,
          data,
        );
        testResult = "HTTP " + code + (err ? " - " + err : "") + "\n\n" + resp;
      } else {
        const [code, resp, err] = await client.IncomingWebhookTest(
          inURL,
          inAuth,
          data,
        );
        testResult = "HTTP " + code + (err ? " - " + err : "") + "\n\n" + resp;
      }
    } catch (err) {
      testResult = errmsg(err);
    }
  };
</script>

<Section
  title="Webhooks"
  hint="Webhooks are HTTP POSTs for events about outgoing deliveries and incoming messages."
>
  {#if loading}
    <p class="muted">Loading...</p>
  {:else}
    <h3>Outgoing</h3>
    <form on:submit={saveOut}>
      <label class="field"
        ><span>URL</span><input
          bind:value={outURL}
          style="min-width:28rem"
        /></label
      >
      <label class="field"
        ><span>Authorization header</span><input bind:value={outAuth} /><span
          class="muted"
          style="display:block; font-size:.85em"
          ><button type="button" on:click={() => (outAuth = basic(outAuth))}
            >Basic</button
          > authentication header</span
        ></label
      >
      <label class="field"
        ><span>Events</span><select multiple size="8" bind:value={outEvents}
          >{#each events as ev}<option value={ev}>{ev}</option>{/each}</select
        ></label
      >
      <div class="toolbar">
        <button type="submit">Save</button>
        <button type="button" on:click={() => openTest("outgoing")}>Test</button
        >
        {#if savedOut}<span class="muted">Saved.</span>{/if}
      </div>
    </form>

    <h3>Incoming</h3>
    <form on:submit={saveIn}>
      <label class="field"
        ><span>URL</span><input
          bind:value={inURL}
          style="min-width:28rem"
        /></label
      >
      <label class="field"
        ><span>Authorization header</span><input bind:value={inAuth} /><span
          class="muted"
          style="display:block; font-size:.85em"
          ><button type="button" on:click={() => (inAuth = basic(inAuth))}
            >Basic</button
          > authentication header</span
        ></label
      >
      <div class="toolbar">
        <button type="submit">Save</button>
        <button type="button" on:click={() => openTest("incoming")}>Test</button
        >
        {#if savedIn}<span class="muted">Saved.</span>{/if}
      </div>
    </form>
  {/if}
  {#if error}<p class="error">{error}</p>{/if}
</Section>

{#if testKind}
  <div class="modal-overlay">
    <div class="modal" style="width:min(46rem,95vw)">
      <h2>Test {testKind} webhook</h2>
      <p class="muted">Post the JSON below to the configured URL.</p>
      <textarea
        bind:value={testJSON}
        rows="18"
        style="width:100%"
        class="literal"
      />
      <div class="toolbar">
        <button type="button" on:click={runTest}>Post</button>
        <button type="button" on:click={() => (testKind = "")}>Close</button>
      </div>
      {#if testResult}
        <pre class="literal">{testResult}</pre>
      {/if}
    </div>
  </div>
{/if}
