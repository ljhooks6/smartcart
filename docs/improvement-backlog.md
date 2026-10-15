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
