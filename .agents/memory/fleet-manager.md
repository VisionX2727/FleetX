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

The reference app direction is a dark mobile operations cockpit: deep navy surfaces, amber primary actions, compact six-item bottom navigation, header Settings/Calculator actions, and empty first-run records rather than seeded demo data.

**Why:** The uploaded screenshots are the visual source of truth and show a field-ready fleet tool with clear first-run empty states.

**How to apply:** Preserve the dark navy/amber shell when adding screens. New records must remain vehicle-linked where relevant, and the user-facing flows should prefer the existing Fleet, Logs, Khata, Fuel, Drivers, Calculator, Analytics, and Settings routes rather than introducing parallel modules.

Work-log measurement is vehicle-specific: JCB work uses hours, while Hywa and Tipper work use trips plus diesel and do not expose hours. Logs transferred into Khata are represented by ledger entries linked through logId and omitted from the Logs history list.

**Why:** Owners commonly price these machine types using different operating measures, and a transferred work entry should have one authoritative customer-ledger location rather than appearing in both sections.

**How to apply:** Keep receipt generation free of QR markup; QR payment requests remain a separate Khata action. Preserve optional log description and non-mandatory log fields when extending the form.