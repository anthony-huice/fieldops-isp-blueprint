import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateHaversineDistanceMeters,
  validateHardwareIdentifiers,
  validateKanbanPhaseTransition,
  validateSignatureStrokeSvg,
  WorkOrderCard,
} from "../src/domain/fieldopsCore.js";

describe("FieldOps FTTH & Serialized WMS Domain Suite", () => {
  it("validates GPON 12-char vendor serials and normalizes IEEE 802 MAC addresses", () => {
    const valid = validateHardwareIdentifiers("zteg1a2b3c4d", "a0-b1-c2-d3-e4-f5");
    assert.equal(valid.valid, true);
    assert.equal(valid.normalizedSerial, "ZTEG1A2B3C4D");
    assert.equal(valid.normalizedMac, "A0:B1:C2:D3:E4:F5");

    const invalid = validateHardwareIdentifiers("INVALID123", "A0:B1:C2:D3:E4:F5");
    assert.equal(invalid.valid, false);
  });

  it("computes accurate Haversine fiber drop distance between NAP splitter and premises", () => {
    const nap = { latitude: 10.4806, longitude: -66.9036, accuracyMeters: 4 };
    const home = { latitude: 10.4815, longitude: -66.9036, accuracyMeters: 5 };

    const distance = calculateHaversineDistanceMeters(nap, home);
    assert.ok(distance > 95 && distance < 105);
  });

  it("enforces mandatory field evidence gates before advancing Kanban card to activation", () => {
    const incompleteCard: WorkOrderCard = {
      id: "wo-101",
      tenantId: "tenant-1",
      subscriberName: "Demo Subscriber",
      phase: "IN_PROGRESS",
      evidenceUrls: ["https://storage.demo/nap.jpg"],
      assignedSerials: [],
    };

    const blocked = validateKanbanPhaseTransition(incompleteCard, "PENDING_ACTIVATION");
    assert.equal(blocked.allowed, false);

    const completeCard: WorkOrderCard = {
      ...incompleteCard,
      napCoordinates: { latitude: 10.4806, longitude: -66.9036, accuracyMeters: 4 },
      premisesCoordinates: { latitude: 10.4812, longitude: -66.9036, accuracyMeters: 4 },
      evidenceUrls: [
        "https://storage.demo/nap.jpg",
        "https://storage.demo/power-meter.jpg",
      ],
      assignedSerials: ["ZTEG1A2B3C4D"],
      clientSignatureSvg: "M 10 20 L 25 35 L 40 30 L 60 50 L 85 45 L 110 60",
    };

    const allowed = validateKanbanPhaseTransition(completeCard, "PENDING_ACTIVATION");
    assert.equal(allowed.allowed, true);
  });

  it("validates handwritten customer digital signature SVG vector paths", () => {
    assert.equal(
      validateSignatureStrokeSvg("M 12 40 L 20 50 L 35 55 L 50 42 L 70 60"),
      true
    );
    assert.equal(validateSignatureStrokeSvg("M 10 10 L 12 12"), false);
  });
});
