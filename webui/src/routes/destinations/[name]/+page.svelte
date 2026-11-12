<script lang="ts">
	import { onMount } from 'svelte'
	import { page } from '$app/stores'
	import { base } from '$app/paths'
	import { client } from '$lib/client'
	import { errmsg, domainName } from '$lib/format'
	import Section from '$lib/components/Section.svelte'

	type Header = { key: string; value: string }
	type RulesetRow = {
		smtpMailFromRegexp: string
		msgFromRegexp: string
		verifiedDomain: string
		isForward: boolean
		listAllowDomain: string
		acceptRejectsToMailbox: string
		mailbox: string
		comment: string
		headers: Header[]
	}

	let loading = true
	let error = ''
	let saved = false
	let notFound = false
	let name = ''
	let oldDest: any = null
	let domainASCII = ''

	let mailbox = ''
	let fullName = ''
	let smtpError = ''
	let msgAuthRequired = ''
	let rulesets: RulesetRow[] = []

	const toRows = (d: any): RulesetRow[] =>
		(d.Rulesets || []).map((rs: any) => ({
			smtpMailFromRegexp: rs.SMTPMailFromRegexp || '',
			msgFromRegexp: rs.MsgFromRegexp || '',
			verifiedDomain: rs.VerifiedDomain || '',
			isForward: !!rs.IsForward,
			listAllowDomain: rs.ListAllowDomain || '',
			acceptRejectsToMailbox: rs.AcceptRejectsToMailbox || '',
			mailbox: rs.Mailbox || '',
			comment: rs.Comment || '',
			headers: Object.entries(rs.HeadersRegexp || {}).map(([key, value]) => ({
				key,
				value: value as string,
			})),
		}))

	onMount(async () => {
		name = $page.params.name || ''
		try {
			const [acc] = await client.Account()
			domainASCII = domainName(acc.DNSDomain)
			const d = (acc.Destinations || {})[name]
			if (!d) {
				notFound = true
				return
			}
			oldDest = JSON.parse(JSON.stringify(d))
			mailbox = d.Mailbox
			fullName = d.FullName
			smtpError = d.SMTPError
			msgAuthRequired = d.MessageAuthRequiredSMTPError
			rulesets = toRows(d)
		} catch (err) {
			error = errmsg(err)
		} finally {
			loading = false
		}
	})

	const addRuleset = () => {
		rulesets = [
			...rulesets,
			{
				smtpMailFromRegexp: '',
				msgFromRegexp: '',
				verifiedDomain: '',
				isForward: false,
				listAllowDomain: '',
				acceptRejectsToMailbox: '',
				mailbox: '',
				comment: '',
				headers: [],
			},
		]
	}
	const removeRuleset = (i: number) => {
		rulesets = rulesets.filter((_, j) => j !== i)
	}
	const addHeader = (rs: RulesetRow) => {
		rs.headers = [...rs.headers, { key: '', value: '' }]
	}
	const removeHeader = (rs: RulesetRow, i: number) => {
		rs.headers = rs.headers.filter((_, j) => j !== i)
	}

	const save = async () => {
		error = ''
		saved = false
		try {
			const newDest = {
				Mailbox: mailbox,
				FullName: fullName,
				SMTPError: smtpError,
				MessageAuthRequiredSMTPError: msgAuthRequired,
				Rulesets: rulesets.map((r) => ({
					SMTPMailFromRegexp: r.smtpMailFromRegexp,
					MsgFromRegexp: r.msgFromRegexp,
					VerifiedDomain: r.verifiedDomain,
					HeadersRegexp: Object.fromEntries(
						r.headers.filter((h) => h.key).map((h) => [h.key, h.value]),
					),
					IsForward: r.isForward,
					ListAllowDomain: r.listAllowDomain,
					AcceptRejectsToMailbox: r.acceptRejectsToMailbox,
					Mailbox: r.mailbox,
					Comment: r.comment,
					VerifiedDNSDomain: { ASCII: '', Unicode: '' },
					ListAllowDNSDomain: { ASCII: '', Unicode: '' },
				})),
			}
			await client.DestinationSave(name, oldDest, newDest)
			oldDest = JSON.parse(JSON.stringify(newDest))
			saved = true
		} catch (err) {
			error = errmsg(err)
		}
	}
</script>

{#if loading}
	<p class="muted">Loading...</p>
{:else if notFound}
	<p class="error">Destination not found.</p>
{:else}
	<Section title="Destination {name}">
		<p class="muted"><a href="{base}/">← Back to overview</a></p>
		<label class="field"
			><span>Default mailbox</span><input bind:value={mailbox} placeholder="Inbox" /></label
		>
		<label class="field"><span>Full name</span><input bind:value={fullName} /></label>
		<label class="field"
			><span>Reject deliveries with SMTP error</span><input
				bind:value={smtpError}
				placeholder="421 or 550..."
			/></label
		>
		<label class="field"
			><span>Reject messages without authenticated domain</span><input
				bind:value={msgAuthRequired}
				placeholder="messages must have aligned spf/dkim..."
			/></label
		>
	</Section>

	<Section title="Rulesets">
		<p class="muted">
			Incoming messages matching a ruleset are delivered to the ruleset's mailbox instead of the
			default mailbox.
		</p>
		<div style="overflow-x:auto">
			<table>
				<thead>
					<tr>
						<th>SMTP MAIL FROM regexp</th>
						<th>Message From regexp</th>
						<th>Verified domain</th>
						<th>Headers regexp</th>
						<th>Is forward</th>
						<th>List allow domain</th>
						<th>Allow rejects to mailbox</th>
						<th>Mailbox</th>
						<th>Comment</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#if rulesets.length === 0}
						<tr><td colspan="10" class="muted">None</td></tr>
					{/if}
					{#each rulesets as rs, i}
						<tr>
							<td><input bind:value={rs.smtpMailFromRegexp} /></td>
							<td><input bind:value={rs.msgFromRegexp} /></td>
							<td><input bind:value={rs.verifiedDomain} /></td>
							<td>
								{#each rs.headers as h, j}
									<div class="toolbar" style="margin:0">
										<input bind:value={h.key} placeholder="field" />
										<input bind:value={h.value} placeholder="value" />
										<button type="button" on:click={() => removeHeader(rs, j)}>−</button>
									</div>
								{/each}
								<button type="button" on:click={() => addHeader(rs)}>+ header</button>
							</td>
							<td><input type="checkbox" bind:checked={rs.isForward} /></td>
							<td><input bind:value={rs.listAllowDomain} /></td>
							<td><input bind:value={rs.acceptRejectsToMailbox} /></td>
							<td><input bind:value={rs.mailbox} /></td>
							<td><input bind:value={rs.comment} /></td>
							<td><button type="button" on:click={() => removeRuleset(i)}>Remove</button></td>
						</tr>
					{/each}
				</tbody>
				<tfoot>
					<tr>
						<td colspan="10"><button type="button" on:click={addRuleset}>Add ruleset</button></td>
					</tr>
				</tfoot>
			</table>
		</div>
		<div class="toolbar">
			<button on:click={save}>Save</button>
			{#if saved}<span class="muted">Saved.</span>{/if}
		</div>
		{#if error}<p class="error">{error}</p>{/if}
	</Section>

	<Section title="Email client profile">
		<p class="muted">
			Apple mail clients can be configured with a mobileconfig profile:
		</p>
		<p>
			<a
				href="https://autoconfig.{domainASCII}/profile.mobileconfig?addresses={encodeURIComponent(
					name,
				)}&name={encodeURIComponent(fullName)}"
				download>Download .mobileconfig email account profile</a
			>
		</p>
	</Section>
{/if}
