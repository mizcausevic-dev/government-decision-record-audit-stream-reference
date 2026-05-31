// verifier.mjs — Validates the produced stream against the 3 GovTech invariants.
//
// THE FIRST Suite audit-stream with three orthogonal invariants on every event:
//   #1: human-agency-officer-required — every event must carry agent.agency_officer_id_tokenized
//   #2: Federal AI Use Case Inventory entry — every event must carry agent.ai_use_case_inventory_entry_id per OMB M-24-10 §3(a)
//   #3: classification-clearance — agent.clearance_level >= resource.classification per E.O. 13526
//
// All three must hold for EVERY event. The 3-axis design choice
// (vs LegalTech's 3-invariants-around-attorney-supervision or DefenseTech's
// 3-axis vault-policy-tuple) is that GovTech's three are at the EVENT
// level rather than at the contract or resource level — every emitted event
// must independently satisfy all three.

import { canonicalize, sha256, ZERO_HASH } from "./event-builder.mjs";

const CLASSIFICATION_RANK = ["UNCLASSIFIED", "CUI", "CONFIDENTIAL", "SECRET", "TOP-SECRET"];

export function verify(events) {
  const errors = [];

  // Chain integrity
  let expectedPrev = ZERO_HASH;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.prev_hash !== expectedPrev) errors.push(`chain: event[${i}] (${e.event_id}) prev_hash mismatch`);
    const { hash: _h, ...body } = e;
    if (e.hash !== sha256(canonicalize(body))) errors.push(`chain: event[${i}] (${e.event_id}) hash mismatch`);
    expectedPrev = e.hash;
  }

  // Invariant #1: human-agency-officer
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e.agent?.agency_officer_id_tokenized) {
      errors.push(`invariant#1: event[${i}] (${e.event_id}) missing agent.agency_officer_id_tokenized (human-agency-officer-required, OMB M-24-10 §5(d))`);
    }
  }

  // Invariant #2: Federal AI Use Case Inventory entry
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e.agent?.ai_use_case_inventory_entry_id) {
      errors.push(`invariant#2: event[${i}] (${e.event_id}) missing agent.ai_use_case_inventory_entry_id (Federal AI Use Case Inventory entry, OMB M-24-10 §3(a))`);
    }
  }

  // Invariant #3: classification-clearance
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const agentRank = CLASSIFICATION_RANK.indexOf(e.agent?.clearance_level);
    const resourceRank = CLASSIFICATION_RANK.indexOf(e.resource?.classification);
    if (agentRank < 0) {
      errors.push(`invariant#3: event[${i}] (${e.event_id}) unknown agent.clearance_level "${e.agent?.clearance_level}"`);
    } else if (resourceRank < 0) {
      errors.push(`invariant#3: event[${i}] (${e.event_id}) unknown resource.classification "${e.resource?.classification}"`);
    } else if (agentRank < resourceRank) {
      errors.push(`invariant#3: event[${i}] (${e.event_id}) agent clearance ${e.agent.clearance_level} < resource classification ${e.resource.classification} per E.O. 13526`);
    }
  }

  return { ok: errors.length === 0, errors };
}
