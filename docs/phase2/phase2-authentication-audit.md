# Phase 2 authentication audit

## Scope and evidence

Read-only inspection of the feature branch, live SmartCart authentication settings and database permissions. Supabase project mwxvorzrausbnqzjrhqm is shared with production. No SMTP, provider, template, account, session, subscription, redirect or DNS setting was saved in this stage. The actual page imports smart-cart-app.fixed.tsx; the older similarly named component is not the active app.

## Active flows

| Flow | Current behavior | Phase 2 recommendation |
|---|---|---|
| Google | Enabled. Client requests current origin plus `/`; account chooser/consent is requested. | Preserve provider and Supabase OAuth callback. Recheck production and protected preview with owner-controlled accounts during the approved test window. |
| Email magic link | Enabled; signInWithOtp supplies email only. Existing users receive magic-link mail. | Explicitly select the exact approved origin in emailRedirectTo in a separately reviewed fix. Currently preview requests can land on the production Site URL. |
| New email account | Signups and email confirmation enabled; default OTP signup creates a user if needed. | Preserve existing open account/guest access. Account creation is distinct from invitation-only beta participation. |
| Account invitations | Supabase template exists; no application inviteUserByEmail flow. | Dormant draft only. Beta invitations need their own workflow. |
| Password recovery | Template exists; no password login/reset/recovery UI found. | Dormant draft. Do not activate without a working approved recovery screen. |
| Email change | Template and secure change setting exist; no application updateUser flow. | Dormant draft. Preserve dual old/new address confirmation. |
| Reauthentication | Template exists; no application reauthentication flow. | Dormant draft. Preserve the dynamic Token variable. |

The client uses supabase-js defaults, with no SSR/PKCE callback implementation found. Do not combine a flow migration with branding. Supabase handles the existing implicit callback. Do not log URL fragments, sessions or auth links. New-account behavior is documented by [Supabase passwordless email](https://supabase.com/docs/guides/auth/auth-email-passwordless).

## Live settings inspected

Google and Email enabled; other providers disabled. Manual linking and anonymous Supabase sign-in disabled. App guest access does not depend on anonymous Auth. Confirm email and secure email change enabled. Secure password change/current-password requirement disabled. Seven optional security notification switches disabled. Custom SMTP disabled. Email OTP expires after 3600 seconds and its length is 8 digits: drafts use Token dynamically and do not assume a code length.

Visible rate limits: token refresh 150 per 5 minutes/IP; verification 30 per 5 minutes/IP; signup/sign-in 30 per 5 minutes/IP. Email hourly limit was browser-redacted, so its actual value is not asserted. IP forwarding disabled. Do not alter these settings in a branding switch. Leaked-password protection is disabled and the UI labels it Pro-only; password flows are not active in MealCaddie.

Site URL: https://mealcaddie.app. Exact redirect allowlist:

```
http://localhost:3000/
https://mealcaddie.vercel.app/
https://smartcart-lovat.vercel.app/
https://mealcaddie.app/
http://localhost:3001/
smartcart-git-feature-beta-recruitment-ljhooks6s-projects.vercel.app
https://smartcart-git-feature-beta-recruitment-ljhooks6s-projects.vercel.app/
https://preview.mealcaddie.app/
```

The entry without a scheme is a stale malformed duplicate. Cleanup needs separate approval; do not widen this list to wildcard preview domains. Google Cloud callback remains the Supabase project callback; changing Supabase mail branding does not brand Google's consent screen.

## Account creation and authorization

Two auth.users creation triggers exist. handle_new_user inserts a legacy public.profiles row and is SECURITY DEFINER without a fixed search_path; propose a dependency-reviewed hardening migration separately. handle_new_smartcart_user has a fixed public search_path, creates a Free smartcart_profiles row, and on conflict updates only email. Preserve both pending dependency review.

smartcart_profiles SELECT/UPDATE policies restrict identity to auth.uid(). Crucially, authenticated users lack UPDATE column privileges for plan and beta_status; email is writable. INSERT requires own UUID, Free plan and null beta_status. Do not infer plan spoofing from the row policy alone. Subscription rows are own-user SELECT only. Beta admin privileges use a confirmed immutable Auth UUID, not profile email.

Server membership authenticates the bearer session and loads profile.plan from Supabase. Invalid sessions and lookup failures fail closed. Generation workers repeat the plan lookup. Stripe signature verification and existing active/trialing/past_due behavior remain unchanged. No fake subscriptions or profile-plan writes are appropriate for temporary beta Plus.

## Plan feature inventory and enforcement gaps

| Feature | Current Free / Plus behavior | Enforcement / required future integration |
|---|---|---|
| Plan generation | gpt-4.1 / gpt-6.1-sol; Plus quality refinements and cuisine preferences | Server membership, queued worker and quota reservation must use the same effective entitlement. |
| Full-plan allowance | Guest 3/day; Free 10/week; Plus 60/week | Server quota; retain limits and idempotency. |
| Meal replacement | gpt-4.1 / gpt-6.1-sol; Plus rejected-meal history | Server plan/model selection. |
| Recipe generation | gpt-6-luna / gpt-6.1-sol | Server plan/model selection. |
| Cuisine preference | Plus input enabled; Free preference ignored | Both UI and server. |
| Pantry memory/persistence | Plus UI | Current own-row pantry RLS and save_mealcaddie_week RPC have no plan gate. Direct writes can bypass the UI restriction. Add reviewed database/server enforcement before temporary grants launch. |
| Meal vault | Free cap 5; Plus larger vault | Current own-row archived_meals RLS has no cap. Serialize future inserts and enforce the cap at the database boundary. |
| Breakfast/lunch, Cook/week, groceries, existing recipes | Available to both | Preserve. |
| Treat replacement / ingredient consolidation | gpt-6-luna / gpt-4o-mini for both | No new Plus restriction. |

Pantry and vault ownership is protected, but their feature limits are not consistently server-enforced. This blocks a claim of complete future beta entitlement enforcement. Existing saved content must remain readable after expiration. No fix or entitlement was activated in this preparation stage.

## Template baseline

Six current templates use generic Supabase copy. The review baseline in phase2-auth-original-templates.json is not a complete rollback export: two subjects were browser-redacted and editor capture is not byte-exact. An owner-verified export of all six subjects/bodies is a pre-switch gate. Never substitute a guessed subject. Current drafts contain required variables unchanged, with four inactive flows clearly marked dormant.

Supabase's [Free-tier template change](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier) restricts customization using default SMTP for new Free projects; custom SMTP permits branded templates. Do not assume a Pro upgrade is necessary for branding or that restoration is possible after disabling custom SMTP: restore originals while custom SMTP remains enabled, then restore the prior provider state.
