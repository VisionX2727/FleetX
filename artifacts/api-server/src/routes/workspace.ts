import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, fleetInvoices, fleetMembers, fleetWorkspaces } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

type AnyRecord = Record<string, any>;
type MemberProfile = {
  name: string;
  phone: string;
  address?: string;
  vehicleIds: string[];
  documents: Array<{ id: string; name: string; type: string; dataUrl: string; uploadedAt: string }>;
  status?: "Active" | "Suspended";
};

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function profile(value: unknown): MemberProfile {
  const input = (value && typeof value === "object" ? value : {}) as Partial<MemberProfile>;
  return {
    name: String(input.name || ""),
    phone: String(input.phone || ""),
    address: input.address ? String(input.address) : "",
    vehicleIds: Array.isArray(input.vehicleIds) ? input.vehicleIds.map(String) : [],
    documents: Array.isArray(input.documents) ? input.documents as MemberProfile["documents"] : [],
    status: input.status === "Suspended" ? "Suspended" : "Active",
  };
}

function normalizeState(value: unknown): AnyRecord {
  return value && typeof value === "object" ? value as AnyRecord : {};
}

function driverState(stateValue: unknown, member: typeof fleetMembers.$inferSelect) {
  const state = normalizeState(stateValue);
  const memberProfile = profile(member.profile);
  const vehicles = Array.isArray(state.vehicles)
    ? state.vehicles.filter((vehicle: AnyRecord) => memberProfile.vehicleIds.includes(String(vehicle.id)))
    : [];
  const allowedVehicleIds = new Set(vehicles.map((vehicle: AnyRecord) => String(vehicle.id)));
  const ownLogs = Array.isArray(state.logs)
    ? state.logs.filter((log: AnyRecord) => String(log.driverId) === member.id && allowedVehicleIds.has(String(log.vehicleId)))
    : [];
  const ownFuel = Array.isArray(state.fuelRecords)
    ? state.fuelRecords.filter((record: AnyRecord) => String(record.driverId) === member.id && allowedVehicleIds.has(String(record.vehicleId)))
    : [];
  const ownPays = Array.isArray(state.driverPays)
    ? state.driverPays.filter((pay: AnyRecord) => String(pay.driverId) === member.id)
    : [];
  const ownMaintenance = Array.isArray(state.maintenanceRequests)
    ? state.maintenanceRequests.filter((request: AnyRecord) => String(request.driverId) === member.id)
    : [];
  const ownNotes = Array.isArray(state.notes)
    ? state.notes.filter((note: AnyRecord) => String(note.driverId) === member.id)
    : [];
  const driver = Array.isArray(state.drivers)
    ? state.drivers.find((item: AnyRecord) => String(item.id) === member.id)
    : undefined;
  return {
    ...state,
    vehicles,
    logs: ownLogs,
    fuelRecords: ownFuel,
    driverPays: ownPays,
    maintenanceRequests: ownMaintenance,
    notes: ownNotes,
    drivers: driver ? [driver] : [],
    customers: [],
    ledgers: [],
    fleetDays: [],
  };
}

function mergeDriverState(ownerStateValue: unknown, incomingValue: unknown, member: typeof fleetMembers.$inferSelect) {
  const ownerState = normalizeState(ownerStateValue);
  const incoming = normalizeState(incomingValue);
  const memberProfile = profile(member.profile);
  const allowedVehicleIds = new Set(memberProfile.vehicleIds);
  const incomingLogs = Array.isArray(incoming.logs)
    ? incoming.logs.filter((log: AnyRecord) => String(log.driverId) === member.id && allowedVehicleIds.has(String(log.vehicleId)))
    : [];
  const existingLogs = Array.isArray(ownerState.logs)
    ? ownerState.logs.filter((log: AnyRecord) => String(log.driverId) !== member.id)
    : [];
  const incomingFuel = Array.isArray(incoming.fuelRecords)
    ? incoming.fuelRecords.filter((record: AnyRecord) => String(record.driverId) === member.id && allowedVehicleIds.has(String(record.vehicleId)))
    : [];
  const existingFuel = Array.isArray(ownerState.fuelRecords)
    ? ownerState.fuelRecords.filter((record: AnyRecord) => String(record.driverId) !== member.id)
    : [];
  const incomingNotes = Array.isArray(incoming.notes)
    ? incoming.notes.filter((note: AnyRecord) => String(note.driverId) === member.id)
    : [];
  const existingNotes = Array.isArray(ownerState.notes)
    ? ownerState.notes.filter((note: AnyRecord) => String(note.driverId) !== member.id)
    : [];
  const incomingMaintenance = Array.isArray(incoming.maintenanceRequests)
    ? incoming.maintenanceRequests.filter((request: AnyRecord) => String(request.driverId) === member.id)
    : [];
  const existingMaintenance = Array.isArray(ownerState.maintenanceRequests)
    ? ownerState.maintenanceRequests.filter((request: AnyRecord) => String(request.driverId) !== member.id)
    : [];
  return {
    ...ownerState,
    logs: [...existingLogs, ...incomingLogs],
    fuelRecords: [...existingFuel, ...incomingFuel],
    notes: [...existingNotes, ...incomingNotes],
    maintenanceRequests: [...existingMaintenance, ...incomingMaintenance],
  };
}

async function ownerWorkspace(ownerUserId: string) {
  return db.select().from(fleetWorkspaces).where(eq(fleetWorkspaces.ownerUserId, ownerUserId)).limit(1).then((rows) => rows[0]);
}

async function memberForDriver(driverUserId: string) {
  return db.select().from(fleetMembers).where(eq(fleetMembers.driverUserId, driverUserId)).limit(1).then((rows) => rows[0]);
}

router.get("/", async (req, res) => {
  const userId = req.authUserId!;
  const owner = await ownerWorkspace(userId);
  if (owner) {
    const members = await db.select().from(fleetMembers).where(eq(fleetMembers.ownerUserId, userId));
    const invoices = await db.select().from(fleetInvoices).where(eq(fleetInvoices.ownerUserId, userId));
    res.json({ role: "owner", ownerUserId: userId, state: owner.state, inviteCode: owner.inviteCode, members, invoices });
    return;
  }
  const member = await memberForDriver(userId);
  if (!member) {
    res.json({ role: null });
    return;
  }
  const workspace = await ownerWorkspace(member.ownerUserId);
  if (!workspace) {
    res.status(409).json({ error: "Owner workspace is unavailable" });
    return;
  }
  const invoices = await db.select().from(fleetInvoices).where(and(eq(fleetInvoices.driverUserId, userId), eq(fleetInvoices.ownerUserId, member.ownerUserId)));
  const ownerState = normalizeState(workspace.state);
  res.json({ role: "driver", ownerUserId: member.ownerUserId, member, ownerSettings: ownerState.settings || {}, availableVehicles: Array.isArray(ownerState.vehicles) ? ownerState.vehicles : [], state: driverState(workspace.state, member), invoices });
});

router.post("/owner", async (req, res) => {
  const userId = req.authUserId!;
  const linkedMember = await memberForDriver(userId);
  if (linkedMember) {
    res.status(403).json({ error: "A driver account cannot create an owner workspace" });
    return;
  }
  const current = await ownerWorkspace(userId);
  const state = normalizeState(req.body?.state);
  const inviteCode = current?.inviteCode || Math.random().toString(36).slice(2, 8).toUpperCase();
  if (current) {
    const updated = await db.update(fleetWorkspaces).set({ state, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, userId)).returning();
    res.json({ role: "owner", ownerUserId: userId, state: updated[0]?.state || state, inviteCode });
    return;
  }
  const created = await db.insert(fleetWorkspaces).values({ ownerUserId: userId, inviteCode, state }).returning();
  res.json({ role: "owner", ownerUserId: userId, state: created[0].state, inviteCode });
});

router.put("/owner/state", async (req, res) => {
  const userId = req.authUserId!;
  const current = await ownerWorkspace(userId);
  if (!current) {
    res.status(404).json({ error: "Owner workspace not found" });
    return;
  }
  const updated = await db.update(fleetWorkspaces).set({ state: normalizeState(req.body?.state), updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, userId)).returning();
  res.json({ state: updated[0].state });
});

router.post("/join", async (req, res) => {
  const userId = req.authUserId!;
  const code = String(req.body?.code || "").trim().toUpperCase();
  const owner = await db.select().from(fleetWorkspaces).where(eq(fleetWorkspaces.inviteCode, code)).limit(1).then((rows) => rows[0]);
  if (!owner) {
    res.status(404).json({ error: "That owner code is not valid" });
    return;
  }
  const existing = await memberForDriver(userId);
  if (existing && existing.ownerUserId !== owner.ownerUserId) {
    res.status(409).json({ error: "This driver account is already linked to another owner" });
    return;
  }
  const memberProfile = profile(req.body?.profile);
  const member = existing
    ? (await db.update(fleetMembers).set({ ownerUserId: owner.ownerUserId, profile: memberProfile, updatedAt: new Date() }).where(eq(fleetMembers.driverUserId, userId)).returning())[0]
    : (await db.insert(fleetMembers).values({ id: id("driver"), ownerUserId: owner.ownerUserId, driverUserId: userId, profile: memberProfile }).returning())[0];
  const state = normalizeState(owner.state);
  const drivers = Array.isArray(state.drivers) ? [...state.drivers] : [];
  const driver = { id: member.id, name: memberProfile.name, phone: memberProfile.phone, type: "Regular", dailyRate: 0, vehicleIds: memberProfile.vehicleIds };
  const nextState: AnyRecord = { ...state, drivers: [...drivers.filter((item: AnyRecord) => String(item.id) !== member.id), driver] };
  await db.update(fleetWorkspaces).set({ state: nextState, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, owner.ownerUserId));
  res.json({ role: "driver", ownerUserId: owner.ownerUserId, member, ownerSettings: nextState.settings || {}, availableVehicles: Array.isArray(nextState.vehicles) ? nextState.vehicles : [], state: driverState(nextState, member), invoices: [] });
});

router.put("/driver/profile", async (req, res) => {
  const userId = req.authUserId!;
  const member = await memberForDriver(userId);
  if (!member) {
    res.status(404).json({ error: "Driver membership not found" });
    return;
  }
  const nextProfile = profile(req.body?.profile);
  const updated = (await db.update(fleetMembers).set({ profile: nextProfile, updatedAt: new Date() }).where(eq(fleetMembers.driverUserId, userId)).returning())[0];
  const workspace = await ownerWorkspace(member.ownerUserId);
  if (workspace) {
    const state = normalizeState(workspace.state);
    const drivers = Array.isArray(state.drivers) ? state.drivers : [];
    const nextState = {
      ...state,
      drivers: drivers.map((driver: AnyRecord) => String(driver.id) === member.id ? { ...driver, name: nextProfile.name, phone: nextProfile.phone, vehicleIds: nextProfile.vehicleIds } : driver),
    };
    await db.update(fleetWorkspaces).set({ state: nextState, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, member.ownerUserId));
  }
  res.json({ member: updated });
});

router.put("/driver/state", async (req, res) => {
  const userId = req.authUserId!;
  const member = await memberForDriver(userId);
  if (!member) {
    res.status(404).json({ error: "Driver membership not found" });
    return;
  }
  const workspace = await ownerWorkspace(member.ownerUserId);
  if (!workspace) {
    res.status(404).json({ error: "Owner workspace not found" });
    return;
  }
  const nextState = mergeDriverState(workspace.state, req.body?.state, member);
  const updated = await db.update(fleetWorkspaces).set({ state: nextState, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, member.ownerUserId)).returning();
  res.json({ state: driverState(updated[0].state, member) });
});

router.post("/invoices", async (req, res) => {
  const userId = req.authUserId!;
  const owner = await ownerWorkspace(userId);
  if (!owner) {
    res.status(403).json({ error: "Only the owner can send invoices" });
    return;
  }
  const driverUserId = String(req.body?.driverUserId || "");
  const member = await db.select().from(fleetMembers).where(and(eq(fleetMembers.ownerUserId, userId), eq(fleetMembers.driverUserId, driverUserId))).limit(1).then((rows) => rows[0]);
  if (!member) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  const created = await db.insert(fleetInvoices).values({ id: id("invoice"), ownerUserId: userId, driverUserId: member.driverUserId, title: String(req.body?.title || "FleetX receipt"), html: String(req.body?.html || "") }).returning();
  res.json({ invoice: created[0] });
});

router.get("/invoices", async (req, res) => {
  const userId = req.authUserId!;
  const owner = await ownerWorkspace(userId);
  const rows = owner
    ? await db.select().from(fleetInvoices).where(eq(fleetInvoices.ownerUserId, userId))
    : await db.select().from(fleetInvoices).where(eq(fleetInvoices.driverUserId, userId));
  res.json({ invoices: rows });
});

router.post("/invoices/:invoiceId/revoke", async (req, res) => {
  const userId = req.authUserId!;
  const updated = await db.update(fleetInvoices).set({ revokedAt: new Date() }).where(and(eq(fleetInvoices.id, req.params.invoiceId), eq(fleetInvoices.ownerUserId, userId))).returning();
  if (!updated[0]) {
    res.status(404).json({ error: "Invoice not found" });
    return;
  }
  res.json({ invoice: updated[0] });
});

export default router;