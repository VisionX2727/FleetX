import { useStore } from "@/lib/store";
import { Layout } from "@/components/layout";
import { Link } from "wouter";
import { ArrowUpRight, ArrowDownRight, ClipboardList, AlertCircle, TrendingUp } from "lucide-react";
import LogoAsset from "@assets/1783028126241_1785582569703.png";

export default function Home() {
  const { state } = useStore();

  const today = new Date().toISOString().split('T')[0];
  const todayLogs = state.logs.filter(l => l.date === today);
  const todayRevenue = todayLogs.reduce((sum, l) => sum + l.amount, 0);
  
  const todayFuel = state.fuelRecords.filter(f => f.date === today);
  const todayExpense = todayFuel.reduce((sum, f) => sum + f.cost, 0);

   const activeVehicles = state.vehicles.filter(v => v.status === 'Active').length;
   const idleVehicles = state.vehicles.filter(v => v.status === 'Idle').length;
  const maintenanceVehicles = state.vehicles.filter(v => v.status === 'Maintenance').length;

  return (
    <Layout>
      <div className="bg-primary pt-12 pb-6 px-6 text-primary-foreground rounded-b-[2.5rem] shadow-md relative overflow-hidden">
        {/* Subtle texture/pattern could go here */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black via-transparent to-transparent pointer-events-none"></div>
        
        <div className="flex justify-between items-start relative z-10">
          <div>
            <h1 className="text-sm font-semibold opacity-80 uppercase tracking-wider mb-1">Command Center</h1>
            <h2 className="text-3xl font-bold tracking-tight">{state.settings.businessName}</h2>
          </div>
          {state.settings.logoUrl || LogoAsset ? (
            <img src={state.settings.logoUrl || LogoAsset} alt="Logo" className="w-12 h-12 rounded-xl shadow-sm object-cover bg-white p-1" />
          ) : null}
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
          <div className="bg-primary-foreground/10 p-4 rounded-2xl backdrop-blur-sm border border-primary-foreground/5">
            <div className="flex items-center gap-1.5 text-primary-foreground/80 mb-1">
              <TrendingUp size={14} />
              <span className="text-xs font-semibold uppercase">Today's Work</span>
            </div>
            <div className="text-2xl font-bold flex items-center gap-1">
              <span className="text-lg">₹</span>
              {todayRevenue.toLocaleString()}
            </div>
          </div>
          <div className="bg-primary-foreground/10 p-4 rounded-2xl backdrop-blur-sm border border-primary-foreground/5">
            <div className="flex items-center gap-1.5 text-primary-foreground/80 mb-1">
              <ArrowDownRight size={14} />
              <span className="text-xs font-semibold uppercase">Today's Fuel</span>
            </div>
            <div className="text-2xl font-bold flex items-center gap-1">
              <span className="text-lg">₹</span>
              {todayExpense.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-8 space-y-8">
        
        {/* Fleet Status */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Fleet Status</h3>
            <Link href="/fleet" className="text-sm font-bold text-primary">View All</Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center shadow-sm">
              <div className="text-3xl font-black mb-1">{activeVehicles}</div>
              <div className="text-sm font-semibold text-muted-foreground">Active Units</div>
            </div>
            <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center shadow-sm">
              <div className="text-3xl font-black mb-1 flex items-center gap-2">
                {maintenanceVehicles}
                {maintenanceVehicles > 0 && <AlertCircle size={20} className="text-destructive" />}
              </div>
              <div className="text-sm font-semibold text-muted-foreground">In Maintenance</div>
            </div>
             <div className="bg-card border border-border p-4 rounded-2xl flex flex-col justify-center shadow-sm">
               <div className="text-3xl font-black mb-1">{idleVehicles}</div>
               <div className="text-sm font-semibold text-muted-foreground">Idle Units</div>
             </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h3 className="text-lg font-bold mb-4">Quick Log</h3>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/logs?action=new" className="bg-card border-2 border-dashed border-border hover:border-primary transition-colors p-4 rounded-2xl flex flex-col items-center justify-center gap-3 text-center shadow-sm">
              <div className="bg-primary/10 p-3 rounded-full text-primary">
                <ClipboardList size={24} />
              </div>
              <span className="font-semibold text-sm">Add Work Log</span>
            </Link>
            <Link href="/fuel?action=new" className="bg-card border-2 border-dashed border-border hover:border-primary transition-colors p-4 rounded-2xl flex flex-col items-center justify-center gap-3 text-center shadow-sm">
              <div className="bg-destructive/10 p-3 rounded-full text-destructive">
                <ArrowDownRight size={24} />
              </div>
              <span className="font-semibold text-sm">Add Fuel Entry</span>
            </Link>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="pb-8">
          <h3 className="text-lg font-bold mb-4">Recent Work</h3>
          <div className="space-y-3">
            {todayLogs.length === 0 ? (
              <div className="text-center py-8 bg-card border border-border rounded-2xl">
                <ClipboardList size={32} className="mx-auto text-muted-foreground mb-2 opacity-50" />
                <p className="text-muted-foreground font-medium text-sm">No logs added today.</p>
              </div>
            ) : (
              todayLogs.slice(0,3).map(log => {
                const vehicle = state.vehicles.find(v => v.id === log.vehicleId);
                return (
                  <div key={log.id} className="bg-card border border-border p-4 rounded-2xl flex items-center justify-between shadow-sm">
                    <div>
                      <div className="font-bold">{vehicle?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground font-medium mt-0.5">{log.description} • {log.hours} hrs</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">₹{log.amount.toLocaleString()}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${log.status === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>
                        {log.status}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>

      </div>
    </Layout>
  );
}
