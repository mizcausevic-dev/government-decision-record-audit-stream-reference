# Changelog

## 1.0.0-prod — 2026-05-31

- Hardened to v1.0-prod per squad doctrine; member of the GovTech vertical 6-pack.
- Spec-component repo (no Pages deploy required); AGPL-3.0-or-later, synthetic example data only.
- Pulse universe entry not applicable (no custom subdomain).



## [0.1] — 2026-05-31

### Added

- Initial AGPL-3.0 reference implementation.
- **`federal-vault.mjs`** — In-memory mock Federal AI Use Case Inventory (3 PRFSA entries: benefit eligibility / permit classification / FOIA triage) + classification-clearance gate enforcing E.O. 13526 ordered ladder.
- **`event-builder.mjs`** — Canonical-JSON SHA-256 hash-chained `Chain` class (same shape as sibling reference impls).
- **`orchestrator.mjs`** — 3-step PRFSA × VendorG GovDecide v3.x trajectory exercising all three invariants across UNCLASSIFIED + CUI resource classifications + rights-impacting + non-rights-impacting use cases.
- **`verifier.mjs`** — Independent post-hoc verifier: chain integrity + 3 orthogonal invariants enforced on every event:
  - **#1 human-agency-officer** — `agent.agency_officer_id_tokenized` required
  - **#2 Federal AI Use Case Inventory entry** — `agent.ai_use_case_inventory_entry_id` required per OMB M-24-10 §3(a)
  - **#3 classification-clearance** — `agent.clearance_level` ≥ `resource.classification` per E.O. 13526
- **`cli.mjs`** — `npm start` orchestrates + writes stream + runs verifier in one command.
- 10 unit tests covering: orchestrator output, verifier on canonical stream, vault denial on unknown inventory entry / clearance-under / missing officer / cross-agency mismatch, tampered-hash detection, verifier trip for each of the 3 invariants.

### Notable

- First Suite reference implementation with **3 orthogonal invariants enforced on every event** (vs DefenseTech's 3 invariants that distribute across event/contract/vault, vs LegalTech's 3 invariants around attorney supervision). The GovTech model is the strictest per-event design.

### Not yet

- Real Federal AI Use Case Inventory fetch (today's inventory is hardcoded with 3 PRFSA entries).
- Real PIV/CAC identity verification — today's officer IDs are tokenized strings.
- CLASSIFIED+ tier trajectory — current example only exercises UNCLASSIFIED + CUI to avoid fictional program designations.
- ATO / FedRAMP audit trail extensions.
- ed25519 event signing.