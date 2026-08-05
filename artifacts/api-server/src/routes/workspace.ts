import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, fleetInvoices, fleetMembers, fleetWorkspaces } from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();
router.use(requireAuth);

type AnyRecord = Record<string, any>;
type StoredFile = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  uploadedAt: string;
  storagePath?: string;
};
type MemberProfile = {
  name: string;
  phone: string;
  address?: string;
  vehicleIds: string[];
  documents: StoredFile[];
  sharedFiles: StoredFile[];
  status?: "Active" | "Blocked" | "Removed" | "Suspended";
};

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

const storageBucket = "Fleet Manager";
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

function storageHeaders(contentType?: string) {
  return {
    apikey: supabaseServiceRoleKey,
    Authorization: `Bearer ${supabaseServiceRoleKey}`,
    ...(contentType ? { "Content-Type": contentType } : {}),
  };
}

function storagePathUrl(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function decodeDataUrl(value: string, fallbackType: string) {
  const match = value.match(/^data:([^;,]+)?;base64,(.+)$/);
  if (!match) return null;
  return {
    type: match[1] || fallbackType || "application/octet-stream",
    data: Buffer.from(match[2], "base64"),
  };
}

function normalizedFile(value: unknown): StoredFile {
  const input = (value && typeof value === "object" ? value : {}) as Partial<StoredFile>;
  return {
    id: String(input.id || id("file")),
    name: String(input.name || "file"),
    type: String(input.type || "application/octet-stream"),
    dataUrl: String(input.dataUrl || ""),
    uploadedAt: String(input.uploadedAt || new Date().toISOString().slice(0, 10)),
    ...(input.storagePath ? { storagePath: String(input.storagePath) } : {}),
  };
}

async function uploadFile(file: StoredFile, ownerUserId: string, memberId: string, category: "documents" | "shared") {
  const decoded = decodeDataUrl(file.dataUrl, file.type);
  if (file.storagePath) return { ...file, dataUrl: "" };
  if (!decoded) return file;
  if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error("Supabase Storage is not configured");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100) || "file";
  const storagePath = `fleetx/${ownerUserId}/drivers/${memberId}/${category}/${file.id}-${safeName}`;
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(storageBucket)}/${storagePathUrl(storagePath)}`,
    {
      method: "POST",
      headers: { ...storageHeaders(decoded.type), "x-upsert": "false" },
      body: decoded.data,
    },
  );
  if (!response.ok) throw new Error(`Supabase Storage upload failed (${response.status})`);
  return { ...file, type: decoded.type, dataUrl: "", storagePath };
}

async function persistProfileFiles(value: unknown, ownerUserId: string, memberId: string) {
  const next = profile(value);
  const [documents, sharedFiles] = await Promise.all([
    Promise.all(next.documents.map((file) => uploadFile(file, ownerUserId, memberId, "documents"))),
    Promise.all(next.sharedFiles.map((file) => uploadFile(file, ownerUserId, memberId, "shared"))),
  ]);
  return { ...next, documents, sharedFiles };
}

async function signedStorageUrl(storagePath?: string) {
  if (!storagePath || !supabaseUrl || !supabaseServiceRoleKey) return "";
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/sign/${encodeURIComponent(storageBucket)}/${storagePathUrl(storagePath)}`,
    {
      method: "POST",
      headers: { ...storageHeaders("application/json"), "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 3600 }),
    },
  );
  if (!response.ok) return "";
  const payload = await response.json() as { signedURL?: string };
  if (!payload.signedURL) return "";
  return payload.signedURL.startsWith("http")
    ? payload.signedURL
    : `${supabaseUrl.replace(/\/$/, "")}${payload.signedURL.startsWith("/") ? "" : "/"}${payload.signedURL}`;
}

async function hydratedFile(file: StoredFile): Promise<StoredFile> {
  if (!file.storagePath || file.dataUrl) return file;
  return { ...file, dataUrl: await signedStorageUrl(file.storagePath) };
}

async function uploadLogo(settingsValue: unknown, ownerUserId: string) {
  const settings = settingsValue && typeof settingsValue === "object" ? { ...(settingsValue as AnyRecord) } : {};
  const logoUrl = typeof settings.logoUrl === "string" ? settings.logoUrl : "";
  const existingPath = typeof settings.logoStoragePath === "string" ? settings.logoStoragePath : "";
  const decoded = decodeDataUrl(logoUrl, "image/jpeg");
  if (!decoded || existingPath) {
    return { ...settings, ...(existingPath ? { logoUrl: "", logoStoragePath: existingPath } : {}) };
  }
  if (!supabaseUrl || !supabaseServiceRoleKey) throw new Error("Supabase Storage is not configured");
  const storagePath = `fleetx/${ownerUserId}/branding/business-logo-${crypto.randomUUID()}`;
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(storageBucket)}/${storagePathUrl(storagePath)}`,
    {
      method: "POST",
      headers: { ...storageHeaders(decoded.type), "x-upsert": "false" },
      body: decoded.data,
    },
  );
  if (!response.ok) throw new Error(`Supabase Storage logo upload failed (${response.status})`);
  return { ...settings, logoUrl: "", logoStoragePath: storagePath };
}

async function hydratedSettings(settingsValue: unknown) {
  const settings = settingsValue && typeof settingsValue === "object" ? { ...(settingsValue as AnyRecord) } : {};
  const storagePath = typeof settings.logoStoragePath === "string" ? settings.logoStoragePath : "";
  if (!storagePath) return settings;
  return { ...settings, logoUrl: await signedStorageUrl(storagePath) };
}

async function hydratedState(value: unknown) {
  const state = normalizeState(value);
  return { ...state, settings: await hydratedSettings(state.settings) };
}

async function hydratedProfile(value: unknown) {
  const next = profile(value);
  const [documents, sharedFiles] = await Promise.all([
    Promise.all(next.documents.map(hydratedFile)),
    Promise.all(next.sharedFiles.map(hydratedFile)),
  ]);
  return { ...next, documents, sharedFiles };
}

async function memberResponse(member: typeof fleetMembers.$inferSelect) {
  return { id: member.id, driverUserId: member.driverUserId, profile: await hydratedProfile(member.profile) };
}

function profile(value: unknown): MemberProfile {
  const input = (value && typeof value === "object" ? value : {}) as Partial<MemberProfile>;
  return {
    name: String(input.name || ""),
    phone: String(input.phone || ""),
    address: input.address ? String(input.address) : "",
    vehicleIds: Array.isArray(input.vehicleIds) ? input.vehicleIds.map(String) : [],
    documents: Array.isArray(input.documents) ? input.documents as MemberProfile["documents"] : [],
    sharedFiles: Array.isArray(input.sharedFiles) ? input.sharedFiles as MemberProfile["sharedFiles"] : [],
    status: input.status === "Blocked" || input.status === "Removed" || input.status === "Suspended" ? input.status : "Active",
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
  const driverAbsentDates = Array.isArray(state.logs)
    ? [...new Set(state.logs
      .filter((log: AnyRecord) => memberProfile.vehicleIds.includes(String(log.vehicleId)) && String(log.driverId) !== member.id)
      .map((log: AnyRecord) => String(log.date)))]
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
    driverAbsentDates,
  };
}

function mergeDriverState(ownerStateValue: unknown, incomingValue: unknown, member: typeof fleetMembers.$inferSelect) {
  const ownerState = normalizeState(ownerStateValue);
  const incoming = normalizeState(incomingValue);
  const memberProfile = profile(member.profile);
  const allowedVehicleIds = new Set(memberProfile.vehicleIds);
  const deletedLogIds = new Set([
    ...(Array.isArray(ownerState.deletedLogIds) ? ownerState.deletedLogIds.map(String) : []),
    ...(Array.isArray(incoming.deletedLogIds) ? incoming.deletedLogIds.map(String) : []),
  ]);
  const deletedFuelIds = new Set([
    ...(Array.isArray(ownerState.deletedFuelIds) ? ownerState.deletedFuelIds.map(String) : []),
    ...(Array.isArray(incoming.deletedFuelIds) ? incoming.deletedFuelIds.map(String) : []),
  ]);
  const incomingLogs = Array.isArray(incoming.logs)
    ? incoming.logs.filter((log: AnyRecord) => String(log.driverId) === member.id && allowedVehicleIds.has(String(log.vehicleId)) && !deletedLogIds.has(String(log.id)))
    : [];
  const existingLogs = Array.isArray(ownerState.logs)
    ? ownerState.logs.filter((log: AnyRecord) => String(log.driverId) !== member.id && !deletedLogIds.has(String(log.id)))
    : [];
  const existingOwnLogs = Array.isArray(ownerState.logs)
    ? ownerState.logs.filter((log: AnyRecord) => String(log.driverId) === member.id && !deletedLogIds.has(String(log.id)))
    : [];
  const incomingLogIds = new Set(incomingLogs.map((log: AnyRecord) => String(log.id)));
  const mergedOwnLogs = [
    ...existingOwnLogs.filter((log: AnyRecord) => !incomingLogIds.has(String(log.id))),
    ...incomingLogs,
  ];
  const incomingFuel = Array.isArray(incoming.fuelRecords)
    ? incoming.fuelRecords.filter((record: AnyRecord) => String(record.driverId) === member.id && allowedVehicleIds.has(String(record.vehicleId)) && !deletedFuelIds.has(String(record.id)))
    : [];
  const existingFuel = Array.isArray(ownerState.fuelRecords)
    ? ownerState.fuelRecords.filter((record: AnyRecord) => String(record.driverId) !== member.id && !deletedFuelIds.has(String(record.id)))
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
  const incomingDriverPays = Array.isArray(incoming.driverPays)
    ? incoming.driverPays.filter((pay: AnyRecord) => String(pay.driverId) === member.id)
    : [];
  const existingDriverPays = Array.isArray(ownerState.driverPays)
    ? ownerState.driverPays.filter((pay: AnyRecord) => String(pay.driverId) !== member.id)
    : [];
  return {
    ...ownerState,
    logs: [...existingLogs, ...mergedOwnLogs],
    fuelRecords: [...existingFuel, ...incomingFuel],
    notes: [...existingNotes, ...incomingNotes],
    maintenanceRequests: [...existingMaintenance, ...incomingMaintenance],
    driverPays: [...existingDriverPays, ...incomingDriverPays],
    deletedLogIds: [...deletedLogIds],
    deletedFuelIds: [...deletedFuelIds],
  };
}

function withoutDriverRecords(stateValue: unknown, memberId: string) {
  const state = normalizeState(stateValue);
  const own = (item: AnyRecord) => String(item.driverId) === memberId;
  return {
    ...state,
    drivers: Array.isArray(state.drivers) ? state.drivers.filter((driver: AnyRecord) => String(driver.id) !== memberId) : [],
    logs: Array.isArray(state.logs) ? state.logs.filter((item: AnyRecord) => !own(item)) : [],
    fuelRecords: Array.isArray(state.fuelRecords) ? state.fuelRecords.filter((item: AnyRecord) => !own(item)) : [],
    driverPays: Array.isArray(state.driverPays) ? state.driverPays.filter((item: AnyRecord) => !own(item)) : [],
    notes: Array.isArray(state.notes) ? state.notes.filter((item: AnyRecord) => !own(item)) : [],
    maintenanceRequests: Array.isArray(state.maintenanceRequests) ? state.maintenanceRequests.filter((item: AnyRecord) => !own(item)) : [],
  };
}

function withDriverStatus(stateValue: unknown, memberId: string, status: MemberProfile["status"]) {
  const state = normalizeState(stateValue);
  return {
    ...state,
    drivers: Array.isArray(state.drivers)
      ? state.drivers.map((driver: AnyRecord) => String(driver.id) === memberId
        ? {
          ...driver,
          status,
          ...(status === "Removed" ? { vehicleId: undefined, vehicleIds: [] } : {}),
        }
        : driver)
      : [],
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
    res.json({ role: "owner", ownerUserId: userId, state: await hydratedState(owner.state), inviteCode: owner.inviteCode, members: await Promise.all(members.map(memberResponse)), invoices });
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
  const memberProfile = profile(member.profile);
  const ownerState = normalizeState(workspace.state);
  const invoices = await db.select().from(fleetInvoices).where(and(eq(fleetInvoices.driverUserId, userId), eq(fleetInvoices.ownerUserId, member.ownerUserId)));
  const hydratedMember = await memberResponse(member);
  if (memberProfile.status === "Blocked") {
    res.json({ role: "blocked", ownerUserId: member.ownerUserId, member: hydratedMember, ownerSettings: await hydratedSettings(ownerState.settings), availableVehicles: [], invoices });
    return;
  }
  if (memberProfile.status === "Removed") {
    res.json({ role: "removed", ownerUserId: member.ownerUserId, member: hydratedMember, ownerSettings: await hydratedSettings(ownerState.settings), availableVehicles: [], invoices });
    return;
  }
  res.json({ role: "driver", ownerUserId: member.ownerUserId, member: hydratedMember, ownerSettings: await hydratedSettings(ownerState.settings), availableVehicles: Array.isArray(ownerState.vehicles) ? ownerState.vehicles : [], state: await hydratedState(driverState(workspace.state, member)), invoices });
});

router.post("/owner", async (req, res) => {
  const userId = req.authUserId!;
  const linkedMember = await memberForDriver(userId);
  if (linkedMember) {
    res.status(403).json({ error: "A driver account cannot create an owner workspace" });
    return;
  }
  const current = await ownerWorkspace(userId);
  const rawState = normalizeState(req.body?.state);
  const state = { ...rawState, settings: await uploadLogo(rawState.settings, userId) };
  const inviteCode = current?.inviteCode || Math.random().toString(36).slice(2, 8).toUpperCase();
  if (current) {
    const updated = await db.update(fleetWorkspaces).set({ state, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, userId)).returning();
    res.json({ role: "owner", ownerUserId: userId, state: await hydratedState(updated[0]?.state || state), inviteCode });
    return;
  }
  const created = await db.insert(fleetWorkspaces).values({ ownerUserId: userId, inviteCode, state }).returning();
  res.json({ role: "owner", ownerUserId: userId, state: await hydratedState(created[0].state), inviteCode });
});

router.put("/owner/state", async (req, res) => {
  const userId = req.authUserId!;
  const rawIncoming = normalizeState(req.body?.state);
  const incoming: AnyRecord = { ...rawIncoming, settings: await uploadLogo(rawIncoming.settings, userId) };
  const updated = await db.transaction(async (tx) => {
    const current = (await tx.select().from(fleetWorkspaces).where(eq(fleetWorkspaces.ownerUserId, userId)).for("update"))[0];
    if (!current) return null;
    const existing = normalizeState(current.state);
    const deletedLogIds = new Set([
      ...(Array.isArray(existing.deletedLogIds) ? existing.deletedLogIds.map(String) : []),
      ...(Array.isArray(incoming.deletedLogIds) ? incoming.deletedLogIds.map(String) : []),
    ]);
    const deletedFuelIds = new Set([
      ...(Array.isArray(existing.deletedFuelIds) ? existing.deletedFuelIds.map(String) : []),
      ...(Array.isArray(incoming.deletedFuelIds) ? incoming.deletedFuelIds.map(String) : []),
    ]);
    const driverOwned = (item: AnyRecord) => item.driverId !== undefined && item.driverId !== null && String(item.driverId) !== "";
    const mergeDriverRecords = (key: string) => {
      const incomingItems = Array.isArray(incoming[key]) ? incoming[key] : [];
      const existingItems = Array.isArray(existing[key]) ? existing[key] : [];
      const incomingById = new Map(incomingItems.map((item: AnyRecord) => [String(item.id), item]));
      const driverItems = existingItems
        .filter(driverOwned)
        .filter((item: AnyRecord) => !deletedLogIds.has(String(item.id)))
        .map((item: AnyRecord) => incomingById.get(String(item.id)) || item);
      const newDriverItems = incomingItems.filter((item: AnyRecord) => driverOwned(item) && !deletedLogIds.has(String(item.id)) && !existingItems.some((existingItem: AnyRecord) => String(existingItem.id) === String(item.id)));
      return [
        ...incomingItems.filter((item: AnyRecord) => !driverOwned(item) && !deletedLogIds.has(String(item.id))),
        ...driverItems,
        ...newDriverItems,
      ];
    };
    const nextState = {
      ...incoming,
      deletedLogIds: [...deletedLogIds],
      deletedFuelIds: [...deletedFuelIds],
      // Driver-owned records are append/merge-only from the owner's full-state
      // snapshot. A stale owner tab must never delete a driver's later log.
      logs: mergeDriverRecords("logs"),
      fuelRecords: mergeDriverRecords("fuelRecords").filter((item: AnyRecord) => !deletedFuelIds.has(String(item.id))),
      notes: mergeDriverRecords("notes"),
      maintenanceRequests: mergeDriverRecords("maintenanceRequests"),
    };
    return (await tx.update(fleetWorkspaces).set({ state: nextState, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, userId)).returning())[0];
  });
  if (!updated) {
    res.status(404).json({ error: "Owner workspace not found" });
    return;
  }
  res.json({ state: await hydratedState(updated.state) });
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
  const memberId = existing?.id || id("driver");
  const memberProfile = await persistProfileFiles(req.body?.profile, owner.ownerUserId, memberId);
  const member = existing
    ? (await db.update(fleetMembers).set({ ownerUserId: owner.ownerUserId, profile: { ...memberProfile, status: "Active" }, updatedAt: new Date() }).where(eq(fleetMembers.driverUserId, userId)).returning())[0]
    : (await db.insert(fleetMembers).values({ id: memberId, ownerUserId: owner.ownerUserId, driverUserId: userId, profile: memberProfile }).returning())[0];
  const state = normalizeState(owner.state);
  const drivers = Array.isArray(state.drivers) ? [...state.drivers] : [];
  const driver = { id: member.id, name: memberProfile.name, phone: memberProfile.phone, type: "Regular", dailyRate: 0, vehicleIds: memberProfile.vehicleIds, status: "Active" };
  const nextState: AnyRecord = { ...state, drivers: [...drivers.filter((item: AnyRecord) => String(item.id) !== member.id), driver] };
  await db.update(fleetWorkspaces).set({ state: nextState, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, owner.ownerUserId));
  res.json({ role: "driver", ownerUserId: owner.ownerUserId, member: await memberResponse(member), ownerSettings: await hydratedSettings(nextState.settings), availableVehicles: Array.isArray(nextState.vehicles) ? nextState.vehicles : [], state: await hydratedState(driverState(nextState, member)), invoices: [] });
});

router.put("/driver/profile", async (req, res) => {
  const userId = req.authUserId!;
  const member = await memberForDriver(userId);
  if (!member) {
    res.status(404).json({ error: "Driver membership not found" });
    return;
  }
  if (profile(member.profile).status !== "Active") {
    res.status(403).json({ error: profile(member.profile).status === "Blocked" ? "Owner blocked your driver access" : "Owner removed your driver access" });
    return;
  }
  const nextProfile = await persistProfileFiles(req.body?.profile, member.ownerUserId, member.id);
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
  res.json({ member: await memberResponse(updated) });
});

router.put("/owner/members/:memberId", async (req, res) => {
  const userId = req.authUserId!;
  const owner = await ownerWorkspace(userId);
  if (!owner) {
    res.status(403).json({ error: "Only the owner can manage drivers" });
    return;
  }
  const member = await db.select().from(fleetMembers).where(and(eq(fleetMembers.id, req.params.memberId), eq(fleetMembers.ownerUserId, userId))).limit(1).then((rows) => rows[0]);
  if (!member) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  const currentProfile = profile(member.profile);
  const nextProfile = await persistProfileFiles({ ...currentProfile, ...profile(req.body?.profile), status: currentProfile.status }, userId, member.id);
  const updated = (await db.update(fleetMembers).set({ profile: nextProfile, updatedAt: new Date() }).where(eq(fleetMembers.id, member.id)).returning())[0];
  const state = normalizeState(owner.state);
  const nextState = {
    ...state,
    drivers: Array.isArray(state.drivers)
      ? state.drivers.map((driver: AnyRecord) => String(driver.id) === member.id ? { ...driver, name: nextProfile.name, phone: nextProfile.phone, vehicleIds: nextProfile.vehicleIds, status: nextProfile.status } : driver)
      : [],
  };
  await db.update(fleetWorkspaces).set({ state: nextState, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, userId));
  res.json({ member: await memberResponse(updated) });
});

router.post("/owner/members/:memberId/files", async (req, res) => {
  const userId = req.authUserId!;
  const owner = await ownerWorkspace(userId);
  if (!owner) {
    res.status(403).json({ error: "Only the owner can send files" });
    return;
  }
  const member = await db.select().from(fleetMembers).where(and(eq(fleetMembers.id, req.params.memberId), eq(fleetMembers.ownerUserId, userId))).limit(1).then((rows) => rows[0]);
  if (!member) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  const input = req.body?.file;
  if (!input?.name || !input?.dataUrl) {
    res.status(400).json({ error: "A file is required" });
    return;
  }
  const file = await uploadFile(normalizedFile({
    id: id("file"),
    name: String(input.name),
    type: String(input.type || "application/octet-stream"),
    dataUrl: String(input.dataUrl),
    uploadedAt: new Date().toISOString().slice(0, 10),
  }), userId, member.id, "shared");
  const nextProfile = {
    ...profile(member.profile),
    sharedFiles: [...profile(member.profile).sharedFiles, file],
  };
  const updated = (await db.update(fleetMembers).set({ profile: nextProfile, updatedAt: new Date() }).where(eq(fleetMembers.id, member.id)).returning())[0];
  res.json({ member: await memberResponse(updated) });
});

router.post("/owner/members/:memberId/status", async (req, res) => {
  const userId = req.authUserId!;
  const owner = await ownerWorkspace(userId);
  if (!owner) {
    res.status(403).json({ error: "Only the owner can manage drivers" });
    return;
  }
  const status = req.body?.status;
  if (!["Active", "Blocked", "Removed"].includes(status)) {
    res.status(400).json({ error: "Invalid driver status" });
    return;
  }
  const member = await db.select().from(fleetMembers).where(and(eq(fleetMembers.id, req.params.memberId), eq(fleetMembers.ownerUserId, userId))).limit(1).then((rows) => rows[0]);
  if (!member) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
   const nextProfile = {
     ...profile(member.profile),
     status,
     ...(status === "Removed" ? { vehicleIds: [] } : {}),
   };
  const updated = (await db.update(fleetMembers).set({ profile: nextProfile, updatedAt: new Date() }).where(eq(fleetMembers.id, member.id)).returning())[0];
  const nextState = withDriverStatus(owner.state, member.id, status);
  await db.update(fleetWorkspaces).set({ state: nextState, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, userId));
  res.json({ member: { id: updated.id, driverUserId: updated.driverUserId, profile: profile(updated.profile) } });
});

router.delete("/owner/members/:memberId", async (req, res) => {
  const userId = req.authUserId!;
  const owner = await ownerWorkspace(userId);
  if (!owner) {
    res.status(403).json({ error: "Only the owner can delete drivers" });
    return;
  }
  const member = await db.select().from(fleetMembers).where(and(eq(fleetMembers.id, req.params.memberId), eq(fleetMembers.ownerUserId, userId))).limit(1).then((rows) => rows[0]);
  if (!member) {
    res.status(404).json({ error: "Driver not found" });
    return;
  }
  await db.delete(fleetMembers).where(eq(fleetMembers.id, member.id));
  await db.delete(fleetInvoices).where(and(eq(fleetInvoices.ownerUserId, userId), eq(fleetInvoices.driverUserId, member.driverUserId)));
  await db.update(fleetWorkspaces).set({ state: withoutDriverRecords(owner.state, member.id), updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, userId));
  res.json({ ok: true });
});

router.put("/driver/state", async (req, res) => {
  const userId = req.authUserId!;
  const member = await memberForDriver(userId);
  if (!member) {
    res.status(404).json({ error: "Driver membership not found" });
    return;
  }
  if (profile(member.profile).status !== "Active") {
    res.status(403).json({ error: profile(member.profile).status === "Blocked" ? "Owner blocked your driver access" : "Owner removed your driver access" });
    return;
  }
  const updated = await db.transaction(async (tx) => {
    const workspace = (await tx.select().from(fleetWorkspaces).where(eq(fleetWorkspaces.ownerUserId, member.ownerUserId)).for("update"))[0];
    if (!workspace) return null;
    const nextState = mergeDriverState(workspace.state, req.body?.state, member);
    return (await tx.update(fleetWorkspaces).set({ state: nextState, updatedAt: new Date() }).where(eq(fleetWorkspaces.ownerUserId, member.ownerUserId)).returning())[0];
  });
  if (!updated) {
    res.status(404).json({ error: "Owner workspace not found" });
    return;
  }
  res.json({ state: driverState(updated.state, member) });
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