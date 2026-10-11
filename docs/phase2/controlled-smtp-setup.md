# Dedicated authentication credential and isolated test setup

The Resend form is prepared with name **MealCaddie Supabase Auth**, **Sending access**, domain **mealcaddie.app**. The owner confirmed creation and private storage. The key list shows MealCaddie Supabase Auth with Sending access and no activity. The secret was not read or used by the agent. Domain restriction was prepared as mealcaddie.app in the creation form; verify it again before the later approved switch. Do not paste it into chat, a PR, logs, Vercel or the local mail-sink configuration. Do not rotate the working MealCaddie Production key.

Browser credential/security rules require an owner handoff for creation and credential entry. The prepared form is recorded in auth-smtp-key-prepared.png. Domain-scoped sending access still permits other sender local-parts and recipients on that domain; keep the key confidential. [Resend key permissions](https://resend.com/docs/dashboard/api-keys/introduction).

Future Supabase values remain: smtp.resend.com; port 465 with implicit TLS; username resend; dedicated key as password; sender auth@mealcaddie.app; display name MealCaddie. No shared value is entered or saved now. [Official Resend integration](https://resend.com/docs/send-with-supabase-smtp).

## Prepared isolation

The official Supabase CLI 2.120.0 initialized a separate local project under work/auth-email-lab. It is not linked to SmartCart. Its config uses localhost-only return URLs, email confirmation, 8-digit OTP, local SMTP mail sink, the six branded template files, and no real Resend/OAuth/API credentials. No production migrations, accounts or data are copied. Root application configuration is unchanged. The generated config is available as isolated-auth-lab-config.toml for review.

Docker is absent, including the standard Docker Desktop executable path. The official native runtime does not support Windows, so execution is blocked until an approved Docker/Podman setup is available. No container engine was installed, no cloud project was created and no monthly cost was added. See [Supabase runtime platform support](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes).

## Exact execution procedure after runtime setup approval

1. Install/start an owner-approved official container engine and confirm availability. Check that local ports 54320–54324 are free. Verify host bindings are loopback-only before exercising any auth endpoint. If the CLI exposes ports beyond loopback, stop and constrain them; do not expose the lab to the LAN.
2. From the separate work/auth-email-lab directory, run the pinned CLI: `npx --yes supabase@2.120.0 start`. Do not run link, db push, db reset against any remote project. Do not enable external SMTP or enter the Resend key. Local sink delivery requires no real mailbox.
3. Inspect local SMTP web UI on port 54324 and local API configuration; never copy displayed local keys into a report. Confirm six template paths load. Create only synthetic example.invalid identities through the local Auth endpoint. Use only real locally issued links/codes, in memory, without printing or saving them.
4. Exercise signup/confirmation, then existing-user magic login for both localhost return origins. Verify the two issued links return to their exact requested roots, single-use verification succeeds once, replay fails, the same user ID is retained, and only local mail appears. Inspect sender, plaintext alternative, wrapped fallback link and required variables. Do not use production or preview hostnames as actual lab callback destinations.
5. In this isolated instance only, reduce expiration for a dedicated expiry case, restore 3600 afterward, and verify old links fail. Do not shorten shared expiry or change a real password/email. Dormant recovery/invite/email-change/reauthentication templates can render here, but must not imply supported live app flows.
6. Rehearse rollback using a complete owner-confirmed original template bundle: swap local bodies/subjects, restart local Auth, compare all six hashes, then restore branded drafts and compare again. Verify active local login/confirmation after restoration. This is separate from the later shared-provider save sequence; do not claim a provider switch was tested by a file comparison alone.
7. Stop only the named local project with the CLI's documented stop command. Preserve local data for review; no destructive volume/account cleanup without explicit approval. Keep captured mail and local Auth secrets private.

CLI configuration syntax was checked against the generated configuration and [official config reference](https://supabase.com/docs/guides/local-development/cli/config). Configuration parsing will be validated locally. Container startup, mail delivery and actual restore/restart tests are **pending**, not passed. A shared SMTP switch remains blocked until the local rehearsal and full baseline are complete and separately approved.
