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

## IMP-002 — Qualify the ingredient-source recipe registry before an allergy pilot

- **Status:** Proposed release dependency; qualified review/expenses and hosted activation are not yet approved. Engineering prototype and tests are in `feature/allergy-aware-candidate`.
- **Evidence / confidence:** Confirmed: PR #8 accepted zero complete allergy menus; the new authored recipe pool produces constrained alternatives, but its recipes/catalog have not had independent allergy/dietetic or physical cooking review. Offline replay still rejects the six original allergy-targeted responses.
- **Problem / opportunity:** Source checks can become useful without allowing arbitrary model recipes, but internally authored data must not be presented as clinical or manufacturer verification.
- **Recommendation / user benefit:** Independently review a small versioned registry and pilot locked recipe-ID selection, initially for explicit Milk/Egg/Peanut/Sesame source exclusions. Keep all unresolved products and unsupported needs blocked. This can offer actual meal choices while preserving a meaningful boundary.
- **Complexity:** Medium. **Priority:** High before any allergy-mode activation. **Beneficiaries:** Both Free and Plus; safety must not be a paid-tier distinction.
- **Dependencies:** Owner approval of the bounded experience; qualified reviewer and practical recipe checks; ownership/entitlement/quota adapter, saved-version revalidation, mobile/keyboard/assistive-technology validation and separately approved release/rollback.
- **Risks:** Incorrect source tags, incomplete recipe specs, false assurance and later product substitutions. No cross-contact assurance or individualized tolerance claim.
- **Potential ongoing costs:** Catalog maintenance and reviewer time; external review fees are unknown and require approval. Deterministic selection requires no AI call or paid data service.

**October 16 next-pass findings and dependencies:**

- The four-source pilot's 15 nonempty combinations leave 13–14 eligible dinners and four desserts before other constraints; the current first-feasible selector repeats the same seven dinners for unchanged constraints. Confirmed engineering gaps. Target 48 distinct candidates (36 dinners/12 desserts), family metadata, recent/rejected-family ranking and five-generation simulations. Source safety, pantry, time and budget outrank variety. Candidates remain unvalidated until revision-specific qualified review.
- Reuse existing authenticated generation jobs, owner-scoped history, effective plan lookup and saved `recipe_data` JSON. Preserve current 5/20 weekly limits, Free Vault 10, Plus pantry permissions and paid/manual/beta access. Whether a deterministic full plan consumes the existing allowance is an **unapproved product decision**; no counters or limits changed.
- Saved JSON is client-writable and its current explicit rehydrator drops unknown fields. A plain `checked` field or client-posted original restrictions cannot establish provenance. Design server-signed, owner-/preview-bound recipe capsules and current+original revalidation; use ephemeral keys/disposable records for development. A dedicated live key/configuration requires approval; any alternative private-store migration also requires separate review. No shared migration is assumed or executed.
- Prepare a readable synthetic review packet and ten-recipe calibration brief; verify RD/RDN credentials, allergy and recipe-review experience, any claimed license, and specialist coverage. No reviewer contacted. Request fixed/capped quotes only with approval; 48 × 30–60 minutes is a **planning sensitivity of 24–48 recipe-review hours**, not a fee quote, before catalog/UI/cooking/follow-up work.
- Initial pilot eligibility must reject every additional unsupported current/original allergy, custom/medical/intolerance entry or unclear legacy claim; nine-source engineering coverage is not release permission. Ship only a separately approved release manifest after professional, cooking, ownership/crypto/quota and device/assistive-technology review.
- Full details, UX wording, cost controls and exact approvals: [allergy-pilot-development-plan.md](allergy-pilot-development-plan.md). **Priority remains High; complexity Medium overall, with security integration requiring dedicated review. Both tiers benefit equally.** Clinical/review fees, ongoing revision maintenance and approval to configure/activate a named protected-preview pilot remain open dependencies.

## IMP-003 — Evidence-backed packaged ingredients, not model-invented composition

- **Status:** Proposed; no data service purchased or connected.
- **Evidence / confidence:** Confirmed coverage gap: stock, sauces, unspecified flour/beans, dairy alternatives and mixed products remain unresolved in offline provider output. Speculative benefit: verified formulation evidence could broaden useful menus; nutrition databases alone do not establish allergen or cross-contact suitability.
- **Recommendation / user benefit:** Investigate exact-product ingredient/contains/advisory evidence with source, region, date, revision and expiry, plus a maintained alias/composite catalog. Never clear a product merely because an advisory is absent or a model claims completeness. This could expand food choices beyond plain ingredients.
- **Complexity:** High. **Priority:** Medium; not needed for the first locked-recipe engineering pilot. **Beneficiaries:** Both Free and Plus.
- **Dependencies:** Appropriate source rights, authoritative product evidence, freshness/revocation handling, qualified review, privacy review of any label upload and separate cost approval. Custom allergies need their own reliable source vocabulary.
- **Risks:** Formulation changes, incomplete regional records, stale labels, misleading “free-from” claims and impossible cross-contact verification. Must retain unresolved states and fail closed.
- **Potential ongoing costs:** Data licensing/API/storage and human review may recur; no provider or budget commitment has been approved. FDA/FARE references are used for source ontology, not product certification.

**October 16 scope clarification:** Packaged-product ingestion is **deferred beyond the four-source pilot**; a working first pilot must not depend on buying such data or automatically clearing stock/sauces. Separate plain identity records, server-owned homemade compositions and exact-product formulation evidence. Any later product record needs authoritative source/permission, product/region/version, full ingredient and source statements, evidence date/expiry, correction/revocation handling and conservative unknown states. Missing advisory text or a nutrition database hit is not evidence of absent cross-contact. Label uploads would add privacy, extraction-error and human-review dependencies; do not build them now. Obtain a separately approved quote/license and reviewer acceptance criteria before any provider integration. Priority Medium and complexity High remain; no service, cost, clinical claim or implementation is authorized. See [the updated pilot plan](allergy-pilot-development-plan.md).

No unrelated enhancement is authorized by this document.
