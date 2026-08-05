---
name: Driver pay snapshots
description: Historical driver earnings and the separation between driver pay and customer billing.
---

Each work log stores two separate money concepts: the vehicle/customer work amount entered on the log, and the owner-configured daily driver rate that was active when the log was created. Driver Home, Payments, Owner history, analytics, invoices, and reports must calculate driver earnings from the stored rate snapshot; changing the driver's rate only affects future logs.

**Why:** A later owner rate change must not recalculate prior work. Vehicle/customer work amounts are a separate business value and must never be used as driver wages.

**How to apply:** Let drivers record the vehicle work amount and measure (hours/trips) on each work log, derive the driver rate from the owner workspace for new logs, preserve it during edits, and use a legacy current-rate fallback only for records created before snapshots existed.