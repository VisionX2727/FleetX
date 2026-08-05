import type { AppState, Driver } from "@/lib/store";

export type DriverDocument = {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  uploadedAt: string;
  storagePath?: string;
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
    sharedFiles?: DriverDocument[];
    status?: "Active" | "Blocked" | "Removed" | "Suspended";
  };
};

export type WorkspaceResponse = {
  role: "owner" | "driver" | "blocked" | "removed" | null;
  ownerUserId?: string;
  state?: AppState;
  inviteCode?: string;
  member?: DriverMembership;
  ownerSettings?: AppState["settings"];
  availableVehicles?: AppState["vehicles"];
  invoices?: Array<{ id: string; ownerUserId?: string; driverUserId?: string; title: string; html: string; revokedAt?: string | null; createdAt: string }>;
  members?: Array<{ id: string; driverUserId: string; profile: DriverMembership["profile"] }>;
};

function workspaceUrl(path = "") {
  const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  return `${base}api/workspace${path}`;
}

const productionApiOrigin = "https://fleet-manager--knightxvenom.replit.app";

function workspaceUrls(path = "") {
  const localUrl = workspaceUrl(path);
  const fallbackUrl = `${productionApiOrigin}/api/workspace${path}`;
  return localUrl === fallbackUrl ? [localUrl] : [localUrl, fallbackUrl];
}

async function request<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  let lastError: Error | null = null;
  for (const url of workspaceUrls(path)) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers || {}),
        },
      });
      const raw = await response.text();
      let payload: Record<string, unknown> = {};
      try {
        payload = raw ? JSON.parse(raw) as Record<string, unknown> : {};
      } catch {
        // Keep the HTTP status useful when a proxy or server returns HTML.
      }
      if (response.ok) return payload as T;

      const serverMessage = typeof payload.error === "string" ? payload.error : "";
      lastError = new Error(
        serverMessage || `Workspace request failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""})`,
      );

      // A static host may answer POST /api with 404/405 instead of forwarding
      // it. Retry the same authenticated request against the API artifact.
      if (response.status !== 404 && response.status !== 405) throw lastError;
    } catch (error) {
      if (error instanceof Error) {
        lastError = error;
        if (!error.message.includes("(404") && !error.message.includes("(405") && error.message !== "Failed to fetch") {
          throw error;
        }
      }
    }
  }
  throw lastError || new Error("FleetX could not reach the workspace server. Check your internet connection and try again.");
}

export function getWorkspace(token: string) {
  return request<WorkspaceResponse>("", token);
}

export function createOwnerWorkspace(token: string) {
  // Initial role selection must stay small and reliable. The server creates a
  // canonical empty workspace; the StoreProvider syncs the full state after
  // the owner workspace is established.
  return request<WorkspaceResponse>("/owner", token, { method: "POST", body: JSON.stringify({}) });
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

export function updateOwnerDriver(token: string, memberId: string, profile: DriverMembership["profile"]) {
  return request<{ member: WorkspaceResponse["members"] extends Array<infer T> ? T : never }>("/owner/members/" + memberId, token, {
    method: "PUT",
    body: JSON.stringify({ profile }),
  });
}

export function setOwnerDriverStatus(token: string, memberId: string, status: "Active" | "Blocked" | "Removed") {
  return request<{ member: WorkspaceResponse["members"] extends Array<infer T> ? T : never }>(`/owner/members/${memberId}/status`, token, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export function deleteOwnerDriver(token: string, memberId: string) {
  return request<{ ok: true }>(`/owner/members/${memberId}`, token, { method: "DELETE" });
}

export function sendDriverFile(token: string, memberId: string, file: DriverDocument) {
  return request<{ member: NonNullable<WorkspaceResponse["members"]>[number] }>(`/owner/members/${memberId}/files`, token, {
    method: "POST",
    body: JSON.stringify({ file }),
  });
}