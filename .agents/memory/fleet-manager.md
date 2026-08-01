---
name: Fleet Manager milestone
description: Durable product decisions for the Fleet Manager app.
---

The first milestone intentionally keeps fleet records local-first while using Supabase for Google Sign-In and logout. Khata charges are linked back to work logs and vehicles so customer balances, QR amounts, receipts, and vehicle profitability can be derived from the same work entry.

**Why:** The user needs a usable operations tool immediately, including offline-friendly daily entry, while authentication is handled by the requested Supabase integration.

**How to apply:** Future persistence work should preserve the current entity relationships and replace local storage behind the store boundary rather than changing the user-facing flows.

Receipts intentionally use a downloadable/shareable `.txt` file with the compact mobile layout from the supplied reference: business identity, customer, location, total due, and dated work lines. Google OAuth must return to the artifact's `/settings` route and listen for Supabase auth state changes after the account chooser.

**Why:** The supplied screenshots show a plain-text mobile receipt and a normal Google account chooser, not a PDF receipt or an app crash.

**How to apply:** Keep receipt generation text-based unless the user explicitly requests a different document format; configure the Supabase Google provider and exact preview/deployed callback URL in the Supabase dashboard for end-to-end sign-in.