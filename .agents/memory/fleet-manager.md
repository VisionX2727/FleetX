---
name: Fleet Manager milestone
description: Durable product decisions for the Fleet Manager app.
---

The first milestone intentionally keeps fleet records local-first while using Supabase for Google Sign-In and logout. Khata charges are linked back to work logs and vehicles so customer balances, QR amounts, receipts, and vehicle profitability can be derived from the same work entry.

**Why:** The user needs a usable operations tool immediately, including offline-friendly daily entry, while authentication is handled by the requested Supabase integration.

**How to apply:** Future persistence work should preserve the current entity relationships and replace local storage behind the store boundary rather than changing the user-facing flows.

The app now gates all routes behind Google OAuth, scopes fleet data to the authenticated Supabase user, and syncs the workspace into that user's Supabase auth metadata while retaining a user-specific local cache. Receipts use a branded invoice/project-report HTML preview and browser print/save-PDF flow, deriving customer data from Khata and owner/logo data from Settings.

**Why:** The user requested account-specific access and a receipt matching the supplied service invoice image rather than the earlier raw text download.

**How to apply:** Keep the startup login gate and do not put sign-in inside Settings; Settings should expose the signed-in account and Logout only. Keep invoice generation linked to Khata charges and Settings profile data. Google provider activation, consent-screen branding, and exact redirect allow-list entries remain Supabase dashboard configuration.