import { Layout } from "@/components/layout";
import { useStore } from "@/lib/store";
import { BarChart3, TrendingUp, TrendingDown, IndianRupee } from "lucide-react";
import { useState } from "react";

export default function Analytics() {
  const { state } = useStore();
  const [filter, setFilter] = useState<'All' | string>('All');
  const [period, setPeriod] = useState<'Month' | 'Week'>('Month');

  // Basic derivation for stats
  const todayStr = new Date().toISOString().substring(0,7); // just simple current month filtering for now
  
  const relevantLogs = state.logs.filter(l => 
    (filter === 'All' || l.vehicleId === filter) && 
    l.date.startsWith(todayStr)
  );
  
  const relevantFuel = state.fuelRecords.filter(f => 
    (filter === 'All' || f.vehicleId === filter) && 
    f.date.startsWith(todayStr)
  );

  const totalRevenue = relevantLogs.reduce((acc, l) => acc + l.amount, 0);
  const totalFuel = relevantFuel.reduce((acc, f) => acc + f.cost, 0);
  const totalHours = relevantLogs.reduce((acc, l) => acc + l.hours, 0);
  const driverCost = relevantLogs.reduce((acc, log) => {
    const driver = state.drivers.find((item) => item.id === log.driverId);
    return acc + (driver?.dailyRate || 0);
  }, 0);
  const netProfit = totalRevenue - totalFuel - driverCost;

  return (
    <Layout>
      <div className="pt-12 px-6 pb-6 bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <h1 className="text-3xl font-black tracking-tight mb-4">Analytics</h1>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setFilter('All')}
            className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold ${filter === 'All' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            All Fleet
          </button>
          {state.vehicles.map(v => (
             <button 
              key={v.id}
              onClick={() => setFilter(v.id)}
              className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold ${filter === v.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
            >
              {v.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-8 space-y-6 pb-24">
        
        <div className="bg-card rounded-3xl border border-border p-6 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Net Profit (This Month)</div>
          <div className={`text-4xl font-black ${netProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            ₹{netProfit.toLocaleString()}
          </div>
        </div>

          <div className="grid grid-cols-2 gap-4">
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <TrendingUp size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Revenue</span>
            </div>
            <div className="text-2xl font-black">₹{totalRevenue.toLocaleString()}</div>
          </div>
          
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-3">
              <TrendingDown size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Fuel Cost</span>
            </div>
            <div className="text-2xl font-black text-destructive">₹{totalFuel.toLocaleString()}</div>
          </div>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <IndianRupee size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Driver Cost</span>
              </div>
              <div className="text-2xl font-black text-destructive">₹{driverCost.toLocaleString()}</div>
            </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-3">
            <BarChart3 size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Work Hours</span>
          </div>
          <div className="text-2xl font-black">{totalHours} <span className="text-lg text-muted-foreground font-semibold">hrs</span></div>
          <div className="h-2 bg-muted rounded-full mt-4 overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(totalHours/2, 100)}%` }}></div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
