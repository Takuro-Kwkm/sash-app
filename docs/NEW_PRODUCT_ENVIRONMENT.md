# New-product execution environment

Unregistered products are normal input to this repository's adopted generic
builder. No product-specific production row or change adapter is required before
creation. The native planner must still acquire the complete Current Registry
and distinguish absence from acquisition failure and an existing product.

Acquire fresh remote-default Central and use an aligned native checkout. Before
selecting a product, run Central's `scripts/verify-new-product-environment.py`
with an acquired repository-to-checkout map and an external report path. The
check uses the existing compatibility/profile validators and creates no product.
A stale dirty checkout is preserved; use an isolated aligned checkout rather
than overwriting ongoing work or weakening Authority checks. Save the acquired
map with the task so subsequent routing uses the verified checkout.

The `Actual New Product Master Build` CI checks the adopted immutable dependency,
repository environment and isolated candidate/QA/save/readback/Resume execution.
Live host acquisition of Current is a separate check. Environment failure must
be described as environment failure, never as invalid product absence.

The intake successor retains the original adoption, previous profiles and
completed Work. Product facts, Formal/Runtime/UI/Release records, approvals and
publication destinations are unchanged. No real product is created by this fix.
