import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { AppState } from "@/lib/store";
import { saveDriverProfile, type DriverMembership, type WorkspaceResponse } from "@/lib/workspace";

export type WorkspaceRole = {
  role: "owner" | "driver";
  ownerUserId?: string;
  inviteCode?: string;
  member?: DriverMembership;
  ownerSettings?: AppState["settings"];
  availableVehicles?: AppState["vehicles"];
  invoices?: WorkspaceResponse["invoices"];
  members?: WorkspaceResponse["members"];
  session: Session;
};

type RoleContextValue = WorkspaceRole & {
  updateMember: (member: DriverMembership) => void;
  updateDriverProfile: (profile: DriverMembership["profile"]) => Promise<void>;
  addInvoice: (invoice: NonNullable<WorkspaceResponse["invoices"]>[number]) => void;
  removeInvoice: (invoiceId: string) => void;
};

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ value, children }: { value: WorkspaceRole; children: ReactNode }) {
  const [current, setCurrent] = useState(value);
  const updateMember = (member: DriverMembership) => setCurrent((previous) => ({ ...previous, member }));
  const updateDriverProfile = async (profile: DriverMembership["profile"]) => {
    const result = await saveDriverProfile(current.session.access_token, profile);
    updateMember(result.member);
  };
  const addInvoice = (invoice: NonNullable<WorkspaceResponse["invoices"]>[number]) => {
    setCurrent((previous) => ({ ...previous, invoices: [...(previous.invoices || []), invoice] }));
  };
  const removeInvoice = (invoiceId: string) => {
    setCurrent((previous) => ({ ...previous, invoices: (previous.invoices || []).map((invoice) => invoice.id === invoiceId ? { ...invoice, revokedAt: new Date().toISOString() } : invoice) }));
  };
  const contextValue = useMemo(() => ({ ...current, updateMember, updateDriverProfile, addInvoice, removeInvoice }), [current]);
  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>;
}

export function useRole() {
  const value = useContext(RoleContext);
  if (!value) throw new Error("useRole must be used inside RoleProvider");
  return value;
}