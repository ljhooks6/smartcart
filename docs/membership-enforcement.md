Membership enforcement

Meal generation and meal replacement derive entitlement from a Supabase access token verified with auth.getUser, then read the current smartcart_profiles.plan for that verified user. Request-body quality flags, user IDs and user-editable auth metadata cannot grant Plus. Guest requests remain Free. Missing or unknown profiles remain Free. Invalid credentials return 401; verification outages return 503 before AI is called. Plus-only cuisine input is ignored for Free/guest requests. Models are unchanged.

The browser sends its current access token on both routes and rejects a missing or mismatched signed-in session. Membership reads are fresh per request rather than cached between users.

Database enforcement preserves ownership RLS, limits profile writes to Free self-creation and email updates, and reserves entitlement/subscription changes for trusted server billing. The deployed SQL is docs/supabase-membership-enforcement.sql and is also included at the end of the clean-install setup SQL. It does not change existing membership values. No production fixtures were created.

Validation: production build; regression and actual-route tests with mocked external services for guest, Free, Plus, spoofed body fields, forged credentials and outages; isolated PGlite checks for profile creation, self-upgrade denial, cross-account isolation, email updates and service-role billing writes; live database privilege inspection. Route tests intercept AI before billing, so no paid requests are needed for security verification.
