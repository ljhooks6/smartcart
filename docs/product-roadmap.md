# MealCaddie product roadmap

Future proposals, not available features or delivery commitments. Validate beta feedback, security, privacy and costs before implementation. Paid checkout remains closed.

## Current tier direction

Free: five weekly AI plans, ten Vault recipes, seven dinner suggestions, optional breakfast/lunch, budget planning, groceries, manual pantry selection and weekly saving. Plus: twenty weekly AI plans, existing expanded Vault policy, cloud pantry memory, advanced Cuisine Vibe and existing enhanced AI plan/refinement models. Both retain the same safety and privacy protections. No new substitution capability is promised.

## Phase 1 — Recipe import and personal recipes

Manual recipe entry and source links; structured import from supported food blogs; pasted-text conversion; photos of handwritten family recipes converted into editable AI drafts. Users review quantities, ingredients and instructions before saving in the existing Vault. Preserve source attribution and distinguish AI-generated, imported and personal recipes.

Proposed tiers: Free manual entry and limited assisted imports; Plus larger import allowances and expanded storage. Research processing, storage and AI costs before setting limits. Respect copyright and platform restrictions, identify uncertainty, and never certify imported recipes as allergy-safe. Universal social extraction is not promised.

## Phase 2 — MealCaddie households

Initially two adults, invited into a shared workspace with roles and permissions. Shared weekly calendar, groceries, pantry and Vault; separate personal preferences and optional explicitly shared dietary information. Design removal, revocation, exit and preservation of personally owned data.

Proposed policy: one Plus subscriber creates a household and invites one adult, potentially Free. Membership does not upgrade that person's independent account or authorize unlimited premium AI. Design shared versus personal quotas and ownership before implementation.

## Phase 3 — Advanced personalization

Remember explicitly saved favorite cuisines, common ingredients and enjoyed meals; reduce unwanted repetition; improve suggestions from saved preferences; clearer household controls. Users can edit or reset personalization memory.

## Phase 4 — Convenience and automation

Optional scheduled planning and low-stock reminders, reusable weekly templates, history browsing/reuse, better grocery adjustments and household notifications. Automatic AI generation or paid operations require explicit user authorization and cost controls.

## Phase 5 — Advanced social recipe import

Explore supported TikTok, Instagram and Facebook content, authorized transcription/caption extraction, screenshot drafting and browser/share-sheet workflows. Review platform APIs, copyright, attribution, privacy and processing costs. Do not assume every social URL can be imported.

## Provisional business pricing targets

Free $0; Plus $5.99/month or $49.99/year. These are business targets, not active Stripe prices. Aim for a competitive entry point, personalization and convenience, sustainable AI usage, future household value and recipe management. Final pricing depends on beta feedback, actual AI/hosting costs and observed usage. Do not activate billing or advertise future features as available.

## Proposed initiative — Localized grocery pricing

Optional ZIP code, store/location matching and licensed provider integrations. Show freshness, confidence and coverage, with an explicit general-estimate fallback when no suitable local observation exists. Recipe ingredient cost (quantities consumed) and shopping-cart cost (whole packages purchased after pantry deductions) must be separate figures. ZIP alone is not a price source. Future Plus proposals include preferred-store comparisons, shopping optimization and savings opportunities; basic localization is proposed for Free. Provider access, commercial permission and cost testing precede implementation. See [feasibility assessment](localized-grocery-pricing.md).

## Proposed initiative — Recipe customization and protein swaps

Future **Swap Protein** action: offer only compatible alternatives, preview changes and require confirmation. Preserve the original recipe/version until confirmation. Recalculate title, ingredient quantities, cooking instructions and time, relevant verified doneness guidance, nutrition if available, budget, pantry usage and grocery lists together. This is recipe adaptation, never a word replacement.

Persist original and replacement recipe versions, dietary context, source lineage, confirmed plan reference and idempotency key; update plan/grocery references atomically with ownership and current-entitlement checks. Revalidate allergens, custom exclusions, compound ingredients, equipment and feasibility before presenting and again before saving. Do not overwrite a personally owned recipe implicitly. New storage/versioning schema needs separate migration review.

Proposed Free limited swaps and Plus higher allowance/customization require actual cost and safety evaluation before setting quotas. Preserve the original on failure, denial or expiry. Household concurrency and optional nutrition estimates need explicit design. No swapping is implemented in this release.
