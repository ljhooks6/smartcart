# Improvement backlog

Recommendations found during normal development. These are **not approved work** and do not amend the product roadmap. The owner decides what to approve and prioritize. Record evidence, affected tiers, complexity, priority, dependencies, risks and ongoing costs; distinguish confirmed issues from hypotheses. Avoid repeating previously recorded findings.

## IMP-001 — Consolidate repeated general safety guidance in Plan

- **Status:** Proposed; awaiting owner consideration. Not implemented in PR #8.
- **Evidence / confidence:** Confirmed in the rendered full application at 320px and 390px during PR #8 notice testing. Plan contains a compact dietary summary, the planning restriction notice and the general explanation inside Dietary settings. Their general cautions overlap. A detected ingredient conflict is useful distinct information and should remain prominent.
- **Problem / opportunity:** Several similar paragraphs add scrolling and can make important warnings harder to distinguish from routine guidance on a phone.
- **Recommendation / user benefit:** Review the general copy as one compact planning notice, with an accessible disclosure for supporting detail and an always-visible link to the complete safety notice. Keep current restrictions, the instruction not to remove genuine restrictions, and any detected ingredient conflict immediately visible. This could reduce repetition while making actionable warnings easier to identify.
- **Implementation complexity:** Low.
- **Priority:** Low; an optional usability improvement after the global-notice placement correction.
- **Beneficiaries:** Both Free and Plus.
- **Dependencies:** Owner approval of the copy/interaction; review against the existing safety notice; mobile, keyboard and screen-reader validation.
- **Risks:** Collapsing essential information could reduce safety awareness. Never hide detected conflicts or imply that a disclaimer replaces server enforcement. The production allergy restriction must remain unchanged.
- **Potential ongoing costs:** No new paid service, AI calls or storage. Minor copy, accessibility and regression-test maintenance.

No unrelated enhancement is authorized by this document.

## IMP-006 — Separate pantry exploration from stock-confirmed planning

- **Status:** Proposed during Assignment 02D; not implemented. Owner approval required.
- **Evidence / confidence:** Confirmed: Pantry Only blocks before reservation when no usable measured amounts exist. A stock label or a list of ingredient names cannot establish enough food for a household. The current combined-suggestions ledger also makes all options compete for the same stock. Whether a distinct exploratory mode improves completion is a product hypothesis, not measured user research.
- **Assignment 02E evidence:** One real-provider local test with eleven measured ingredients still returned no accepted dinner: the combined-stock validator rejected incompatible ingredient units. The exact model unit was not retained, so a parser defect versus model-output mismatch is unresolved. This confirms that measuring inventory alone does not guarantee usable suggestions. Preserve deterministic checks; investigate with synthetic-only required/available-unit diagnostics before another paid evaluation. The visible package-size advice was less useful for this already-measured fixture. See `docs/assignment02e-results.md`; no UX redesign is included.
- **Assignment 02F:** Confirmed and corrected the contradictory pinch guidance and missing snapshot-unit contract, with one measurement correction inside the existing request ceiling. Synthetic diagnostics now distinguish generated-unit errors from insufficient inventory. This does not remove the first-use measurement friction or approve exploration-mode redesign. IMP-006 remains a future UX roadmap consideration; see `docs/assignment02f-measurement-contract.md`.
- **Assignment 02G evidence:** One real response produced six accepted dinners with compatible cumulative measurements, but generic rice/legume entries did not establish dry/canned/cooked forms. Explicit form confirmation and quantified optional sides are dependencies before claiming practical feasibility. Variety remained limited under the unchanged pantry constraints. See `docs/assignment02g-real-provider-results.md`; no redesign or extra paid call was made.
- **Problem / opportunity:** Measuring an entire pantry before discovering any useful meal ideas is substantial entry friction, particularly for new Free users. Requiring all suggestions to fit together can also be surprising when users consider them alternatives.
- **Recommendation / user benefit:** Consider a clearly separate ingredient-based exploration state: show ideas as unverified possibilities, never as purchase-free or confirmed pantry-feasible plans. Ask for compatible amounts only for ingredients in chosen meals, then validate the whole selected household plan before confirming it. Keep unknown quantities visible; no unlimited-stock assumption. Retain the existing strict measured-plan behavior until this separate workflow is designed and approved.
- **Implementation complexity:** High. **Priority:** High. **Beneficiaries:** Both Free and Plus; persistent inventory remains Plus-only.
- **Dependencies:** Owner approval of distinct labels, generation/quota semantics and the boundary between ideas and confirmed plans; dietary exclusion guards at every stage; selected-plan stock accounting, shopping/recipe provenance and accessibility regression coverage.
- **Risks:** Users may mistake exploratory ideas for safe, available or sufficient food. Never weaken allergy restrictions, label unverified ideas allergen-safe, or hide shortages. Revalidating selections must not silently alter saved recipes or double-spend stock/quota.
- **Potential ongoing costs:** No ingredient service is required. An additional generation stage could add AI usage and must be separately budgeted; deterministic selection/validation can reuse existing quantities and may avoid extra calls. Continued interface and regression maintenance.

## IMP-007 — Preserve a usable Free Pantry Only plan after reload

- **Status:** Owner-approved in Assignment 02H; implemented as a draft PR #18 candidate. Focused tests and standard build pass; remaining actual browser verification is incomplete because the connected Chrome tab could not be read. See `docs/assignment02h-pantry-recovery.md`. Not released.
- **Evidence / confidence:** Confirmed in the actual local real-provider journey at PR18 application commit 20a3de6. Two saved meals and their schedule recovered, but the Free inventory became empty and Shop changed from eleven covered rows/$0 to eleven items to buy. The restore effect explicitly gates pantry recovery on Plus. This is a confirmed behavior; whether current-device Free persistence is desired is a product decision.
- **Recommendation / user benefit:** Review an owner-scoped current-device/per-plan measured snapshot with timestamp and explicit stale-stock confirmation, separate from Plus cloud pantry memory. Avoid turning an accepted purchase-free plan into an unexplained shopping trip after reload. Do not grant Plus, silently change entitlements or assume old stock is still available.
- **Implementation complexity:** Medium. **Priority:** High. **Beneficiaries:** Primarily Free; consistent snapshot/reconfirmation semantics also benefit Plus.
- **Dependencies:** Owner approval of the persistence boundary; account-isolation, saved-plan provenance, stale inventory, Save/reload and grocery recalculation tests. Retain IMP-006 as the separate exploration UX initiative.
- **Risks:** Stale inventory causing false sufficiency, cross-account cache leakage and accidental expansion of cloud pantry entitlement. Always distinguish the generation snapshot from current physical stock and preserve later user edits.
- **Potential ongoing costs:** No paid ingredient API or added AI call required. Small local storage and maintenance; shared storage/migration would need separate review if proposed.

## IMP-005 — Review grocery identity aliases separately from search discovery

- **Status:** Proposed; awaiting owner consideration. Not implemented in PR #11.
- **Evidence / confidence:** Confirmed by focused code tests: search can find an existing Bicarb entry using Baking soda, while the unchanged grocery `ingredientKey` produces different keys for those stored names. A search alias alone does not authorize a grocery equivalence or stock conversion.
- **Problem / opportunity:** Some alternate pantry labels can be discoverable in the picker but still fail to offset a recipe requirement bearing another name.
- **Recommendation / user benefit:** Separately review a small, explicit set of true ingredient-identity aliases, then reconcile recipe/pantry matches conservatively while preserving existing stored names, quantity dimensions and user review of ambiguous formulations. This could reduce avoidable shopping duplicates.
- **Implementation complexity:** Medium. **Priority:** Medium. **Beneficiaries:** Both Free and Plus.
- **Dependencies:** Owner approval; reviewed equivalence data; compatibility tests for stored grocery keys, shopping marks, owner isolation, quantities and dietary qualifiers.
- **Risks:** Broad synonym merging could conflate formulations, fresh/dried forms or uncertain package contents. Search ranking must never establish allergen safety or authorize substitutions.
- **Potential ongoing costs:** No paid API required; ongoing alias curation and regression maintenance. Any storage migration would require separate review and approval.

## IMP-004 — Reconcile measured pantry stock after cooking

- **Status:** Proposed; awaiting owner consideration. Not implemented in this workstream.
- **Evidence / confidence:** Confirmed during the quantity-accounting work: “Cooked It” removes a meal from This Week but does not measure what was actually used or update physical pantry inventory. Automatic deduction would also be unreliable when users change portions, substitute ingredients or skip cooking steps.
- **Problem / opportunity:** A quantity snapshot can become stale after cooking, producing an understated shortage for a later plan unless the user updates it.
- **Recommendation / user benefit:** Offer an optional, editable “Review pantry used” step after cooking. Show proposed compatible deductions once, require confirmation, and allow correction/undo. Never infer consumption merely from opening a recipe or regenerating a grocery list. This would help keep later shopping requirements accurate.
- **Implementation complexity:** Medium.
- **Priority:** Medium.
- **Beneficiaries:** Both tiers for current-session pantry use; Plus for persistent inventory.
- **Dependencies:** Owner approval; stable quantity model; idempotent owner-scoped consumption records and concurrency review before persistent updates. The current work explicitly tells users to update their snapshot after cooking.
- **Risks:** Incorrect automatic deductions, double consumption, stale cross-device quantities and accidental inventory loss. Existing food/dietary checks must not be replaced by inventory estimates.
- **Potential ongoing costs:** No paid ingredient API required. Possible small database/storage cost and continued conversion/undo regression maintenance.
