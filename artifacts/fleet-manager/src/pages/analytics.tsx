import { Layout } from "@/components/layout";
import { useStore } from "@/lib/store";
import { BarChart3, TrendingUp, TrendingDown, IndianRupee, Fuel, Users } from "lucide-react";
import { useState } from "react";

export default function Analytics() {
  const { state } = useStore();
  const [filter, setFilter] = useState<"All" | string>("All");
  const month = new Date().toISOString().substring(0, 7);

  const relevantLogs = state.logs.filter((log) => (filter === "All" || log.vehicleId === filter) && log.date.startsWith(month));
  const relevantDays = state.fleetDays.filter((day) => (filter === "All" || day.vehicleId === filter) && day.date.startsWith(month));
  const relevantFuel = state.fuelRecords.filter((fuel) => (filter === "All" || fuel.vehicleId === filter) && fuel.date.startsWith(month));
  const totalRevenue = relevantLogs.reduce((sum, log) => sum + log.amount, 0) + relevantDays.reduce((sum, day) => sum + day.amount, 0);
  const totalFuel = relevantFuel.reduce((sum, fuel) => sum + fuel.cost, 0);
  const totalHours = relevantLogs.reduce((sum, log) => sum + log.hours, 0) + relevantDays.reduce((sum, day) => sum + day.hours, 0);
  const driverCost = relevantLogs.reduce((sum, log) => sum + (state.drivers.find((driver) => driver.id === log.driverId)?.dailyRate || 0), 0);
  const netProfit = totalRevenue - totalFuel - driverCost;
  const ringStyle = { background: `conic-gradient(${netProfit >= 0 ? "#34d399" : "#fb7185"} 0 72%, rgba(255,255,255,.08) 72% 100%)` };

  return (
    <Layout>
      <header className="fm-page-header">
        <div><h1>Analytics</h1><p>Revenue, expenses and profit by vehicle</p></div>
      </header>
      <div className="fm-filter-row">
        <button type="button" onClick={() => setFilter("All")} className={`fm-filter-pill ${filter === "All" ? "is-selected" : ""}`}>All Fleet</button>
        {state.vehicles.map((vehicle) => <button type="button" key={vehicle.id} onClick={() => setFilter(vehicle.id)} className={`fm-filter-pill ${filter === vehicle.id ? "is-selected" : ""}`}>{vehicle.name}</button>)}
      </div>
      <main className="fm-page-content space-y-5">
        <section className="fm-card flex flex-col items-center p-5 text-center">
          <div className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">Net Profit · This Month</div>
          <div className="fm-ring" style={ringStyle}><div className="fm-ring-content"><strong className={netProfit >= 0 ? "text-emerald-400" : "text-rose-300"}>₹{netProfit.toLocaleString("en-IN")}</strong><span>Net profit</span></div></div>
        </section>
        <section className="grid grid-cols-2 gap-3">
          <div className="fm-card p-4"><TrendingUp className="mb-3 text-emerald-400" size={18} /><span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Revenue</span><strong className="mt-1 block text-xl font-black text-emerald-400">₹{totalRevenue.toLocaleString("en-IN")}</strong></div>
          <div className="fm-card p-4"><Fuel className="mb-3 text-rose-300" size={18} /><span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Fuel</span><strong className="mt-1 block text-xl font-black text-rose-300">₹{totalFuel.toLocaleString("en-IN")}</strong></div>
          <div className="fm-card p-4"><Users className="mb-3 text-amber-300" size={18} /><span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Drivers</span><strong className="mt-1 block text-xl font-black text-amber-300">₹{driverCost.toLocaleString("en-IN")}</strong></div>
          <div className="fm-card p-4"><BarChart3 className="mb-3 text-primary" size={18} /><span className="text-xs font-black uppercase tracking-wider text-muted-foreground">Work Hours</span><strong className="mt-1 block text-xl font-black">{totalHours}</strong></div>
        </section>
        <section className="fm-card p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-wider">Vehicle performance</h2><span className="text-xs text-muted-foreground">{month}</span></div>
          <div className="fm-stack">
            {state.vehicles.length === 0 ? <p className="fm-muted">Add a vehicle to see separate profit, fuel, and driver data.</p> : state.vehicles.map((vehicle) => {
              const vehicleRevenue = state.logs.filter((log) => log.vehicleId === vehicle.id && log.date.startsWith(month)).reduce((sum, log) => sum + log.amount, 0) + state.fleetDays.filter((day) => day.vehicleId === vehicle.id && day.date.startsWith(month)).reduce((sum, day) => sum + day.amount, 0);
              const vehicleFuel = state.fuelRecords.filter((fuel) => fuel.vehicleId === vehicle.id && fuel.date.startsWith(month)).reduce((sum, fuel) => sum + fuel.cost, 0);
              const vehicleDrivers = state.logs.filter((log) => log.vehicleId === vehicle.id && log.date.startsWith(month)).reduce((sum, log) => sum + (state.drivers.find((driver) => driver.id === log.driverId)?.dailyRate || 0), 0);
              return <div className="fm-list-row" key={vehicle.id}><div><strong>{vehicle.name}</strong><small>Revenue ₹{vehicleRevenue.toLocaleString("en-IN")} • Fuel ₹{vehicleFuel.toLocaleString("en-IN")}</small></div><div className="fm-list-value text-primary">₹{(vehicleRevenue - vehicleFuel - vehicleDrivers).toLocaleString("en-IN")}</div></div>;
            })}
          </div>
        </section>
      </main>
    </Layout>
  );
}