// federal-vault.mjs — Mock Federal AI Use Case Inventory + classification-clearance gate.
//
// In production this would be:
//   - OMB's actual Federal AI Use Case Inventory (https://www.cio.gov/handbook/it-laws/federal-ai-use-case-inventory/)
//   - Agency-specific identity provider (PIV / CAC card + clearance system)
//   - SCIF-gated classified environment for CLASSIFIED+ ops
//
// Here we model a small in-memory inventory of approved AI use cases
// + a per-agent clearance level + a classification-tier matrix.

const FEDERAL_AI_USE_CASE_INVENTORY = new Map([
  // entry_id → { agency, use_case, is_safety_impacting, is_rights_impacting, omb_m_24_10_section_5_class }
  ["PRFSA-AI-2026-014", { agency: "PRFSA", use_case: "Benefit eligibility pre-screening", is_safety_impacting: false, is_rights_impacting: true, omb_m_24_10_section_5_class: "5(d)-rights-impacting" }],
  ["PRFSA-AI-2026-022", { agency: "PRFSA", use_case: "Permit application classification", is_safety_impacting: false, is_rights_impacting: true, omb_m_24_10_section_5_class: "5(d)-rights-impacting" }],
  ["PRFSA-AI-2026-031", { agency: "PRFSA", use_case: "FOIA response triage", is_safety_impacting: false, is_rights_impacting: false, omb_m_24_10_section_5_class: "neither" }]
]);

const CLASSIFICATION_RANK = ["UNCLASSIFIED", "CUI", "CONFIDENTIAL", "SECRET", "TOP-SECRET"];

/**
 * Validate a request against:
 *   1. Federal AI Use Case Inventory — entry must exist + match the resource's agency
 *   2. Classification clearance — agent's clearance >= resource's classification
 *   3. Agency officer identity — must be present + tokenized
 *
 * Returns { allowed, reason } where reason explains the first failure.
 */
export function requestFederalAccess({ ai_use_case_inventory_entry_id, agent_clearance_level, resource_classification, agent_agency_officer_id_tokenized, resource_agency }) {
  const inventoryEntry = FEDERAL_AI_USE_CASE_INVENTORY.get(ai_use_case_inventory_entry_id);
  if (!inventoryEntry) {
    return { allowed: false, reason: `Federal AI Use Case Inventory has no entry "${ai_use_case_inventory_entry_id}" — per OMB M-24-10 §3(a), all rights-impacting + safety-impacting AI must be registered before use`, inventoryEntry: null };
  }
  if (inventoryEntry.agency !== resource_agency) {
    return { allowed: false, reason: `Inventory entry agency "${inventoryEntry.agency}" does not match resource agency "${resource_agency}"`, inventoryEntry };
  }
  const agentRank = CLASSIFICATION_RANK.indexOf(agent_clearance_level);
  const resourceRank = CLASSIFICATION_RANK.indexOf(resource_classification);
  if (agentRank < 0) return { allowed: false, reason: `Unknown agent clearance "${agent_clearance_level}"`, inventoryEntry };
  if (resourceRank < 0) return { allowed: false, reason: `Unknown resource classification "${resource_classification}"`, inventoryEntry };
  if (agentRank < resourceRank) {
    return { allowed: false, reason: `Agent clearance ${agent_clearance_level} (rank ${agentRank}) < resource classification ${resource_classification} (rank ${resourceRank}) per E.O. 13526`, inventoryEntry };
  }
  if (!agent_agency_officer_id_tokenized) {
    return { allowed: false, reason: `Missing agent_agency_officer_id_tokenized — every event must identify the responsible agency officer`, inventoryEntry };
  }
  return { allowed: true, reason: null, inventoryEntry };
}

export { FEDERAL_AI_USE_CASE_INVENTORY, CLASSIFICATION_RANK };
