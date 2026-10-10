# Mobile flow

Visitors without a signed-in session first see a dedicated welcome screen with Google sign-in, an expandable email sign-in form, and Continue as guest. The app waits for session restoration before choosing the entry screen. Signed-in users bypass the welcome screen. Signing out returns to it. Guest entry lasts for the current visit and preserves the existing local week; a reload shows the welcome screen again. This is a presentation flow, not a replacement for API authorization or database access policies.

The phone layout uses a compact sticky header with Account available on every tab, and an always-visible bottom navigation row: Week, Plan, Meals, Shop, Cook, and Vault. Navigation no longer expands or collapses while scrolling. The bar reserves the device safe area, and the page has enough bottom padding to keep its last controls reachable.

Plan opens on its form. Account opens a dialog containing account identity, membership, sign-in or sign-out controls, and home-screen instructions. It is independent of Plan. Promotional introductions and the existing account menu remain on desktop. Budget and household size share a row; meal-source choices use compact buttons. Generate and Clear Form are at the end of the form rather than in a floating dock.

Meals uses a short handoff and gives the available choices more width. Cook has Save Week beside the sync status. Vault recipes still save individually when added; the general Save Week panel stays on desktop, and the phone version is available from Cook. First-use help, shopping quantity/price explanations, and the Plus preview expand on request.

Show Details expands a labeled panel below its button on Meals, Cook, and Vault, with an explicit fallback for older meals without notes. Recipe and Account dialogs use viewport-fixed positioning, a Close bar outside the scrolling content, native focus containment and Escape dismissal, and body scroll locking. Closing restores focus and the original page position; reopening starts at the top.

Validation: production build and all 31 existing regression tests pass. Browser checks cover phone widths of 320 and 390 pixels, desktop at 1280 pixels, all six destinations, account access, Store Mode entry/exit, and Generate's submit association with the active form. Recipe checks cover opening from a scrolled card, scrolling to the final step with Close visible, closing, reopening at the top, and Escape dismissal. Physical-device feedback is still needed to assess how comfortable the revised flow feels in everyday use.
