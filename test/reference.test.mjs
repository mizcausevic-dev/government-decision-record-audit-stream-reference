import { test } from "node:test";
import assert from "node:assert/strict";
import { orchestrate } from "../src/orchestrator.mjs";
import { verify } from "../src/verifier.mjs";
import { requestFederalAccess } from "../src/federal-vault.mjs";

test("orchestrator produces 3 events with no vault denials", () => {
  const { events, denials } = orchestrate();
  assert.equal(events.length, 3);
  assert.equal(denials.length, 0);
});

test("produced stream passes verifier (chain + all 3 invariants)", () => {
  const { events } = orchestrate();
  const r = verify(events);
  assert.ok(r.ok, JSON.stringify(r.errors, null, 2));
});

test("vault denies unknown Federal AI Use Case Inventory entry", () => {
  const r = requestFederalAccess({
    ai_use_case_inventory_entry_id: "PRFSA-AI-DOES-NOT-EXIST",
    agent_clearance_level: "SECRET",
    resource_classification: "UNCLASSIFIED",
    agent_agency_officer_id_tokenized: "tok_off_X",
    resource_agency: "PRFSA"
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /Federal AI Use Case Inventory/);
});

test("vault denies clearance below resource classification", () => {
  const r = requestFederalAccess({
    ai_use_case_inventory_entry_id: "PRFSA-AI-2026-031",
    agent_clearance_level: "UNCLASSIFIED",
    resource_classification: "SECRET",
    agent_agency_officer_id_tokenized: "tok_off_X",
    resource_agency: "PRFSA"
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /E\.O\. 13526/);
});

test("vault denies missing agency officer", () => {
  const r = requestFederalAccess({
    ai_use_case_inventory_entry_id: "PRFSA-AI-2026-031",
    agent_clearance_level: "SECRET",
    resource_classification: "CUI",
    agent_agency_officer_id_tokenized: null,
    resource_agency: "PRFSA"
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /agency_officer_id_tokenized/);
});

test("vault denies cross-agency mismatch", () => {
  const r = requestFederalAccess({
    ai_use_case_inventory_entry_id: "PRFSA-AI-2026-031",   // PRFSA entry
    agent_clearance_level: "SECRET",
    resource_classification: "UNCLASSIFIED",
    agent_agency_officer_id_tokenized: "tok_off_X",
    resource_agency: "OTHER_AGENCY"
  });
  assert.equal(r.allowed, false);
  assert.match(r.reason, /agency/);
});

test("verifier catches tampered hash", () => {
  const { events } = orchestrate();
  const tampered = JSON.parse(JSON.stringify(events));
  tampered[1].hash = "0".repeat(64);
  const r = verify(tampered);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("hash")));
});

test("verifier catches missing agency officer (invariant #1)", () => {
  const { events } = orchestrate();
  const tampered = JSON.parse(JSON.stringify(events));
  delete tampered[1].agent.agency_officer_id_tokenized;
  const r = verify(tampered);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("invariant#1")));
});

test("verifier catches missing inventory entry (invariant #2)", () => {
  const { events } = orchestrate();
  const tampered = JSON.parse(JSON.stringify(events));
  delete tampered[2].agent.ai_use_case_inventory_entry_id;
  const r = verify(tampered);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("invariant#2")));
});

test("verifier catches clearance < classification (invariant #3)", () => {
  const { events } = orchestrate();
  const tampered = JSON.parse(JSON.stringify(events));
  tampered[2].agent.clearance_level = "UNCLASSIFIED";   // event 2 has CUI resource
  const r = verify(tampered);
  assert.ok(!r.ok);
  assert.ok(r.errors.some((e) => e.includes("invariant#3")));
});
