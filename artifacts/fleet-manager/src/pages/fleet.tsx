import { Layout } from "@/components/layout";
import { useStore, Vehicle } from "@/lib/store";
import { useState } from "react";
import { Plus, Truck, Pen, Trash2, Wrench, CheckCircle, CirclePause, BarChart3 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Fleet() {
  const { state, dispatch } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Vehicle>>({
    name: "", type: "", regNumber: "", status: "Active"
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      dispatch({ type: 'UPDATE_VEHICLE', payload: { id: editingId, ...formData } });
    } else {
      dispatch({ type: 'ADD_VEHICLE', payload: formData });
    }
    setIsAddOpen(false);
    setEditingId(null);
    setFormData({ name: "", type: "", regNumber: "", status: "Active" });
  };

  const openEdit = (v: Vehicle) => {
    setFormData(v);
    setEditingId(v.id);
    setIsAddOpen(true);
  };

  const deleteVehicle = (id: string) => {
    if (confirm("Are you sure you want to delete this vehicle?")) {
      dispatch({ type: 'DELETE_VEHICLE', payload: id });
    }
  };

  return (
    <Layout>
      <div className="pt-12 px-6 pb-6 bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Fleet</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">{state.vehicles.length} equipment units</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <button 
                onClick={() => { setEditingId(null); setFormData({ name: "", type: "", regNumber: "", status: "Active" }); }}
                className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">{editingId ? 'Edit Equipment' : 'Add Equipment'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Name</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Excavator 1" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Type</label>
                  <input required value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Backhoe, Tipper" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Reg Number</label>
                  <input required value={formData.regNumber} onChange={e => setFormData({...formData, regNumber: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. KA-01-XX-1234" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Status</label>
                   <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as 'Active'|'Idle'|'Maintenance'})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary appearance-none">
                    <option value="Active">Active</option>
                     <option value="Idle">Idle</option>
                    <option value="Maintenance">Maintenance</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-foreground text-background font-bold p-4 rounded-xl mt-4 active:scale-95 transition-transform">
                  {editingId ? 'Save Changes' : 'Add Vehicle'}
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {state.vehicles.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border border-dashed">
            <Truck size={48} className="mx-auto text-muted-foreground opacity-30 mb-4" />
            <h3 className="text-lg font-bold">No equipment yet</h3>
            <p className="text-sm text-muted-foreground mt-1">Add your first vehicle to get started.</p>
          </div>
        ) : (
          state.vehicles.map(vehicle => (
             <div key={vehicle.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{vehicle.name}</h3>
                  <div className="text-sm font-semibold text-muted-foreground mt-0.5">{vehicle.type} • {vehicle.regNumber}</div>
                </div>
                 <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${vehicle.status === 'Active' ? 'bg-green-100 text-green-700' : vehicle.status === 'Idle' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                   {vehicle.status === 'Active' ? <CheckCircle size={12} /> : <Wrench size={12} />}
                  {vehicle.status}
                </div>
              </div>
               <div className="flex gap-2 pt-4 border-t border-border/50">
                 <button onClick={() => setDetailId(vehicle.id)} className="flex-1 bg-primary/10 text-primary py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-primary/20">
                   <BarChart3 size={16} /> Details
                 </button>
                <button onClick={() => openEdit(vehicle)} className="flex-1 bg-muted text-foreground py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-muted/80">
                  <Pen size={16} /> Edit
                </button>
                <button onClick={() => deleteVehicle(vehicle.id)} className="flex-1 bg-destructive/10 text-destructive py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 active:bg-destructive/20">
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <Dialog open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          {detailId && (() => {
            const vehicle = state.vehicles.find((item) => item.id === detailId);
            if (!vehicle) return null;
            const logs = state.logs.filter((log) => log.vehicleId === vehicle.id);
            const fuel = state.fuelRecords.filter((record) => record.vehicleId === vehicle.id);
            const revenue = logs.reduce((sum, log) => sum + log.amount, 0);
            const fuelCost = fuel.reduce((sum, record) => sum + record.cost, 0);
            const driverCost = logs.reduce((sum, log) => sum + (state.drivers.find((driver) => driver.id === log.driverId)?.dailyRate || 0), 0);
            return (
              <>
                <DialogHeader><DialogTitle className="text-xl font-bold">{vehicle.name}</DialogTitle></DialogHeader>
                <p className="text-sm text-muted-foreground">{vehicle.type} • {vehicle.regNumber}</p>
                <div className="grid grid-cols-3 gap-2 my-4">
                  <div className="rounded-xl bg-green-50 p-3"><div className="text-[10px] font-bold uppercase text-green-700">Revenue</div><div className="font-black text-green-800">₹{revenue.toLocaleString()}</div></div>
                  <div className="rounded-xl bg-red-50 p-3"><div className="text-[10px] font-bold uppercase text-red-700">Fuel</div><div className="font-black text-red-800">₹{fuelCost.toLocaleString()}</div></div>
                  <div className="rounded-xl bg-amber-50 p-3"><div className="text-[10px] font-bold uppercase text-amber-700">Net</div><div className="font-black text-amber-800">₹{(revenue - fuelCost - driverCost).toLocaleString()}</div></div>
                </div>
                <h4 className="font-bold mb-2">Recent work</h4>
                <div className="space-y-2">
                  {logs.length === 0 ? <p className="text-sm text-muted-foreground">No work logs yet.</p> : logs.slice().reverse().map((log) => <div key={log.id} className="rounded-xl bg-muted p-3 flex items-center justify-between"><div><div className="font-bold text-sm">{log.description}</div><div className="text-xs text-muted-foreground">{log.date} • {log.hours} hrs</div></div><div className="font-black">₹{log.amount.toLocaleString()}</div></div>)}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
