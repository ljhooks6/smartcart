# Bounded allergy library — next development plan

Assessment: October 16, 2026, against PR #9 engineering head `7786de8`. This is a **planning/documentation update**. PR #9 remains draft; no recipes, application code, schema, accounts, quotas, flags or production data were changed in this pass. External reviewers were not contacted. No service or evaluation was purchased.

## 1. Expand toward 48 engineering candidates, with measured variety

Current inventory is 14 dinners and four desserts. A local inspection of all 15 nonempty combinations of Milk/Eggs/Peanuts/Sesame found **13–14 eligible dinners and four desserts**, before budget, equipment, time, pantry and ordinary preferences narrow the pool. The first-feasible selector returns the same seven dinners for the same constraints; it currently receives no recent-plan context. This is a confirmed prototype limitation, not a production regression. The existing seven-vegan-dinner coverage is especially thin for repeated planning.

Recommended target: **48 engineering candidates: 36 dinners and 12 desserts**, authored in small batches, with a 40–60 range if eligibility analysis reveals gaps. Existing candidates count only if they represent a distinct, usable dish; a sauce, side, spice change or protein swap does not inflate the count. Do not label these professionally validated.

| Dinner-format allocation | Candidate count |
|---|---:|
| Tray roasts / composed roast dinners | 6 |
| Soups, stews and braises | 6 |
| Distinct stovetop suppers | 6 |
| Patties and skillet cakes | 4 |
| Filled vegetables | 4 |
| Layered bakes | 4 |
| Hearty salads and poached/steamed dinners | 6 |
| **Total dinners** | **36** |

Cross-check this format matrix against a proposed primary-ingredient mix of 16 plant-centered, 10 poultry, four beef/pork and six fish dinners. Fish is not an allowed *allergy selection* in the initial pilot; a recipe containing fish must still disclose it, and any current/original unsupported allergy excludes the account's request from this mode. No universal nutritional adequacy is implied by these engineering allocations.

For 12 desserts, investigate fruit bakes/crisps, oat or flour bars/biscuits, skillet cakes, cooked rice desserts and poached fruit/compotes; target at least eight actual dish families. New leavening, flour variants, doughs and component formulations need explicit catalog/recipe evidence and practical review, not an automatic alias. Freezer-dependent recipes must not pass as 20-minute Stovetop/Oven recipes; account for equipment and total elapsed time before admitting such candidates. Keep this isolated from the ordinary dessert-rotation release.

Add stable recipe ID, revision, **dish-family ID** (not merely “chicken” or “rice”), format/technique, total time, equipment, canonical quantities, complete components and review status to the candidate manifest. Distinguish `engineering-candidate`, `needs-revision`, `excluded` and `eligible-for-limited-pilot`. Only a reviewed server release manifest may confer the last status. No client field or model declaration can do so.

Variety design:

- Reuse the current owner-scoped recent three completed plans / 14-day history, plus account-scoped rejected dishes. Extend the extraction for library recipe/family IDs; do not mix accounts or send sensitive dietary data into telemetry. If history is unavailable, disclose limited rotation confidence and use current context.
- Filter **hard constraints first**: supported restrictions, current catalog/review version, ingredient avoidance, pantry quantities, budget, time and equipment. Rank remaining recipes by recent ID/family use, rejected families and format overlap. Use a stable per-job tie-breaker so an idempotent retry returns the same selection; a genuine new job can rotate. No extra AI call or retry is needed.
- Target at least 28 meaningful eligible dinner families in the full pilot pool and at least 14 plant-centered dinners, subject to external review. These are coverage goals, not a promise every constrained request has that many options. Avoid same-family entries in a plan when feasible. Do not rename a repeat to hide it.
- Repetition is permitted when specifically requested or necessary under constraints, with an honest “limited compatible choices” explanation. Never silently relax a restriction or add an unknown sauce for novelty. Offer fewer meals or an explicitly requested repeat if full distinct coverage is unavailable.
- Simulate at least five new generations for all 15 pilot-source combinations, ordinary/vegetarian/vegan preferences, short-time/limited-equipment, low-budget and pantry-only cases. Measure eligible pool size, exact-ID overlap and family overlap separately. Where at least 28 distinct eligible families exist, aim to avoid the preceding three plans' families; record constrained exceptions. Keep recipe-ID replacements, desserts and rejections in the same assessment.

Sequence: classify the existing 18, author ten varied additions as calibration candidates, obtain qualified feedback on the assumptions, then complete the remaining candidates toward 48. Qualified approval of a small subset does not automatically approve later recipes or the whole catalog.

## 2. Qualified review: requirements, unsent brief and cost controls

Recommended lead: an **RD/RDN with demonstrated food-allergy experience and recipe/menu or food-product review experience**. Verify the current credential using [CDR's primary-source verification](https://www.cdrnet.org/digitalcredentialfaq); evaluate experience with multi-source avoidance, hidden/composite ingredients and restrictive-diet nutrition. An ordinary “nutritionist” title alone is insufficient evidence of the skills required for this project. [FARE's dietitian resources](https://www.foodallergy.org/resources/registered-dietitians) describe relevant allergy, nutrition and food-service areas.

Arrange a separate allergy-clinician review of the four-source scope, exclusions, limitations and participant-facing claims, or require the proposed lead to explain what specialist input is necessary. Do not treat a training certificate as proof a recipe or app is allergen-free. Check any claimed state license with its regulator; [Texas TDLR](https://www.tdlr.texas.gov/diet/) provides verification. Product review is not patient care, and any individualized clinical service would need separate scope/licensure/privacy consideration. No reviewer, clinic or consultant is engaged by this plan.

**Review packet index (synthetic and product materials only):**

1. [Scope and limitations](allergy-aware-proposal.md), including unsupported cases and the initial four sources; explicit request for corrections, not a request for a safety seal.
2. Versioned [56-profile catalog and two component graphs](../lib/allergy-aware-catalog.ts): exact aliases, source tags, evidence URLs/date, generic identity assumptions and unknown states. Supply a readable worksheet; a code file alone is not an adequate clinical-review deliverable.
3. [Recipe specifications](../lib/allergy-aware-recipes.ts): complete ingredient quantities, subingredients, preparation steps, servings, time/equipment and temperature instructions. Include practical cooking/yield results when available; mark missing results honestly.
4. [Evaluation examples](../evals/allergy-aware-results.json) and [scenario definitions](../evals/allergy-aware-cases.mjs), including accepted engineering examples, rejected hidden sources, combinations, adverse mutations and remaining unknowns. Summarize failures rather than supplying only successful dishes. No customer records, inboxes, access tokens or medical histories.
5. Proposed Plan/Meals/Cook/Vault/Shop messages and screenshots, plus the current safety notice; show every state and the process for resolving unknowns.
6. A decision sheet per catalog/recipe revision: `record ID`, `content digest/revision`, `source evidence`, `scope checked`, `accept/revise/exclude`, `unresolved conditions`, `review date`, `next review trigger/date`, `reviewer credentials` and `follow-up findings`. Record limitations and dissent, not a single opaque checkbox. Public use of a reviewer's name or endorsement needs their explicit agreement.

Request a written, bounded quote **only after permission to contact named reviewers**. Start with a ten-recipe calibration sample plus the shared catalog and UI scope. Obtain separate prices/deliverables for the remaining batch, allergy-clinician input, practical cooking, one correction/re-review round and future catalog changes. Require a written scope and revision-specific findings, not merely a meeting or general meal-plan endorsement.

No dollar quote or market rate has been obtained. A budgeting worksheet is:

`catalog/alias review + recipe count × agreed review effort + UI/claim review + cooking/yield work + correction round + optional specialist input`.

For a sensitivity exercise only, 48 recipes at **30–60 minutes each would mean 24–48 recipe-review hours**, before shared-catalog, cooking and follow-up work. This is an engineering planning assumption to challenge in quotes, not a professional's estimate or a promised schedule. Total cost depends on the agreed rates/fixed fee, taxes and expense terms. Do not substitute patient-visit pricing for a product-review quote. Set a fixed scope or capped time-and-materials budget, approval for overruns, and change/re-review fees before engagement. Prototype development needs no new data subscription or paid AI evaluation; recurring costs are human catalog maintenance, any approved review and existing hosting/storage usage. Packaged-product evidence could add licensing/support costs later.

## 3. Integration design — existing authenticated infrastructure

Existing code paths inspected: `server-membership.ts`, `generation-identity.ts`, `generation-request.ts`, `generation-jobs.ts`, `generation-worker.ts`, `generation-meal-history.ts`, `smart-cart-persistence.ts`, the saved-meal serializer in `smart-cart-app.fixed.tsx`, and `use-smart-cart-recipe.ts`. This was source inspection; no shared database reads or writes occurred. Supabase's [current auth verification](https://supabase.com/docs/reference/javascript/auth-getuser), [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security) and [changelog](https://supabase.com/changelog) were reviewed for the design. No package upgrade, extension or new exposed table is proposed in this pass.

| Boundary | Proposed behavior |
|---|---|
| Auth/access | Verify the Supabase account on the server; require a verified non-anonymous identity, existing product access, existing agreement requirements and a **separate explicit pilot UUID allowlist**. Do not use editable user metadata, a submitted email, a client plan or a UI flag for authorization. Reuse effective Free/Plus lookup, including preserved stored Plus and temporary beta status. Do not enroll existing beta participants automatically. |
| Pilot scope | Initially only explicit Milk/Eggs/Peanuts/Sesame allergies and their unions. Reject any other current **or original** allergy, custom allergy, intolerance, medical entry, unconfirmed legacy entry or unsupported dietary claim. The engine's nine-source tests and separate lactose strategy are not authorization to include them in this first pilot. |
| Dispatch | Add a validated, explicit `allergy-library-v1` planning mode and library/review revision to the request schema and idempotency hash. Today unknown mode fields would be stripped by the existing schema; sending a client flag alone is not integration. Default ordinary planning remains unchanged. **Do not weaken or bypass the production allergy gate**; keep the library adapter local until separately reviewed and approved for a protected preview. |
| Job/quota | Reuse reservation, ownership, job lease/claim, burst controls and completion/failure paths. Recommend one full library plan consume one existing full-plan allowance (Free 5/week, Plus 20/week), with unchanged ceilings, idempotent replay/reopening free and recipe-ID replacement outside the weekly-plan count as today. **This counting policy requires owner approval** because selection makes no AI call. Validate unsupported requests before reservation; terminal selection failures release the reservation using the existing failure path, without automatic provider fallback. |
| Execution | Recheck pilot eligibility, effective plan, access expiry, current/original restrictions and review versions after claim and before result delivery. Revalidate completed cached results on retrieval, not just new selections. A changed entitlement, removed pilot permission or invalid review manifest withholds new checked operations and releases unused reservations. No deletion of content. |
| Storage | Reuse `weekly_menus.recipe_data` and `archived_meals.recipe_data` for an additive, versioned library envelope, while keeping existing row ownership, Free Vault cap 10, Plus policy and pantry permissions. The current explicit rehydrator drops unknown envelope fields and must be updated deliberately. Old JSON remains readable and is not automatically converted or re-saved as checked. |
| Provenance | **Client-writable recipe JSON is not authoritative.** On generation, derive a versioned provenance capsule on the server with owner UUID, preview audience/purpose, artifact/job/recipe IDs, recipe/catalog/review revisions, portions and the canonical original pilot restrictions/avoidance. Sign canonical bytes with a dedicated server-only key; validate signature, owner and current approved registry before every new checked operation. A signed capsule establishes integrity, not food safety or product access. Do not reuse a Supabase privileged key or an email credential. |
| Key/data safeguards | The capsule can live in existing JSON, avoiding a new table for the initial design. Signing does **not** encrypt its restriction data: keep it within owner-protected storage/requests, never a URL, shared link or log. Include key ID and a bounded rotation/review-revocation policy. New live key/configuration requires separate approval; use ephemeral test keys locally. If a durable private provenance store is selected instead, present a migration and retention plan for approval before applying anything. No unapproved extension of generation-job retention to keep provenance alive. |
| Save/Cook/Vault | Server fetches the owned record; rejects another user's row or capsule, tampering and removed/unknown revisions; combines current restrictions with signed original restrictions; regenerates fixed server steps. Never trust posted `originalDietaryRestrictions`, a posted `checked` status or the client cache. Change recipe cache keys to owner/artifact/revision/restriction fingerprint. Offline/stale historical content can remain visible as **not currently checked** under existing access rules. |
| Shopping/pantry | Aggregate canonical ingredient IDs and units from validated recipes, then recheck the entire transformed list. Disallow added sauces/optional ingredients, omitted components and unit/quantity substitutions. Household extras remain separate and unverified. Existing pantry memory is name-based; do not invent quantities or convert records. Require explicit canonical quantities for pantry-only availability, preferably in an additive owned plan snapshot; preserve all existing pantry data and Plus-only memory behavior. |
| Safety parity/privacy | Both Free and Plus use the same exclusion/catalog checks. No Stripe or permanent-plan changes. Log minimal error codes and operational counters, not restriction text or food content; optional engagement remains optional. Do not send participant dietary records to a reviewer or require analytics consent to use feedback. |

The signature design is a recommendation, not implemented security. It needs cryptographic and ownership tests, key lifecycle design and separate configuration approval. It avoids relying on mutable saved metadata or indefinitely retained generation jobs. Existing JSON capacity and server storage guards must be confirmed in the disposable test environment before promising “no migration needed.”

## 4. UX: checked declarations are not verified real-world safety

Use **“Ingredient-source exclusion checks”** as the mode name. Show selected sources, recipe/catalog/review revision and exactly what the server checked. Do not use “allergy-safe,” “allergen-free,” a certification seal, green shield, generic “verified recipe,” or a professional-review badge that implies the actual meal was tested. Professional review is revision-specific and bounded; it does not verify a shopper's food, manufacturing or kitchen.

| State | Main message / next action |
|---|---|
| Declared sources checked | “The listed recipe ingredients were checked for your selected Milk, Egg, Peanut and/or Sesame exclusions.” Then: “Actual product labels, manufacturing and cross-contact are not verified.” Show only sources actually selected, not a universal four- or nine-allergen promise. |
| Known conflict | “Tahini is a sesame source. This recipe cannot be used with your selected Sesame exclusion.” Offer another compatible catalog recipe; never a model-invented substitution. |
| Unresolved | “We cannot establish this stock's composition. Choose a recipe using the specified plain ingredients, or leave this recipe unused.” A user acknowledgment cannot override the server block. |
| Historical/stale/revoked | “Saved content preserved; not currently checked under this catalog or your current settings.” Keep its history separate from any current checked result. Revalidation is required before treating it as a checked source for new planning/shopping. |
| Unsupported scope | “This pilot does not support this additional restriction. Keep it entered; ordinary allergy-dependent generation remains restricted.” Do not invite users to relabel an allergy as a preference. |

Display the short state near a selected recipe and again at Cook/Shop decisions. Keep a persistent link to the complete notice and expandable evidence; do not repeat a large global banner on every tab. Do not conflate a source-check state with approval of beta access or acceptance of legal terms. Preserve the independent notice-placement work and leave IMP-001 untouched.

Test comprehension directly: participants should be able to explain that a checked ingredient list does not verify a product label or cross-contact. Use readable text and icons with labels, not color alone; keyboard focus/result announcements, zoom/reflow, large touch controls and physical-device review. Full NVDA, VoiceOver and TalkBack remain separate gates. Do not test by feeding participants allergens or requesting medical diagnoses/severity histories.

## 5. Development, external review and pilot gates

**Can be developed immediately, locally:** recipe/family metadata and candidate batches; history-aware deterministic selection; coverage/rotation simulations; versioned provenance and ownership tests with ephemeral keys; storage serialization/cache adapters using disposable test data; four-source eligibility, queue/quota failure tests; local UX states and a readable review packet. Keep hosted lab and production flags off. This document does not claim those next changes are already implemented.

**Needs qualified external review:** shared source/alias/component assumptions, each release recipe revision and its quantities/steps, feasible cooking/yields, exclusion-related nutritional omissions, supported scope, residual-risk statements and participant-facing claims. Nutrition assessment must not turn into a personalized medical-suitability promise. A reviewer may reject candidates or require a narrower pilot.

**Minimum future technical evidence:** all 15 pilot-source combinations, hidden/compound/unknown foods, rejected unsupported needs; five-generation family rotation; budget/equipment/time/pantry constraints; mocked auth and independent local PostgreSQL/RLS/direct-REST ownership tests; forged/cross-owner/stale capsules and key rotation; retries/idempotency/quota release; expiry/revocation during queued work and cached retrieval; safe historical reads; Grocery/Vault/cache transformations; existing account, billing, beta and production allergy regressions; TypeScript/lint/build and actual device/assistive-technology results. No paid AI evaluation is necessary for deterministic selection. Do not reuse the earlier 328-test result as evidence for unimplemented adapters.

**Specific later approvals, independently scoped:**

1. Permission to contact selected qualified reviewers for written quotes using this synthetic/product-only packet; then separate approval of named reviewer, scope, deliverables, capped fee/expenses and permitted public wording before engagement/payment.
2. Product decision on quota treatment for deterministic library plans; recommendation is existing full-plan allowances with no new cap or tier change. Confirm the limited four-source, catalog-only pilot scope and handling of constrained repeats.
3. The exact protected-preview code/configuration scope, signing-key creation/storage/rotation and pilot UUID allowlist. If a schema change becomes necessary, review and approve that migration separately. No shared configuration action is approved by this plan.
4. After qualified findings and technical/accessibility evidence: explicit approval of named pilot identities, participant notice/consent, reviewed release manifest, supervision/stop criteria, expiry, rollback and **protected-preview deployment/activation**. Keep Vercel Authentication; review shared-account effects before using a shared Supabase project. No inherited beta approval automatically grants this new pilot permission.

Production deployment or lifting the public allergy restriction requires **another separate release approval**. Pilot rollback disables the new mode and pilot permissions/allowlist, revokes affected review revisions, preserves saved content and original production guards, and makes stale check states explicit. No automatic rollback, change to existing beta entitlements or deletion of user records is proposed.

IMP-002 tracks the recipe, review and integration dependencies; IMP-003 tracks deferred packaged-product evidence. Neither blocks the independent breakfast/lunch or dessert-rotation release.
