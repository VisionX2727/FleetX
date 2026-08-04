import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { saveDriverWorkspace, saveOwnerWorkspace } from '@/lib/workspace';

export type Vehicle = {
  id: string; name: string; type: string; regNumber: string; status: 'Active' | 'Idle' | 'Maintenance';
  driverName?: string; driverPhone?: string; currentSite?: string; hourlyRate?: number; engineHours?: number;
  insuranceExpiry?: string; fitnessExpiry?: string; pucExpiry?: string; nextService?: string; notes?: string;
};
export type VehicleDay = { id: string; date: string; vehicleId: string; amount: number; diesel: number; trips: number; hours: number; status: Vehicle['status']; notes?: string };
export type WorkLog = { id: string; date: string; vehicleId: string; driverId: string; customerId?: string; description: string; hours: number; trips?: number; diesel?: number; amount: number; status: 'Pending' | 'Paid' };
export type Customer = { id: string; name: string; phone: string; company?: string; address?: string; completed?: boolean; paymentStatus?: 'Paid' | 'Delay'; paymentDate?: string; delayStartDate?: string; delayEndDate?: string; addGst?: boolean };
export type LedgerEntry = { id: string; customerId: string; logId?: string; vehicleId?: string; date: string; type: 'Charge' | 'Payment'; amount: number; description: string; paymentMode?: string };
export type FuelRecord = { id: string; date: string; vehicleId: string; driverId: string; quantity: number; cost: number; odometer: number };
export type Driver = { id: string; name: string; phone: string; type: 'Regular' | 'Temporary'; dailyRate: number; vehicleId?: string; startDate?: string; endDate?: string };
export type DriverPay = { id: string; driverId: string; date: string; amount: number; description: string; logIds?: string[] };
export type FleetNote = { id: string; date: string; text: string; updatedAt?: string; driverId?: string };
export type Settings = { businessName: string; companyName?: string; ownerName?: string; phone?: string; address?: string; email?: string; logoUrl?: string; upiId?: string; bankName?: string; gstNumber?: string; gstPercentage?: number; isLoggedIn: boolean };

export type AppState = {
  vehicles: Vehicle[];
  fleetDays: VehicleDay[];
  logs: WorkLog[];
  customers: Customer[];
  ledgers: LedgerEntry[];
  fuelRecords: FuelRecord[];
  drivers: Driver[];
  driverPays: DriverPay[];
  notes: FleetNote[];
  settings: Settings;
  maintenanceRequests?: MaintenanceRequest[];
};
export type MaintenanceRequest = { id: string; vehicleId: string; driverId: string; date: string; title: string; description?: string; status: "Open" | "Resolved" };

const defaultSettings: Settings = { businessName: 'FleetX', companyName: '', ownerName: '', phone: '', address: '', email: '', gstPercentage: 0, isLoggedIn: true };

const defaultState: AppState = {
  vehicles: [],
  fleetDays: [],
  logs: [],
  customers: [],
  ledgers: [],
  fuelRecords: [],
  drivers: [],
  driverPays: [],
  notes: [],
  settings: defaultSettings,
  maintenanceRequests: [],
};

function createEntityId(prefix: string) {
  return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeState(value: Partial<AppState>): AppState {
  const fresh = cloneDefaultState();
  return {
    ...fresh,
    ...value,
    vehicles: value.vehicles || fresh.vehicles,
    fleetDays: value.fleetDays || [],
    logs: value.logs || fresh.logs,
    customers: value.customers || fresh.customers,
    ledgers: value.ledgers || fresh.ledgers,
    fuelRecords: value.fuelRecords || fresh.fuelRecords,
    drivers: value.drivers || fresh.drivers,
    driverPays: value.driverPays || fresh.driverPays,
    notes: value.notes || fresh.notes,
    settings: { ...fresh.settings, ...(value.settings || {}) },
    maintenanceRequests: value.maintenanceRequests || [],
  };
}

type StoreContextType = {
  state: AppState;
  dispatch: (action: { type: string; payload?: any }) => void;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

function getStorageKey(userId: string) {
  return `fleet-manager-state:${userId}`;
}

function cloneDefaultState(): AppState {
  return JSON.parse(JSON.stringify(defaultState)) as AppState;
}

export function StoreProvider({
  children,
  userId,
  cloudSync = true,
  role,
  accessToken,
  remoteState,
}: {
  children: ReactNode;
  userId: string;
  cloudSync?: boolean;
  role?: "owner" | "driver";
  accessToken?: string;
  remoteState?: AppState;
}) {
  const [state, setState] = useState<AppState>(() => {
    if (remoteState) return normalizeState(remoteState);
    const scopedKey = getStorageKey(userId);
    const scopedSaved = localStorage.getItem(scopedKey);
    const legacySaved = localStorage.getItem("fleet-manager-state");
    const legacyOwner = localStorage.getItem("fleet-manager-legacy-owner");
    const saved = scopedSaved || (legacySaved && !legacyOwner ? legacySaved : null);
    if (saved) {
      try {
        const parsed = normalizeState(JSON.parse(saved) as Partial<AppState>);
        if (!scopedSaved && legacySaved && !legacyOwner) {
          localStorage.setItem("fleet-manager-legacy-owner", userId);
          localStorage.setItem(scopedKey, saved);
          localStorage.removeItem("fleet-manager-state");
        }
        return parsed;
      } catch (e) {
        return cloneDefaultState();
      }
    }
    const initial = cloneDefaultState();
    if (saved) {
      localStorage.setItem(getStorageKey(userId), saved);
    }
    return initial;
  });
  const [cloudLoaded, setCloudLoaded] = useState(false);
  const resetRequested = useRef(false);

  useEffect(() => {
    let mounted = true;
    setCloudLoaded(false);
    if (remoteState) {
      setState(normalizeState(remoteState));
      setCloudLoaded(true);
      return () => { mounted = false; };
    }
    if (!cloudSync || !supabaseConfigured) {
      setCloudLoaded(true);
      return () => { mounted = false; };
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const remoteState = data.user?.user_metadata?.fleet_manager_data;
      if (!resetRequested.current && remoteState && typeof remoteState === "object") {
        setState(normalizeState(remoteState as Partial<AppState>));
      }
      setCloudLoaded(true);
    });
    return () => { mounted = false; };
  }, [userId, cloudSync]);

  useEffect(() => {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(state));
    if (!cloudLoaded || !cloudSync) return;
    const timer = window.setTimeout(() => {
      const sync = role === "driver" && accessToken
        ? saveDriverWorkspace(accessToken, state)
        : role === "owner" && accessToken
          ? saveOwnerWorkspace(accessToken, state)
          : supabaseConfigured
            ? supabase.auth.updateUser({ data: { fleet_manager_data: state } })
            : Promise.resolve();
      sync.catch((error) => {
        console.error("Fleet cloud sync failed", error);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [state, userId, cloudLoaded, cloudSync, role, accessToken, remoteState]);

  const dispatch = (action: { type: string; payload?: any }) => {
    if (action.type === "RESET_DATA") {
      resetRequested.current = true;
      localStorage.removeItem(getStorageKey(userId));
      localStorage.removeItem("fleet-manager-state");
      if (cloudSync && supabaseConfigured) {
        supabase.auth.updateUser({ data: { fleet_manager_data: cloneDefaultState() } }).catch((error) => {
          console.error("Fleet reset sync failed", error);
        });
      }
    }
    setState((prev) => {
      switch (action.type) {
        // Vehicle Actions
        case 'ADD_VEHICLE':
          return { ...prev, vehicles: [...prev.vehicles, { id: `v${Date.now()}`, ...action.payload, driverName: undefined, driverPhone: undefined }] };
        case 'UPDATE_VEHICLE':
          return { ...prev, vehicles: prev.vehicles.map(v => v.id === action.payload.id ? { ...v, ...action.payload, driverName: undefined, driverPhone: undefined } : v) };
        case 'DELETE_VEHICLE':
          return { ...prev, vehicles: prev.vehicles.filter(v => v.id !== action.payload), fleetDays: prev.fleetDays.filter(day => day.vehicleId !== action.payload) };

        case 'ADD_FLEET_DAY':
          return { ...prev, fleetDays: [...prev.fleetDays, { id: `fd${Date.now()}`, ...action.payload }] };
        case 'UPDATE_FLEET_DAY':
          return { ...prev, fleetDays: prev.fleetDays.map(day => day.id === action.payload.id ? { ...day, ...action.payload } : day) };
        case 'DELETE_FLEET_DAY':
          return { ...prev, fleetDays: prev.fleetDays.filter(day => day.id !== action.payload) };
        
        // Log Actions
        case 'ADD_LOG':
          return { ...prev, logs: [...prev.logs, { id: createEntityId("l"), ...action.payload }] };
        case 'UPDATE_LOG':
          return { ...prev, logs: prev.logs.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l) };
        case 'DELETE_LOG':
          return {
            ...prev,
            logs: prev.logs.filter(l => l.id !== action.payload),
            ledgers: prev.ledgers.filter(entry => entry.logId !== action.payload),
          };

        // Customer Actions
        case 'ADD_CUSTOMER':
          return { ...prev, customers: [...prev.customers, { id: `c${Date.now()}`, ...action.payload }] };
        case 'UPDATE_CUSTOMER':
          return { ...prev, customers: prev.customers.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
        case 'TOGGLE_CUSTOMER_COMPLETE':
          return { ...prev, customers: prev.customers.map(c => c.id === action.payload ? { ...c, completed: !c.completed } : c) };
        case 'DELETE_CUSTOMER': {
          const customerId = action.payload;
          const customerLedgerEntries = prev.ledgers.filter((entry) => entry.customerId === customerId);
          const linkedLogIds = new Set(customerLedgerEntries.map((entry) => entry.logId).filter(Boolean));
          return {
            ...prev,
            customers: prev.customers.filter((customer) => customer.id !== customerId),
            ledgers: prev.ledgers.filter((entry) => entry.customerId !== customerId),
            logs: prev.logs.filter((log) => log.customerId !== customerId && !linkedLogIds.has(log.id)),
          };
        }
        
        // Ledger Actions
        case 'ADD_LEDGER':
          return { ...prev, ledgers: [...prev.ledgers, { id: createEntityId("le"), ...action.payload }] };
        case 'UPDATE_LEDGER':
          return { ...prev, ledgers: prev.ledgers.map(entry => entry.id === action.payload.id ? { ...entry, ...action.payload } : entry) };
        case 'DELETE_LEDGER':
          return { ...prev, ledgers: prev.ledgers.filter(entry => entry.id !== action.payload) };
        
        // Fuel Actions
        case 'ADD_FUEL':
          return { ...prev, fuelRecords: [...prev.fuelRecords, { id: `f${Date.now()}`, ...action.payload }] };

        case 'ADD_MAINTENANCE':
          return { ...prev, maintenanceRequests: [...(prev.maintenanceRequests || []), { id: createEntityId("m"), ...action.payload }] };
        case 'UPDATE_MAINTENANCE':
          return { ...prev, maintenanceRequests: (prev.maintenanceRequests || []).map(request => request.id === action.payload.id ? { ...request, ...action.payload } : request) };
        case 'DELETE_MAINTENANCE':
          return { ...prev, maintenanceRequests: (prev.maintenanceRequests || []).filter(request => request.id !== action.payload) };
        
        // Driver Actions
        case 'ADD_DRIVER':
          return {
            ...prev,
            drivers: [
              ...prev.drivers
                .map((driver) => action.payload.vehicleId && driver.vehicleId === action.payload.vehicleId ? { ...driver, vehicleId: undefined } : driver),
              { id: `d${Date.now()}`, ...action.payload },
            ],
          };
        case 'UPDATE_DRIVER':
          return {
            ...prev,
            drivers: prev.drivers.map((driver) =>
              driver.id !== action.payload.id && action.payload.vehicleId && driver.vehicleId === action.payload.vehicleId
                ? { ...driver, vehicleId: undefined }
                : driver.id === action.payload.id
                  ? { ...driver, ...action.payload }
                  : driver,
            ),
          };
        case 'DELETE_DRIVER':
          return {
            ...prev,
            drivers: prev.drivers.filter(d => d.id !== action.payload),
            driverPays: prev.driverPays.filter(pay => pay.driverId !== action.payload),
          };
        
        // Driver Pay Actions
        case 'ADD_DRIVER_PAY':
          return { ...prev, driverPays: [...prev.driverPays, { id: `dp${Date.now()}`, ...action.payload }] };

        // Notes Actions
        case 'ADD_NOTE':
          return { ...prev, notes: [...prev.notes, { id: createEntityId("n"), ...action.payload }] };
        case 'UPDATE_NOTE':
          return { ...prev, notes: prev.notes.map(note => note.id === action.payload.id ? { ...note, ...action.payload } : note) };
        case 'DELETE_NOTE':
          return { ...prev, notes: prev.notes.filter(note => note.id !== action.payload) };
          
        // Settings Actions
        case 'UPDATE_SETTINGS':
          return { ...prev, settings: { ...prev.settings, ...action.payload } };
        case 'RESET_DATA':
          return cloneDefaultState();

        default:
          return prev;
      }
    });
  };

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}

export function getLocalState(userId: string): AppState {
  const saved = localStorage.getItem(getStorageKey(userId));
  if (!saved) return cloneDefaultState();
  try {
    return normalizeState(JSON.parse(saved) as Partial<AppState>);
  } catch {
    return cloneDefaultState();
  }
}
