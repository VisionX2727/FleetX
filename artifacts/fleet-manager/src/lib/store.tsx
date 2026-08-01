import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type Vehicle = { id: string; name: string; type: string; regNumber: string; status: 'Active' | 'Idle' | 'Maintenance' };
export type WorkLog = { id: string; date: string; vehicleId: string; driverId: string; customerId?: string; description: string; hours: number; trips?: number; diesel?: number; amount: number; status: 'Pending' | 'Paid' };
export type Customer = { id: string; name: string; phone: string; company?: string; address?: string; completed?: boolean };
export type LedgerEntry = { id: string; customerId: string; logId?: string; vehicleId?: string; date: string; type: 'Charge' | 'Payment'; amount: number; description: string };
export type FuelRecord = { id: string; date: string; vehicleId: string; driverId: string; quantity: number; cost: number; odometer: number };
export type Driver = { id: string; name: string; phone: string; type: 'Regular' | 'Temporary'; dailyRate: number; vehicleId?: string };
export type DriverPay = { id: string; driverId: string; date: string; amount: number; description: string };
export type Settings = { businessName: string; ownerName?: string; phone?: string; address?: string; email?: string; logoUrl?: string; upiId?: string; bankName?: string; gstNumber?: string; isLoggedIn: boolean };

type AppState = {
  vehicles: Vehicle[];
  logs: WorkLog[];
  customers: Customer[];
  ledgers: LedgerEntry[];
  fuelRecords: FuelRecord[];
  drivers: Driver[];
  driverPays: DriverPay[];
  settings: Settings;
};

const defaultSettings: Settings = { businessName: 'My Fleet', ownerName: 'Fleet Owner', phone: '', address: '', email: '', isLoggedIn: true };

const defaultState: AppState = {
  vehicles: [
    { id: 'v1', name: 'Excavator 1', type: 'Excavator', regNumber: 'KA-01-EX-1234', status: 'Active' },
    { id: 'v2', name: 'JCB Backhoe', type: 'Backhoe', regNumber: 'KA-02-JB-5678', status: 'Active' },
    { id: 'v3', name: 'Tipper Truck', type: 'Truck', regNumber: 'KA-03-TR-9012', status: 'Maintenance' },
  ],
  logs: [
    { id: 'l1', date: new Date().toISOString().split('T')[0], vehicleId: 'v1', driverId: 'd1', customerId: 'c1', description: 'Site clearing at layout', hours: 8, trips: 2, diesel: 75, amount: 12000, status: 'Pending' },
  ],
  customers: [
    { id: 'c1', name: 'Ramesh Builders', phone: '9876543210', company: 'Ramesh Construction', address: 'Mysuru', completed: false },
    { id: 'c2', name: 'Suresh Layouts', phone: '9876543211', company: 'SLV Developers', address: 'Bengaluru', completed: false },
  ],
  ledgers: [
    { id: 'le1', customerId: 'c1', logId: 'l1', vehicleId: 'v1', date: new Date().toISOString().split('T')[0], type: 'Charge', amount: 12000, description: 'Site clearing' },
  ],
  fuelRecords: [
    { id: 'f1', date: new Date().toISOString().split('T')[0], vehicleId: 'v1', driverId: 'd1', quantity: 150, cost: 13500, odometer: 12500 },
  ],
  drivers: [
    { id: 'd1', name: 'Kumar', phone: '9988776655', type: 'Regular', dailyRate: 1000 },
    { id: 'd2', name: 'Raju', phone: '9988776656', type: 'Temporary', dailyRate: 1200 },
  ],
  driverPays: [
    { id: 'dp1', driverId: 'd1', date: new Date().toISOString().split('T')[0], amount: 5000, description: 'Weekly advance' },
  ],
  settings: defaultSettings,
};

type StoreContextType = {
  state: AppState;
  dispatch: (action: { type: string; payload?: any }) => void;
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('fleet-manager-state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem('fleet-manager-state', JSON.stringify(state));
  }, [state]);

  const dispatch = (action: { type: string; payload?: any }) => {
    setState((prev) => {
      switch (action.type) {
        // Vehicle Actions
        case 'ADD_VEHICLE':
          return { ...prev, vehicles: [...prev.vehicles, { id: `v${Date.now()}`, ...action.payload }] };
        case 'UPDATE_VEHICLE':
          return { ...prev, vehicles: prev.vehicles.map(v => v.id === action.payload.id ? { ...v, ...action.payload } : v) };
        case 'DELETE_VEHICLE':
          return { ...prev, vehicles: prev.vehicles.filter(v => v.id !== action.payload) };
        
        // Log Actions
        case 'ADD_LOG':
          return { ...prev, logs: [...prev.logs, { id: `l${Date.now()}`, ...action.payload }] };
        case 'UPDATE_LOG':
          return { ...prev, logs: prev.logs.map(l => l.id === action.payload.id ? { ...l, ...action.payload } : l) };
        case 'DELETE_LOG':
          return { ...prev, logs: prev.logs.filter(l => l.id !== action.payload) };

        // Customer Actions
        case 'ADD_CUSTOMER':
          return { ...prev, customers: [...prev.customers, { id: `c${Date.now()}`, ...action.payload }] };
        case 'UPDATE_CUSTOMER':
          return { ...prev, customers: prev.customers.map(c => c.id === action.payload.id ? { ...c, ...action.payload } : c) };
        case 'TOGGLE_CUSTOMER_COMPLETE':
          return { ...prev, customers: prev.customers.map(c => c.id === action.payload ? { ...c, completed: !c.completed } : c) };
        
        // Ledger Actions
        case 'ADD_LEDGER':
          return { ...prev, ledgers: [...prev.ledgers, { id: `le${Date.now()}`, ...action.payload }] };
        
        // Fuel Actions
        case 'ADD_FUEL':
          return { ...prev, fuelRecords: [...prev.fuelRecords, { id: `f${Date.now()}`, ...action.payload }] };
        
        // Driver Actions
        case 'ADD_DRIVER':
          return { ...prev, drivers: [...prev.drivers, { id: `d${Date.now()}`, ...action.payload }] };
        case 'UPDATE_DRIVER':
          return { ...prev, drivers: prev.drivers.map(d => d.id === action.payload.id ? { ...d, ...action.payload } : d) };
        
        // Driver Pay Actions
        case 'ADD_DRIVER_PAY':
          return { ...prev, driverPays: [...prev.driverPays, { id: `dp${Date.now()}`, ...action.payload }] };
          
        // Settings Actions
        case 'UPDATE_SETTINGS':
          return { ...prev, settings: { ...prev.settings, ...action.payload } };

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
