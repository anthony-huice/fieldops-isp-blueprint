/**
 * FieldOps Domain Engine — Core Validation & Multi-Tenant Business Rules
 * ======================================================================
 * Implements pure, deterministic validation for:
 * 1. Dynamic FTTH Kanban phase transitions (with mandatory GPS + LCH photo gates).
 * 2. Haversine GPS distance calculation between NAP splitter box and customer premises.
 * 3. Digital handwritten signature SVG vector validation.
 * 4. Serialized WMS equipment custody & GPON ONU / MAC IEEE 802 validation.
 */

export type WorkOrderPhase =
  | "SALES_INTAKE"
  | "TECHNICAL_FEASIBILITY"
  | "READY_TO_INSTALL"
  | "ASSIGNED_TO_CREW"
  | "IN_PROGRESS"
  | "PENDING_ACTIVATION"
  | "ACTIVE_SUBSCRIBER";

export type CustodyState =
  | "CENTRAL_WAREHOUSE"
  | "RECEIVED_AT_BRANCH"
  | "ASSIGNED_TO_TECH"
  | "INSTALLED_AT_CLIENT"
  | "RETURN_PENDING"
  | "RECOVERED_EQUIPMENT";

export interface GpsCoordinate {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface WorkOrderCard {
  id: string;
  tenantId: string;
  subscriberName: string;
  phase: WorkOrderPhase;
  assignedTechId?: string;
  napCoordinates?: GpsCoordinate;
  premisesCoordinates?: GpsCoordinate;
  evidenceUrls: string[];
  assignedSerials: string[];
  clientSignatureSvg?: string;
}

const MAC_ADDRESS_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
const GPON_SERIAL_REGEX = /^[A-Z]{4}[0-9A-F]{8}$/;

/**
 * Validates IEEE 802 MAC address and GPON ONU 12-character vendor serial
 * (e.g., ZTEG1A2B3C4D, HWTC9F8E7D6C, ALCL00112233).
 */
export function validateHardwareIdentifiers(
  gponSerial: string,
  macAddress: string
): { valid: boolean; normalizedSerial: string; normalizedMac: string; error?: string } {
  const normalizedSerial = gponSerial.trim().toUpperCase();
  const normalizedMac = macAddress.trim().toUpperCase().replace(/-/g, ":");

  if (!GPON_SERIAL_REGEX.test(normalizedSerial)) {
    return {
      valid: false,
      normalizedSerial,
      normalizedMac,
      error: "GPON Serial must be 4 vendor letters + 8 hex digits (e.g., ZTEG1A2B3C4D).",
    };
  }

  if (!MAC_ADDRESS_REGEX.test(normalizedMac)) {
    return {
      valid: false,
      normalizedSerial,
      normalizedMac,
      error: "Invalid IEEE 802 MAC address format (expected XX:XX:XX:XX:XX:XX).",
    };
  }

  return { valid: true, normalizedSerial, normalizedMac };
}

/**
 * Computes the great-circle distance in meters between two GPS coordinates
 * using the Haversine formula to verify FTTH fiber drop length from NAP to home.
 */
export function calculateHaversineDistanceMeters(
  coordA: GpsCoordinate,
  coordB: GpsCoordinate
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(coordB.latitude - coordA.latitude);
  const dLon = toRad(coordB.longitude - coordA.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coordA.latitude)) *
      Math.cos(toRad(coordB.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Enforces mandatory field gates before permitting a work order card to advance
 * to PENDING_ACTIVATION or ACTIVE_SUBSCRIBER in the Kanban board.
 */
export function validateKanbanPhaseTransition(
  card: WorkOrderCard,
  targetPhase: WorkOrderPhase
): { allowed: boolean; reason?: string } {
  if (targetPhase === "PENDING_ACTIVATION" || targetPhase === "ACTIVE_SUBSCRIBER") {
    if (!card.napCoordinates || !card.premisesCoordinates) {
      return {
        allowed: false,
        reason: "Mandatory GPS coordinates (NAP box and customer premises) are missing.",
      };
    }
    if (card.evidenceUrls.length < 2) {
      return {
        allowed: false,
        reason: "At least 2 photographic evidences (NAP port & optical power meter) are required.",
      };
    }
    if (card.assignedSerials.length === 0) {
      return {
        allowed: false,
        reason: "At least 1 serialized ONU/Router must be linked from technician custody.",
      };
    }
    if (!card.clientSignatureSvg || card.clientSignatureSvg.trim().length < 20) {
      return {
        allowed: false,
        reason: "Customer digital handwritten signature is required for installation closure.",
      };
    }
  }
  return { allowed: true };
}

/**
 * Validates that a captured SVG path string contains sufficient vector stroke points
 * to constitute a genuine handwritten customer signature.
 */
export function validateSignatureStrokeSvg(svgPathData: string): boolean {
  const cleaned = svgPathData.trim();
  const moveCommands = (cleaned.match(/M\s*\d+/gi) || []).length;
  const lineCommands = (cleaned.match(/L\s*\d+/gi) || []).length;
  return moveCommands >= 1 && lineCommands >= 4;
}
