# ADR 0002: Lightweight Name/Email Identification Instead of Real Authentication

## Status
Accepted

## Context
The app is used by a small, trusted, closed circle of people on a single family/business farm (not published to any app store, distributed as a direct EAS production build). There's no requirement for per-user data isolation (see CONTEXT.md: Farm) — every User can see and edit everything. The only thing identity is used for is **attribution**: recording who added or last edited an Animal or Record.

Real authentication (password, email OTP/magic link) was considered, since it would prevent a lost/stolen phone from letting a stranger silently write data under someone else's name. However, given the closed, trusted, small-scale nature of this app, that protection was judged not worth the added complexity.

## Decision
- On first launch, the app asks only for **full name + email** — no password, no verification step.
- This is stored as a row in a **Users** collection (UUID primary identifier, Email marked unique).
- Every Animal and Record write carries **addedBy** / **updatedBy** fields referencing a User's UUID, purely for attribution/history — not for access control.
- Appwrite collection-level permissions will be configured to allow read/write broadly (not per-user scoped), consistent with the single-shared-Farm model.

## Consequences
- Significantly simpler to build — no auth flows, no password resets, no verification UI.
- Anyone with the app installed and physical access to a device can act as any User (just by typing a different name/email, or because a session persists). Acceptable given the small trusted circle using this.
- If the app's user base or trust model ever changes (e.g. distributed more widely, or farm staff turnover with less trust), this decision should be revisited in favor of real per-account authentication.
