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

function physicalStatus(eventType: string, fallback: string | null) {
  if (eventType === "box-removed") return "removed";
  if (eventType === "box-returned") return "stored";
  if (eventType === "box-opened") return "opened";
  if (eventType === "box-closed") return "stored";
  if (eventType === "box-detected") return "stored";
  return fallback || "online";
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "SkoMiDora IoT Telemetry",
    route: "/api/iot/telemetry",
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
    const currentPhysicalStatus = physicalStatus(eventType, cleanText(body.status));

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

      batteryLevel: cleanNumber(body.batteryLevel),
      chargingStatus: cleanText(body.chargingStatus),
      temperatureC: cleanNumber(body.temperatureC),
      humidityPct: cleanNumber(body.humidityPct),
      signalStrength: cleanNumber(body.signalStrength),

      firmwareVersion: cleanText(body.firmwareVersion),
      source: cleanText(body.source) || "SkoMiDora Smart Box",
      confidence: cleanNumber(body.confidence) ?? 0.95,

      createdAt: FieldValue.serverTimestamp(),
    };

    const db = getFirestore();
    const batch = db.batch();

    const eventRef = db.collection("iotDeviceEvents").doc();
    batch.set(eventRef, telemetry);

    const boxRef = db.collection("smartShoeboxes").doc(boxId);
    batch.set(
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
        lastEventId: eventRef.id,
        lastHeartbeatAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    if (shelfId) {
      const shelfRef = db.collection("smartShelves").doc(shelfId);
      const safeSlotId = slotId || "unknown-slot";

      batch.set(
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

    if (itemId) {
      const wardrobeRef = db.collection("publicWardrobeItems").doc(itemId);

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

      batch.set(wardrobeRef, wardrobeUpdate, { merge: true });
    }

    await batch.commit();

    return NextResponse.json({
      ok: true,
      eventId: eventRef.id,
      boxId,
      deviceId,
      itemId,
      eventType,
      collectionsUpdated: {
        iotDeviceEvents: true,
        smartShoeboxes: true,
        smartShelves: Boolean(shelfId),
        publicWardrobeItems: Boolean(itemId),
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
