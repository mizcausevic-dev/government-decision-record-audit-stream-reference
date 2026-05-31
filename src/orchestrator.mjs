// orchestrator.mjs — PRFSA × VendorG GovDecide v3.x canonical trajectory.
//
// Pacific Region Federal Services Agency (PRFSA) — fictional federal agency
// in the western US region — uses VendorG GovDecide v3.x to:
//   1. pre-screen citizen benefit applications (UNCLASSIFIED, rights-impacting)
//   2. classify permit applications (UNCLASSIFIED, rights-impacting)
//   3. triage FOIA responses (CUI, neither rights- nor safety-impacting)
//
// Each step request-gates through the federal vault (which enforces all 3 invariants)
// before the audit event is emitted.

import { requestFederalAccess } from "./federal-vault.mjs";
import { Chain } from "./event-builder.mjs";

const AGENT_BASE = {
  ai_tool_card_url:     "https://vendorg-govdecide.example/.well-known/ai-tool-cards/govdecide-3.x.json",
  ai_decision_card_url: "https://prfsa.example/.well-known/decisions/PRFSA-DEC-2026-GOV-0017.json"
};
const DECISION_CARD = AGENT_BASE.ai_decision_card_url;

const STEPS = [
  // 1. Benefit pre-screen — UNCLASSIFIED, rights-impacting, full agency officer chain
  {
    event_id: "0190gt-r-0001", timestamp: "2026-11-10T14:00:00Z",
    kind: "govtech.benefit.eligibility-pre-screened",
    source: "prfsa-benefits-prod",
    subject_ref: { scheme: "applicant-id-tokenized", value: "tok_app_a1b2" },
    resource: { type: "benefit-application", id_tokenized: "tok_res_ba_001", classification: "UNCLASSIFIED", agency: "PRFSA" },
    action: "score",
    agent: { ...AGENT_BASE, ai_use_case_inventory_entry_id: "PRFSA-AI-2026-014", clearance_level: "UNCLASSIFIED", agency_officer_id_tokenized: "tok_off_PRFSA_officer_47" },
    regulatory_basis: ["omb-m-24-10-section-5d-rights-impacting", "ai-bill-of-rights-blueprint", "nist-ai-rmf-1-0"],
    decision_card_ref: DECISION_CARD
  },
  // 2. Permit classification — UNCLASSIFIED, rights-impacting, different inventory entry
  {
    event_id: "0190gt-r-0002", timestamp: "2026-11-10T15:30:00Z",
    kind: "govtech.permit.application-classified",
    source: "prfsa-permits-prod",
    subject_ref: { scheme: "permit-application-id-tokenized", value: "tok_perm_c3d4" },
    resource: { type: "permit-application", id_tokenized: "tok_res_perm_002", classification: "UNCLASSIFIED", agency: "PRFSA" },
    action: "classify",
    agent: { ...AGENT_BASE, ai_use_case_inventory_entry_id: "PRFSA-AI-2026-022", clearance_level: "CUI", agency_officer_id_tokenized: "tok_off_PRFSA_officer_47" },
    regulatory_basis: ["omb-m-24-10-section-5d-rights-impacting", "section-508-accessibility-required"],
    decision_card_ref: DECISION_CARD
  },
  // 3. FOIA triage — CUI tier, NOT rights/safety-impacting but still needs inventory entry
  {
    event_id: "0190gt-r-0003", timestamp: "2026-11-10T16:45:00Z",
    kind: "govtech.foia.response-triaged",
    source: "prfsa-foia-prod",
    subject_ref: { scheme: "foia-request-id-tokenized", value: "tok_foia_e5f6" },
    resource: { type: "foia-request-record", id_tokenized: "tok_res_foia_003", classification: "CUI", agency: "PRFSA" },
    action: "triage",
    agent: { ...AGENT_BASE, ai_use_case_inventory_entry_id: "PRFSA-AI-2026-031", clearance_level: "SECRET", agency_officer_id_tokenized: "tok_off_PRFSA_officer_47" },
    regulatory_basis: ["privacy-act-of-1974", "foia-5-usc-552"],
    decision_card_ref: DECISION_CARD
  }
];

export function orchestrate({ skipVaultCheck = false } = {}) {
  const chain = new Chain();
  const events = [];
  const denials = [];
  for (const step of STEPS) {
    if (!skipVaultCheck) {
      const check = requestFederalAccess({
        ai_use_case_inventory_entry_id: step.agent.ai_use_case_inventory_entry_id,
        agent_clearance_level: step.agent.clearance_level,
        resource_classification: step.resource.classification,
        agent_agency_officer_id_tokenized: step.agent.agency_officer_id_tokenized,
        resource_agency: step.resource.agency
      });
      if (!check.allowed) { denials.push({ event_id: step.event_id, reason: check.reason }); continue; }
    }
    events.push(chain.build(step));
  }
  return { events, denials };
}
