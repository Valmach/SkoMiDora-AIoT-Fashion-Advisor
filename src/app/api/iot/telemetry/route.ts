import { NextRequest, NextResponse } from "next/server";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

if (!getApps().length) {
  initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "styleai-footwear",
  });
}

const VALID_EVENTS = new Set([
  "device-registered",
  "network-detected",
  "heartbeat",
  "box-detected",
  "box-opened",
  "box-closed",
  "box-removed",
  "box-returned",
  "charging-started",
  "charging-stopped",
  "battery-low",
  "humidity-high",
  "temperature-high",
  "rfid-scanned",
  "nfc-scanned",
  "slot-changed",
]);

const VALID_CONDITION_EVENTS = new Set([
  "new",
  "worn",
  "cleaned",
  "repaired",
  "resoled",
  "scuffed",
  "oxidized",
  "humidity-exposure",
  "temperature-exposure",
  "photo-added",
  "condition-inspected",
  "stored",
  "removed",
  "returned",
  "authenticated",
  "valued",
  "listed-for-resale",
]);

function cleanText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/\s+/g, " ").trim();
  return cleaned || null;
}

function cleanId(value: unknown): string | null {
  const cleaned = cleanText(value);
  if (!cleaned) return null;
  return cleaned.replace(/[^a-zA-Z0-9._:-]/g, "-").slice(0, 120);
}

function cleanNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cleanStringArray(value: unknown, limit = 20): string[] {
  if (!value) return [];

  const raw = Array.isArray(value)
    ? value
    : String(value).split(/[,;|]/);

  const seen = new Set<string>();
  const out: string[] = [];

  for (const entry of raw) {
    const cleaned = cleanText(entry);
    if (!cleaned) continue;

    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(cleaned);

    if (out.length >= limit) break;
  }

  return out;
}

function physicalStatus(eventType: string, fallback: string | null) {
  if (eventType === "box-removed") return "removed";
  if (eventType === "box-returned") return "stored";
  if (eventType === "box-opened") return "opened";
  if (eventType === "box-closed") return "stored";
  if (eventType === "box-detected") return "stored";
  return fallback || "online";
}

function autoConditionEventFromSensors(eventType: string, humidityPct: number | null, temperatureC: number | null) {
  if (eventType === "humidity-high") return "humidity-exposure";
  if (eventType === "temperature-high") return "temperature-exposure";

  if (humidityPct !== null && humidityPct >= 70) return "humidity-exposure";
  if (temperatureC !== null && temperatureC >= 32) return "temperature-exposure";

  return null;
}

function severityFromSensors(
  conditionEventType: string | null,
  humidityPct: number | null,
  temperatureC: number | null,
  fallback: string | null
) {
  if (fallback) return fallback;

  if (conditionEventType === "humidity-exposure") {
    if (humidityPct !== null && humidityPct >= 80) return "high";
    if (humidityPct !== null && humidityPct >= 70) return "medium";
    return "low";
  }

  if (conditionEventType === "temperature-exposure") {
    if (temperatureC !== null && temperatureC >= 36) return "high";
    if (temperatureC !== null && temperatureC >= 32) return "medium";
    return "low";
  }

  return "low";
}

function conditionSummaryPatch(conditionEventType: string, eventTime: FirebaseFirestore.FieldValue) {
  const patch: Record<string, unknown> = {
    conditionUpdatedAt: eventTime,
  };

  if (conditionEventType === "new") {
    patch.conditionStatus = "new";
    patch.lastConditionStatusAt = eventTime;
  }

  if (conditionEventType === "worn") {
    patch.conditionStatus = "worn";
    patch.lastWornAt = eventTime;
    patch.wearCount = FieldValue.increment(1);
  }

  if (conditionEventType === "cleaned") {
    patch.conditionStatus = "cleaned";
    patch.lastCleanedAt = eventTime;
    patch.cleanCount = FieldValue.increment(1);
  }

  if (conditionEventType === "repaired") {
    patch.conditionStatus = "repaired";
    patch.lastRepairedAt = eventTime;
    patch.repairCount = FieldValue.increment(1);
  }

  if (conditionEventType === "resoled") {
    patch.conditionStatus = "resoled";
    patch.lastResoledAt = eventTime;
    patch.resoleCount = FieldValue.increment(1);
  }

  if (conditionEventType === "scuffed") {
    patch.conditionStatus = "scuffed";
    patch.lastScuffedAt = eventTime;
    patch.scuffCount = FieldValue.increment(1);
  }

  if (conditionEventType === "oxidized") {
    patch.conditionStatus = "oxidized";
    patch.lastOxidizedAt = eventTime;
    patch.oxidationCount = FieldValue.increment(1);
  }

  if (conditionEventType === "humidity-exposure") {
    patch.conditionStatus = "humidity-exposed";
    patch.lastHumidityExposureAt = eventTime;
    patch.humidityExposureCount = FieldValue.increment(1);
  }

  if (conditionEventType === "temperature-exposure") {
    patch.conditionStatus = "temperature-exposed";
    patch.lastTemperatureExposureAt = eventTime;
    patch.temperatureExposureCount = FieldValue.increment(1);
  }

  if (conditionEventType === "photo-added") {
    patch.lastConditionPhotoAt = eventTime;
    patch.photoHistoryCount = FieldValue.increment(1);
  }

  if (conditionEventType === "condition-inspected") {
    patch.lastConditionInspectionAt = eventTime;
    patch.conditionInspectionCount = FieldValue.increment(1);
  }

  return patch;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "SkoMiDora IoT Telemetry",
    route: "/api/iot/telemetry",
    supports: {
      iotDeviceEvents: true,
      smartShoeboxes: true,
      smartShelves: true,
      publicWardrobeItems: true,
      conditionLedger: true,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const configuredSecret = process.env.SKOMIDORA_IOT_DEVICE_SECRET;

    if (!configuredSecret) {
      return NextResponse.json(
        { ok: false, error: "SKOMIDORA_IOT_DEVICE_SECRET is not configured." },
        { status: 503 }
      );
    }

    const headerDeviceId = cleanId(req.headers.get("x-skomidora-device-id"));
    const headerSecret = req.headers.get("x-skomidora-device-secret");

    if (!headerDeviceId || !headerSecret || headerSecret !== configuredSecret) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized device telemetry request." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const boxId = cleanId(body.boxId || body.deviceId || headerDeviceId);
    const deviceId = cleanId(body.deviceId || boxId);
    const eventType = cleanText(body.eventType) || "heartbeat";

    if (!boxId || !deviceId) {
      return NextResponse.json(
        { ok: false, error: "Missing boxId/deviceId." },
        { status: 400 }
      );
    }

    if (!VALID_EVENTS.has(eventType)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid eventType: ${eventType}`,
          validEventTypes: Array.from(VALID_EVENTS),
        },
        { status: 400 }
      );
    }

    const itemId = cleanId(body.itemId);
    const shelfId = cleanId(body.shelfId);
    const slotId = cleanId(body.slotId);

    const batteryLevel = cleanNumber(body.batteryLevel);
    const temperatureC = cleanNumber(body.temperatureC);
    const humidityPct = cleanNumber(body.humidityPct);
    const exposureMinutes = cleanNumber(body.exposureMinutes);

    const currentPhysicalStatus = physicalStatus(eventType, cleanText(body.status));

    const explicitConditionEventType = cleanText(body.conditionEventType);
    const autoConditionEventType = autoConditionEventFromSensors(eventType, humidityPct, temperatureC);
    const conditionEventType = explicitConditionEventType || autoConditionEventType;

    if (conditionEventType && !VALID_CONDITION_EVENTS.has(conditionEventType)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid conditionEventType: ${conditionEventType}`,
          validConditionEventTypes: Array.from(VALID_CONDITION_EVENTS),
        },
        { status: 400 }
      );
    }

    const severity = severityFromSensors(
      conditionEventType,
      humidityPct,
      temperatureC,
      cleanText(body.severity)
    );

    const photoUrls = cleanStringArray(body.photoUrls || body.photos || body.conditionPhotoUrls, 12);

    const telemetry = {
      userId: cleanText(body.userId),
      deviceId,
      boxId,
      deviceType: cleanText(body.deviceType) || "smart-shoebox",
      eventType,

      itemId,
      physicalLocationType: cleanText(body.physicalLocationType) || "standard-closet-shelf",
      locationName: cleanText(body.locationName) || "Closet",
      closetZone: cleanText(body.closetZone),
      closetShelfLabel: cleanText(body.closetShelfLabel),

      shelfId,
      slotId,
      status: currentPhysicalStatus,

      rfidTag: cleanText(body.rfidTag),
      nfcTag: cleanText(body.nfcTag),

      batteryLevel,
      chargingStatus: cleanText(body.chargingStatus),
      temperatureC,
      humidityPct,
      signalStrength: cleanNumber(body.signalStrength),

      conditionEventType,
      conditionBefore: cleanText(body.conditionBefore),
      conditionAfter: cleanText(body.conditionAfter),
      conditionGrade: cleanText(body.conditionGrade),
      severity,
      exposureMinutes,
      notes: cleanText(body.notes),
      photoUrls,

      firmwareVersion: cleanText(body.firmwareVersion),
      source: cleanText(body.source) || "SkoMiDora Smart Box",
      confidence: cleanNumber(body.confidence) ?? 0.95,

      createdAt: FieldValue.serverTimestamp(),
    };

    const db = getFirestore();

    const eventRef = db.collection("iotDeviceEvents").doc();
    const boxRef = db.collection("smartShoeboxes").doc(boxId);
    const shelfRef = shelfId ? db.collection("smartShelves").doc(shelfId) : null;
    const ledgerRef =
      conditionEventType && itemId ? db.collection("conditionLedger").doc() : null;
    const conditionLedgerId = ledgerRef ? ledgerRef.id : null;
    const wardrobeRef = itemId ? db.collection("publicWardrobeItems").doc(itemId) : null;

    await db.runTransaction(async (tx) => {
      // Reads must happen before writes in a Firestore transaction. We read the
      // existing wardrobe doc so worstHumidityPct/maxTemperatureC can track true
      // historical maximums instead of being overwritten by the latest reading.
      let existingWorstHumidityPct: number | null = null;
      let existingMaxTemperatureC: number | null = null;

      if (wardrobeRef) {
        const wardrobeSnap = await tx.get(wardrobeRef);
        if (wardrobeSnap.exists) {
          const existing = wardrobeSnap.data() || {};
          existingWorstHumidityPct = cleanNumber(existing.worstHumidityPct);
          existingMaxTemperatureC = cleanNumber(existing.maxTemperatureC);
        }
      }

      tx.set(eventRef, telemetry);

      tx.set(
        boxRef,
        {
          deviceId,
          boxId,
          deviceType: telemetry.deviceType,
          itemId,
          registered: true,
          status: "online",
          currentPhysicalStatus,
          physicalLocationType: telemetry.physicalLocationType,
          locationName: telemetry.locationName,
          closetZone: telemetry.closetZone,
          closetShelfLabel: telemetry.closetShelfLabel,
          shelfId,
          slotId,
          rfidTag: telemetry.rfidTag,
          nfcTag: telemetry.nfcTag,
          batteryLevel: telemetry.batteryLevel,
          chargingStatus: telemetry.chargingStatus,
          temperatureC: telemetry.temperatureC,
          humidityPct: telemetry.humidityPct,
          signalStrength: telemetry.signalStrength,
          firmwareVersion: telemetry.firmwareVersion,
          lastEventType: eventType,
          lastConditionEventType: conditionEventType || null,
          lastEventId: eventRef.id,
          lastHeartbeatAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      if (shelfRef) {
        const safeSlotId = slotId || "unknown-slot";

        tx.set(
          shelfRef,
          {
            shelfId,
            status: "online",
            locationName: telemetry.locationName,
            physicalLocationType: "skomidora-networked-shelf",
            temperatureC: telemetry.temperatureC,
            humidityPct: telemetry.humidityPct,
            lastEventId: eventRef.id,
            updatedAt: FieldValue.serverTimestamp(),
            [`slots.${safeSlotId}`]: {
              boxId,
              itemId,
              status: currentPhysicalStatus,
              lastDetectedAt: FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
      }

      if (ledgerRef) {
        tx.set(ledgerRef, {
          userId: telemetry.userId,
          itemId,
          boxId,
          deviceId,
          iotDeviceEventId: eventRef.id,

          eventType: conditionEventType,
          conditionBefore: telemetry.conditionBefore,
          conditionAfter: telemetry.conditionAfter,
          conditionGrade: telemetry.conditionGrade,
          severity,
          confidence: telemetry.confidence,
          notes: telemetry.notes,
          source: telemetry.source,

          photos: photoUrls.map((url, index) => ({
            imageUrl: url,
            angle: index === 0 ? "primary" : `photo-${index + 1}`,
            source: telemetry.source,
          })),

          sensorSnapshot: {
            temperatureC,
            humidityPct,
            batteryLevel,
            exposureMinutes,
            signalStrength: telemetry.signalStrength,
          },

          serviceProvider: cleanText(body.serviceProvider),
          repairCost: cleanNumber(body.repairCost),
          currency: cleanText(body.currency),

          createdAt: FieldValue.serverTimestamp(),
        });
      }

      if (wardrobeRef) {
        const wardrobeUpdate: Record<string, unknown> = {
          currentBoxId: boxId,
          currentPhysicalStatus,
          physicalLocationType: telemetry.physicalLocationType,
          locationName: telemetry.locationName,
          closetZone: telemetry.closetZone,
          closetShelfLabel: telemetry.closetShelfLabel,
          shelfId,
          slotId,
          boxBatteryLevel: telemetry.batteryLevel,
          boxTemperatureC: telemetry.temperatureC,
          boxHumidityPct: telemetry.humidityPct,
          lastSeenAt: FieldValue.serverTimestamp(),
          physicalMetadataSource: telemetry.source,
          updatedAt: FieldValue.serverTimestamp(),
        };

        if (eventType === "box-removed") {
          wardrobeUpdate.lastRemovedAt = FieldValue.serverTimestamp();
        }

        if (eventType === "box-returned") {
          wardrobeUpdate.lastReturnedAt = FieldValue.serverTimestamp();
        }

        if (humidityPct !== null) {
          wardrobeUpdate.lastHumidityPct = humidityPct;
          wardrobeUpdate.worstHumidityPct =
            existingWorstHumidityPct !== null
              ? Math.max(existingWorstHumidityPct, humidityPct)
              : humidityPct;
        }

        if (temperatureC !== null) {
          wardrobeUpdate.lastTemperatureC = temperatureC;
          wardrobeUpdate.maxTemperatureC =
            existingMaxTemperatureC !== null
              ? Math.max(existingMaxTemperatureC, temperatureC)
              : temperatureC;
        }

        if (conditionEventType) {
          Object.assign(
            wardrobeUpdate,
            conditionSummaryPatch(conditionEventType, FieldValue.serverTimestamp())
          );

          wardrobeUpdate.conditionLedgerLatestEventId = conditionLedgerId;
          wardrobeUpdate.lastConditionEventType = conditionEventType;
          wardrobeUpdate.lastConditionSeverity = severity;

          if (telemetry.conditionGrade) {
            wardrobeUpdate.conditionGrade = telemetry.conditionGrade;
          }

          const conditionTags = [
            conditionEventType,
            severity ? `${severity}-severity` : null,
            humidityPct !== null && humidityPct >= 70 ? "humidity-monitored" : null,
            temperatureC !== null && temperatureC >= 32 ? "temperature-monitored" : null,
          ].filter(Boolean);

          wardrobeUpdate.conditionTags = FieldValue.arrayUnion(...conditionTags);
        }

        tx.set(wardrobeRef, wardrobeUpdate, { merge: true });
      }
    });

    return NextResponse.json({
      ok: true,
      eventId: eventRef.id,
      conditionLedgerId,
      boxId,
      deviceId,
      itemId,
      eventType,
      conditionEventType,
      collectionsUpdated: {
        iotDeviceEvents: true,
        smartShoeboxes: true,
        smartShelves: Boolean(shelfId),
        publicWardrobeItems: Boolean(itemId),
        conditionLedger: Boolean(conditionLedgerId),
      },
    });
  } catch (error: any) {
    console.error("SkoMiDora IoT telemetry error:", error);

    return NextResponse.json(
      { ok: false, error: error?.message || "Telemetry write failed." },
      { status: 500 }
    );
  }
}
