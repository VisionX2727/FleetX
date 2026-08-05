---
name: Driver pay snapshots
description: Historical driver earnings and the separation between driver pay and customer billing.
---

Each work log stores the owner-configured daily driver rate that was active when the log was created. Driver Home, Payments, Owner history, analytics, invoices, and reports must calculate driver earnings from that stored snapshot; changing the driver's rate only affects future logs.

**Why:** A later owner rate change must not recalculate prior work. Customer/Khata billing amounts are a separate business value and must never be used as driver wages.

**How to apply:** Keep the driver rate out of driver-entered forms, derive it from the owner workspace for new logs, preserve it during edits, and use a legacy current-rate fallback only for records created before snapshots existed.