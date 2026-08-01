import { Layout } from "@/components/layout";
import { useStore, WorkLog } from "@/lib/store";
import { useState } from "react";
import { Plus, CheckCircle2, ClipboardX, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function Logs() {
  const { state, dispatch } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLogs, setSelectedLogs] = useState<string[]>([]);
  const [khataCustomerId, setKhataCustomerId] = useState("");
  const [isKhataOpen, setIsKhataOpen] = useState(false);
  
  const [formData, setFormData] = useState<Partial<WorkLog>>({
    date: filterDate, vehicleId: "", driverId: "", customerId: "", description: "", hours: 0, amount: 0, status: "Pending"
  });

  const filteredLogs = state.logs.filter(l => l.date === filterDate).sort((a,b) => b.id.localeCompare(a.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'ADD_LOG', payload: formData });
    setIsAddOpen(false);
    setFormData({ date: filterDate, vehicleId: state.vehicles[0]?.id || "", driverId: state.drivers[0]?.id || "", customerId: "", description: "", hours: 0, amount: 0, status: "Pending" });
  };

  const toggleSelect = (id: string) => {
    setSelectedLogs(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const markSelectedPaid = () => {
    selectedLogs.forEach(id => {
      const log = state.logs.find(l => l.id === id);
      if (log) dispatch({ type: 'UPDATE_LOG', payload: { ...log, status: 'Paid' } });
    });
    setSelectedLogs([]);
  };

  const deleteSelected = () => {
    if (confirm(`Delete ${selectedLogs.length} logs?`)) {
      selectedLogs.forEach(id => dispatch({ type: 'DELETE_LOG', payload: id }));
      setSelectedLogs([]);
    }
  };

  const addSelectedToKhata = (e: React.FormEvent) => {
    e.preventDefault();
    if (!khataCustomerId) return;
    selectedLogs.forEach((id) => {
      const log = state.logs.find((item) => item.id === id);
      if (!log || state.ledgers.some((entry) => entry.logId === log.id)) return;
      dispatch({
        type: "ADD_LEDGER",
        payload: {
          customerId: khataCustomerId,
          logId: log.id,
          vehicleId: log.vehicleId,
          date: log.date,
          type: "Charge",
          amount: log.amount,
          description: log.description,
        },
      });
      dispatch({ type: "UPDATE_LOG", payload: { ...log, customerId: khataCustomerId } });
    });
    setSelectedLogs([]);
    setKhataCustomerId("");
    setIsKhataOpen(false);
  };

  return (
    <Layout>
      <div className="pt-12 px-6 pb-6 bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Work Logs</h1>
            <p className="text-sm text-muted-foreground font-medium mt-1">Daily operations tracking</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <button 
                onClick={() => setFormData({ ...formData, date: filterDate, vehicleId: state.vehicles[0]?.id || "", driverId: state.drivers[0]?.id || "" })}
                className="bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">Add Work Log</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Vehicle</label>
                  <select required value={formData.vehicleId} onChange={e => setFormData({...formData, vehicleId: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary">
                    <option value="" disabled>Select Vehicle</option>
                    {state.vehicles.map(v => <option key={v.id} value={v.id}>{v.name} ({v.regNumber})</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Driver</label>
                  <select required value={formData.driverId} onChange={e => setFormData({...formData, driverId: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary">
                    <option value="" disabled>Select Driver</option>
                    {state.drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Customer / Site</label>
                  <select value={formData.customerId || ""} onChange={e => setFormData({...formData, customerId: e.target.value || undefined})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary">
                    <option value="">No customer yet</option>
                    {state.customers.filter(c => !c.completed).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Description</label>
                  <input required value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="e.g. Site clearing at layout" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Hours</label>
                    <input type="number" step="0.5" required value={formData.hours || ''} onChange={e => setFormData({...formData, hours: Number(e.target.value)})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="8" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Amount (₹)</label>
                    <input type="number" required value={formData.amount || ''} onChange={e => setFormData({...formData, amount: Number(e.target.value)})} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="12000" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-foreground text-background font-bold p-4 rounded-xl mt-4 active:scale-95 transition-transform">
                  Save Log
                </button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex gap-2">
          <input 
            type="date" 
            value={filterDate} 
            onChange={(e) => setFilterDate(e.target.value)}
            className="flex-1 bg-muted border-none rounded-xl px-4 py-3 font-bold text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="px-6 py-6 pb-24">
        {selectedLogs.length > 0 && (
          <div className="bg-foreground text-background rounded-2xl p-4 mb-4 flex items-center justify-between sticky top-4 z-20 shadow-xl">
            <span className="font-bold text-sm">{selectedLogs.length} selected</span>
            <div className="flex gap-2">
              <button onClick={markSelectedPaid} className="bg-primary text-primary-foreground p-2 rounded-xl text-xs font-bold active:scale-95">Mark Paid</button>
              <button onClick={() => setIsKhataOpen(true)} className="bg-white/10 text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95"><BookOpen size={13} /> Add to Khata</button>
              <button onClick={deleteSelected} className="bg-destructive text-destructive-foreground p-2 rounded-xl text-xs font-bold active:scale-95">Delete</button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-2xl border border-border border-dashed">
              <ClipboardX size={48} className="mx-auto text-muted-foreground opacity-30 mb-4" />
              <h3 className="text-lg font-bold">No logs for this date</h3>
              <p className="text-sm text-muted-foreground mt-1">Select another date or add a new log.</p>
            </div>
          ) : (
            filteredLogs.map(log => {
              const vehicle = state.vehicles.find(v => v.id === log.vehicleId);
              const driver = state.drivers.find(d => d.id === log.driverId);
              const customer = state.customers.find(c => c.id === log.customerId);
              const isSelected = selectedLogs.includes(log.id);

              return (
                <div 
                  key={log.id} 
                  onClick={() => toggleSelect(log.id)}
                  className={`bg-card rounded-2xl border p-4 shadow-sm transition-colors ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-base leading-tight">{log.description}</h4>
                      <div className="text-xs font-semibold text-muted-foreground mt-1">
                         {vehicle?.name} • {driver?.name} • {log.hours} hrs {customer ? `• ${customer.name}` : ""}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-black text-lg">₹{log.amount.toLocaleString()}</div>
                      <div className={`text-[10px] font-bold uppercase tracking-wide mt-1 flex items-center justify-end gap-1 ${log.status === 'Paid' ? 'text-green-600' : 'text-orange-500'}`}>
                        {log.status === 'Paid' && <CheckCircle2 size={10} />}
                        {log.status}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
      <Dialog open={isKhataOpen} onOpenChange={setIsKhataOpen}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="text-xl font-bold">Add selected work to Khata</DialogTitle></DialogHeader>
          <form onSubmit={addSelectedToKhata} className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">{selectedLogs.length} selected logs will be added as customer charges.</p>
            <select required value={khataCustomerId} onChange={e => setKhataCustomerId(e.target.value)} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary">
              <option value="" disabled>Select customer</option>
              {state.customers.filter(c => !c.completed).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="submit" className="w-full bg-foreground text-background font-bold p-4 rounded-xl">Add to Customer Khata</button>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
