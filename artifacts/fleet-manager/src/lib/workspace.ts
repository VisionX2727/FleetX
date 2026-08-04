import type { AppState, Driver } from "@/lib/store";

export type DriverDocument = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  uploadedAt: string;
};

export type DriverMembership = {
  id: string;
  ownerUserId: string;
  driverUserId: string;
  profile: {
    name: string;
    phone: string;
    address?: string;
    vehicleIds: string[];
    documents: DriverDocument[];
    status?: "Active" | "Suspended";
  };
};

export type WorkspaceResponse = {
  role: "owner" | "driver" | null;
  ownerUserId?: string;
  state?: AppState;
  inviteCode?: string;
  member?: DriverMembership;
  ownerSettings?: AppState["settings"];
  availableVehicles?: AppState["vehicles"];
  invoices?: Array<{ id: string; title: string; html: string; revokedAt?: string | null; createdAt: string }>;
  members?: Array<{ id: string; driverUserId: string; profile: DriverMembership["profile"] }>;
};

function workspaceUrl(path = "") {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  return `${base}api/workspace${path}`;
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(workspaceUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || "Workspace request failed");
  return payload as T;
}

export function getWorkspace(token: string) {
  return request<WorkspaceResponse>("", token);
}

export function createOwnerWorkspace(token: string, state: Partial<AppState>) {
  return request<WorkspaceResponse>("/owner", token, { method: "POST", body: JSON.stringify({ state }) });
}

export function saveOwnerWorkspace(token: string, state: AppState) {
  return request<{ state: AppState }>("/owner/state", token, { method: "PUT", body: JSON.stringify({ state }) });
}

export function joinOwnerWorkspace(token: string, code: string, profile: DriverMembership["profile"]) {
  return request<WorkspaceResponse>("/join", token, { method: "POST", body: JSON.stringify({ code, profile }) });
}

export function saveDriverWorkspace(token: string, state: AppState) {
  return request<{ state: AppState }>("/driver/state", token, { method: "PUT", body: JSON.stringify({ state }) });
}

export function saveDriverProfile(token: string, profile: DriverMembership["profile"]) {
  return request<{ member: DriverMembership }>("/driver/profile", token, { method: "PUT", body: JSON.stringify({ profile }) });
}

export function sendDriverInvoice(token: string, driverUserId: string, title: string, html: string) {
  return request<{ invoice: NonNullable<WorkspaceResponse["invoices"]>[number] }>("/invoices", token, { method: "POST", body: JSON.stringify({ driverUserId, title, html }) });
}

export function revokeDriverInvoice(token: string, invoiceId: string) {
  return request(`/invoices/${invoiceId}/revoke`, token, { method: "POST" });
}

export function getDriverInvoices(token: string) {
  return request<{ invoices: WorkspaceResponse["invoices"] }>("/invoices", token);
}