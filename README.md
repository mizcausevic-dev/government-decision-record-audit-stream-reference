# government-decision-record-audit-stream-reference

> **AGPL-3.0 reference implementation of [`government-decision-record-audit-stream`](https://github.com/mizcausevic-dev/government-decision-record-audit-stream).** Runs the canonical PRFSA × VendorG GovDecide v3.x trajectory end-to-end against a mock Federal AI Use Case Inventory + classification-clearance gate. Proves THE FIRST Suite audit-stream with **three orthogonal invariants** (human-agency-officer + Federal AI Use Case Inventory entry + classification-clearance per E.O. 13526) works end-to-end in code.

Part of the [Kinetic Gain Protocol Suite](https://suite.kineticgain.com).

Sibling to [`fhir-resource-access-audit-reference`](https://github.com/mizcausevic-dev/fhir-resource-access-audit-reference) (HealthTech), [`matter-decision-record-audit-stream-reference`](https://github.com/mizcausevic-dev/matter-decision-record-audit-stream-reference) (LegalTech), [`grid-decision-record-audit-stream-reference`](https://github.com/mizcausevic-dev/grid-decision-record-audit-stream-reference) (EnergyTech), and [`defense-decision-record-audit-stream-reference`](https://github.com/mizcausevic-dev/defense-decision-record-audit-stream-reference) (DefenseTech).

## What this proves

The GovTech spec ships with **three independent invariants that must hold on every event**. This is the most ambitious invariant design in the Suite — most verticals enforce 1-2 invariants. GovTech requires all three:

1. **`human-agency-officer-required`** — every event must carry `agent.agency_officer_id_tokenized`. No anonymous AI decisions in government settings. Maps to OMB M-24-10 §5(d) human-review minimum practice for rights-impacting AI.
2. **Federal AI Use Case Inventory entry** — every event must reference a registered `agent.ai_use_case_inventory_entry_id` that exists in the federal inventory AND whose agency matches the resource. Maps to OMB M-24-10 §3(a) — agencies must register all rights/safety-impacting AI use cases before deployment.
3. **`classification-clearance`** — every event's `agent.clearance_level` must be ≥ `resource.classification` along the ordered ladder (UNCLASSIFIED < CUI < CONFIDENTIAL < SECRET < TOP-SECRET). Maps to E.O. 13526 — Classified National Security Information.

The reference impl proves all three interlock: the vault enforces them at request-time; the verifier independently validates them on the produced event stream.

## Architecture

```
orchestrator.mjs
   │
   ├─ requests access via federal-vault.mjs (enforces all 3 invariants)
   │
   ├─ builds hash-chained event via event-builder.mjs (canonical-JSON SHA-256)
   │
   └─ emits to examples/prfsa-govdecide-reference-stream.ndjson

verifier.mjs (independent, post-hoc)
   │
   ├─ chain integrity (each prev_hash = prior hash)
   ├─ invariant #1: human-agency-officer
   ├─ invariant #2: Federal AI Use Case Inventory entry
   └─ invariant #3: classification-clearance per E.O. 13526
```

## Run it

```bash
git clone https://github.com/mizcausevic-dev/government-decision-record-audit-stream-reference
cd government-decision-record-audit-stream-reference
npm install
npm start    # orchestrates + writes the stream + runs the verifier
npm test     # 10 unit tests including vault-denial + verifier-trip cases
```

Expected output:
```
Built 3 events → examples/prfsa-govdecide-reference-stream.ndjson
OK · 3 events · chain ✓ · 3 invariants ✓ (human-agency-officer + Federal AI Use Case Inventory + classification-clearance)
```

## Canonical trajectory — PRFSA (fictional Pacific Region Federal Services Agency)

1. **Benefit eligibility pre-screened** — UNCLASSIFIED, rights-impacting under OMB M-24-10 §5(d). Inventory entry `PRFSA-AI-2026-014`, agency officer ID required. Agent at UNCLASSIFIED clearance is sufficient.
2. **Permit application classified** — UNCLASSIFIED, rights-impacting. Inventory entry `PRFSA-AI-2026-022`. Agent at CUI clearance (higher than needed; agents are allowed to operate on lower-classified material).
3. **FOIA response triaged** — CUI tier, neither rights- nor safety-impacting (but STILL requires inventory entry per §3(a)). Inventory entry `PRFSA-AI-2026-031`. Agent at SECRET clearance comfortably ≥ CUI.

## Vault denial scenarios (covered by tests)

The mock federal vault rejects requests with crisp reasons matching the four real-world failure modes:

| Failure mode | Trigger | Reason in test |
| --- | --- | --- |
| Unknown inventory entry | Agent references AI use case not registered with OMB | "Federal AI Use Case Inventory has no entry..." |
| Cross-agency mismatch | PRFSA officer trying to use ANOTHER_AGENCY's inventory entry | "Inventory entry agency does not match resource agency" |
| Clearance < classification | UNCLASSIFIED agent attempting SECRET resource | "Agent clearance X < resource classification Y per E.O. 13526" |
| Missing officer identity | Event lacks `agency_officer_id_tokenized` | "Missing agent_agency_officer_id_tokenized" |

## Why a separate AGPL-3.0 reference impl

- **The spec repo** ([`government-decision-record-audit-stream`](https://github.com/mizcausevic-dev/government-decision-record-audit-stream)) is MIT and contains schema + example data + static verifier. It does NOT run end-to-end.
- **This repo** wires the federal vault + audit-stream + verifier into a runnable trajectory. AGPL-3.0 because reference implementations carry a stronger copyleft posture than the specs themselves — standing Suite rule.
- Sibling reference impls follow the same pattern. **Specs MIT, reference implementations AGPL-3.0.**

## Composes with

- [`government-decision-record-audit-stream`](https://github.com/mizcausevic-dev/government-decision-record-audit-stream) — the spec this implements
- [`omb-m24-10-readiness-evidence-bundle`](https://github.com/mizcausevic-dev/omb-m24-10-readiness-evidence-bundle) — evidence bundle that ingests events produced here
- [`government-ai-incident-card-profile`](https://github.com/mizcausevic-dev/government-ai-incident-card-profile) — any verifier failure becomes a published Incident Card
- [`state-government-ai-disclosure-tracker`](https://github.com/mizcausevic-dev/state-government-ai-disclosure-tracker) — regulatory-lifecycle context (OMB memos, agency policies, state government AI laws)
- [`citizen-data-vault-contract-profile`](https://github.com/mizcausevic-dev/citizen-data-vault-contract-profile) — vault contract for citizen data accessed by the AI
- [Kinetic Gain Protocol Suite](https://suite.kineticgain.com) — umbrella

## Compliance posture

Reference implementation **readiness scaffolding** for OMB M-24-10 + OMB M-24-18 + AI Bill of Rights + Section 508 + Privacy Act + FOIA + NIST AI RMF + FedRAMP. Does NOT constitute OMB compliance attestation, agency Authority-to-Operate (ATO), FedRAMP authorization, or classification-handling approval. The mock federal vault + inventory are in-memory — production deployments must use the real Federal AI Use Case Inventory + agency identity provider (PIV/CAC) + classified environment infrastructure. Per the standing Suite public-language guardrail: *readiness · evidence · posture · controls · scaffolding* — never "compliant" / "certified" without external attestation.

## License

AGPL-3.0-only. Spec repos this depends on remain MIT.
