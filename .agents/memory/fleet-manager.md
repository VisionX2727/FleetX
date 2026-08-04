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

Logs history is an all-dates view of untransferred work logs; Khata is the authoritative destination after transfer, with linked work deletion removing both the ledger entry and source log.

**Why:** The mobile reference shows multiple dated entries together and users need to edit or remove entries without duplicates reappearing in Logs.

**How to apply:** Keep selection actions visible as Khata/Delete, preserve edit-before-transfer, and keep receipt fields driven by Settings plus the customer’s selected payment mode.

Khata customer cards are intentionally tap-only summaries; payment status, GST opt-in, QR, payment entry, and receipt actions belong inside the customer detail view. Receipts are shared/downloaded as PDF files, while the HTML invoice remains only for print preview.

**Why:** The supplied mobile references separate the customer list from the detailed account screen and explicitly require PDF receipt sharing without export/supporting-document controls.

**How to apply:** Keep GST percentage and GSTIN in Settings, apply GST only when the customer’s Add GST control is enabled, and never expose paid/due controls on the outer Khata list.

Receipt exports now render the same branded invoice HTML used by View Receipt before encoding the document as a PDF; the PDF path must not regress to a text-only generator.

**Why:** A text-stream PDF produced a white/raw-text receipt instead of matching the supplied invoice reference.

**How to apply:** Keep Share PDF, Download PDF, and View Receipt driven from the same invoice data and visual template, including company branding, date ranges, payment details, and status.

The receipt and workspace export templates use a fixed standard-page canvas with bounded grid columns and explicit wrapping before rasterization.

**Why:** Long company, address, payment, and customer values can otherwise overlap or push sections into an unreadable PDF.

**How to apply:** Preserve the fixed-page/wrapping approach when adding invoice fields or new export sections. Show payment history descriptively, then show aggregate Paid Amount immediately above Grand Total; Grand Total is the remaining balance after payments.

Notes are account-scoped local-first records with automatic creation dates and explicit add, edit, and delete actions; Home Quick Actions links to Notes instead of Khata.

**Why:** The user needs a lightweight place for arbitrary fleet reminders without mixing notes into customer ledgers or work logs.

**How to apply:** Keep notes independent from vehicles, customers, and receipts unless a future request explicitly links them.

Supabase Google sign-in uses browser PKCE with explicit callback exchange, account selection, local-only logout, and callback cleanup; workspace data remains keyed by auth user ID.

**Why:** Switching Google accounts in one browser can otherwise reuse stale callback/verifier state, or let automatic URL detection race the auth gate, producing a Supabase flow-state error before a session reaches the app.

**How to apply:** Preserve explicit `exchangeCodeForSession`, `flowType: "pkce"`, app-specific auth storage, `prompt: "select_account"`, `signOut({ scope: "local" })`, and the current-origin/base-path redirect. Redirect URLs must still be allow-listed in Supabase for every domain used.

FleetX is the user-facing app brand, with the supplied FleetX artwork used as the pre-login/auth initialization splash screen.

**Why:** The user explicitly renamed the app from Fleet Manager to FleetX and provided the splash artwork as the visual source of truth.

**How to apply:** Keep FleetX in visible app metadata, login/loading UI, and default-brand fallbacks; preserve any user-entered business/company name separately.

Home shows the saved company name in place of the app label when one is configured, while receipts contain only user/business receipt details and never the FleetX app brand. Driver management is accessed from Fleet.

**Why:** The user wants customer-facing screens and receipts to represent their business rather than the app product, while keeping driver operations grouped with fleet management.

**How to apply:** Keep the Home company-name precedence and avoid adding product-brand fallbacks to invoice HTML or receipt share metadata; leave QR payment requests as a separate flow.

Vercel must build the FleetX frontend artifact directly rather than running the workspace-wide build, which also compiles the unrelated API package and can surface its transitive `pngjs` type error.

**Why:** The product is a Vite SPA that uses Supabase directly; the API artifact is not part of its Vercel static hosting path.

**How to apply:** Keep Vercel's root-level configuration pointed at the fleet-manager build and output directory, with SPA rewrites to `index.html`.

Vercel can use either the repository root or `artifacts/fleet-manager` as its Root Directory, but the output directory must be relative to that choice: `artifacts/fleet-manager/dist/public` at repo root, or `dist/public` inside the artifact.

**Why:** Vercel reports a successful build but fails afterward when it searches the default `public` folder relative to a different project root.

**How to apply:** Prefer `artifacts/fleet-manager` as Root Directory with the artifact-level `vercel.json`, or use the repository root with the root-level config; do not mix one root with the other root's output path.

Responsive mode uses both viewport width and device identity, so phones that request a browser “Desktop site” still receive the compact mobile shell while actual desktop browsers receive the wide layout.

**Why:** Mobile browsers can report a desktop-sized viewport when desktop-site mode is enabled, bypassing width-only media queries.

**How to apply:** Preserve the device marker on the app shell and the mobile override rules when changing the layout breakpoints.

The supplied square FleetX logo is reserved for the pre-login loading splash and Google sign-in page; authenticated workspace screens continue using the app shell and user-configured business logo separately.

**Why:** The user wants stronger product branding before authentication without replacing the business identity inside the fleet workspace.

**How to apply:** Keep the logo asset limited to loading and sign-in surfaces unless the user explicitly requests it for an authenticated screen.

Driver assignment is managed only from the Drivers section; vehicle forms do not collect driver identity, and Fleet display resolves the assigned driver from the driver-to-vehicle relationship.

**Why:** A driver should be registered once and assigned consistently rather than duplicated as editable text on each vehicle.

**How to apply:** Preserve assignment uniqueness when adding or editing drivers, and derive vehicle driver labels from the assignment.

Receipt PDF pagination must render the complete receipt canvas first, then crop and add each A4-sized slice as its own PDF page; scaling one tall image with negative offsets can leave shared/downloaded PDFs showing only the first page.

**Why:** The receipt HTML can grow beyond one page as work logs and payments increase, and the share path uses the generated PDF rather than the print preview.

**How to apply:** Keep the invoice sheet overflow visible for export and paginate from the full rendered canvas whenever receipt content can exceed one page.

In the planned owner/driver workspace, the driver sees the owner’s company logo and company name as read-only branding; the driver has no profile-picture option and cannot change the owner company name.

**Why:** Driver identity and owner business identity must remain separate, while the owner’s branding should carry into the driver workspace.

**How to apply:** Keep owner logo/name sourced from the linked owner profile, expose them read-only to drivers, and allow only driver-owned profile fields to be edited.