import { Layout } from "@/components/layout";
import { useStore, Vehicle } from "@/lib/store";
import { useState } from "react";
import { Plus, Truck, Pen, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";

const emptyVehicle: Partial<Vehicle> = {
  name: "", type: "JCB", regNumber: "", status: "Active",
  currentSite: "", hourlyRate: 0, engineHours: 0, insuranceExpiry: "", fitnessExpiry: "",
  pucExpiry: "", nextService: "", notes: "",
};

export default function Fleet() {
  const { state, dispatch } = useStore();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Vehicle>>(emptyVehicle);
  const [typeFilter, setTypeFilter] = useState("All");

  const types = ["All", "JCB", "Hywa", "Tipper", "Crane"];
  const visibleVehicles = typeFilter === "All" ? state.vehicles : state.vehicles.filter((vehicle) => vehicle.type === typeFilter);

  const openAdd = () => {
    setEditingId(null);
    setFormData({ ...emptyVehicle });
    setIsAddOpen(true);
  };

  const openEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({ ...vehicle });
    setIsAddOpen(true);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.name?.trim() || !formData.regNumber?.trim()) return;
    if (editingId) dispatch({ type: "UPDATE_VEHICLE", payload: { id: editingId, ...formData } });
    else dispatch({ type: "ADD_VEHICLE", payload: formData });
    setIsAddOpen(false);
    setEditingId(null);
    setFormData({ ...emptyVehicle });
  };

  const deleteVehicle = (id: string) => {
    if (window.confirm("Delete this vehicle and its daily fleet records?")) dispatch({ type: "DELETE_VEHICLE", payload: id });
  };

  const statusClass = (status: Vehicle["status"]) =>
    status === "Active" ? "fm-status-active" : status === "Idle" ? "fm-status-idle" : "fm-status-maintenance";

  return (
    <Layout>
      <header className="fm-page-header">
        <div>
          <h1>Fleet</h1>
          <p>{state.vehicles.length} vehicles</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/drivers" className="fm-action-button fm-action-primary flex items-center gap-1.5" aria-label="Open drivers">
            <Truck size={16} /> Drivers
          </Link>
          <button type="button" className="fm-icon-button fm-primary-icon" onClick={openAdd} aria-label="Add vehicle"><Plus size={26} /></button>
        </div>
      </header>

      <div className="fm-filter-row">
        {types.map((type) => (
          <button key={type} type="button" onClick={() => setTypeFilter(type)} className={`fm-filter-pill ${typeFilter === type ? "is-selected" : ""}`}>{type}</button>
        ))}
      </div>

      <main className="fm-page-content">
        {visibleVehicles.length === 0 ? (
          <section className="fm-empty-state">
            <Truck size={58} />
            <p>No vehicles yet. Add your first vehicle.</p>
            <button type="button" className="fm-primary-button" onClick={openAdd}><Plus size={20} /> Add Vehicle</button>
          </section>
        ) : (
          <div className="fm-stack">
            {visibleVehicles.map((vehicle) => {
              const latestDay = state.fleetDays.filter((day) => day.vehicleId === vehicle.id).sort((a, b) => b.date.localeCompare(a.date))[0];
              const assignedDriver = state.drivers.find((driver) => driver.type === "Temporary" && driver.vehicleId === vehicle.id) || state.drivers.find((driver) => driver.vehicleIds?.includes(vehicle.id) || (driver.type !== "Temporary" && driver.vehicleId === vehicle.id));
              return (
                <article key={vehicle.id} className="fm-card fm-vehicle-card">
                  <div className="fm-vehicle-heading">
                    <div className="fm-vehicle-avatar"><Truck size={25} /></div>
                    <div className="fm-grow">
                      <h2>{vehicle.name}</h2>
                      <p>{vehicle.type} <span>•</span> {vehicle.regNumber}</p>
                    </div>
                    <select
                      aria-label={`Change status for ${vehicle.name}`}
                      value={vehicle.status}
                      onChange={(event) => dispatch({
                        type: "UPDATE_VEHICLE",
                        payload: { id: vehicle.id, status: event.target.value as Vehicle["status"] },
                      })}
                      className={`fm-status fm-status-select ${statusClass(vehicle.status)}`}
                    >
                      <option value="Active">Active</option>
                      <option value="Idle">Idle</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div className="fm-vehicle-metrics">
                    <div><span>Site</span><strong>{vehicle.currentSite || "Not set"}</strong></div>
                    <div><span>Driver</span><strong>{assignedDriver?.name || "Not assigned"}</strong></div>
                    <div><span>Today</span><strong>{latestDay?.hours || 0} hrs</strong></div>
                  </div>
                  <div className="fm-card-actions">
                    <button type="button" className="fm-action-button fm-action-primary" onClick={() => setDetailId(vehicle.id)}>Details</button>
                    <button type="button" className="fm-action-button fm-action-icon" onClick={() => openEdit(vehicle)} aria-label={`Edit ${vehicle.name}`}><Pen size={16} /></button>
                    <button type="button" className="fm-action-button fm-action-danger fm-action-icon" onClick={() => deleteVehicle(vehicle.id)} aria-label={`Delete ${vehicle.name}`}><Trash2 size={16} /></button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="fm-dialog fm-vehicle-dialog">
          <DialogHeader><DialogTitle>{editingId ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="fm-form">
            <fieldset>
              <legend>Vehicle Type</legend>
              <div className="fm-choice-row">
                {["JCB", "Hywa", "Tipper", "Crane"].map((type) => (
                  <button type="button" key={type} className={`fm-choice ${formData.type === type ? "is-selected" : ""}`} onClick={() => setFormData({ ...formData, type })}>{type}</button>
                ))}
              </div>
            </fieldset>
            <label>Vehicle Name *<input required value={formData.name || ""} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., JCB 3DX" /></label>
            <label>Registration Number *<input required value={formData.regNumber || ""} onChange={(e) => setFormData({ ...formData, regNumber: e.target.value.toUpperCase() })} placeholder="MH 12 XX 1234" /></label>
            <label>Current Site<input value={formData.currentSite || ""} onChange={(e) => setFormData({ ...formData, currentSite: e.target.value })} placeholder="Site name" /></label>
            <div className="fm-form-grid">
              <label>Hourly Rate (₹)<input type="number" min="0" value={formData.hourlyRate || ""} onChange={(e) => setFormData({ ...formData, hourlyRate: Number(e.target.value) })} placeholder="0" /></label>
              <label>Engine Hours<input type="number" min="0" value={formData.engineHours || ""} onChange={(e) => setFormData({ ...formData, engineHours: Number(e.target.value) })} placeholder="0" /></label>
            </div>
            <fieldset className="fm-documents">
              <legend>Documents &amp; Service</legend>
              <div className="fm-form-grid">
                <label>Insurance Expiry<input type="date" value={formData.insuranceExpiry || ""} onChange={(e) => setFormData({ ...formData, insuranceExpiry: e.target.value })} /></label>
                <label>Fitness Expiry<input type="date" value={formData.fitnessExpiry || ""} onChange={(e) => setFormData({ ...formData, fitnessExpiry: e.target.value })} /></label>
                <label>PUC Expiry<input type="date" value={formData.pucExpiry || ""} onChange={(e) => setFormData({ ...formData, pucExpiry: e.target.value })} /></label>
                <label>Next Service<input type="date" value={formData.nextService || ""} onChange={(e) => setFormData({ ...formData, nextService: e.target.value })} /></label>
              </div>
            </fieldset>
            <label>Notes<textarea value={formData.notes || ""} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Notes..." /></label>
            <button type="submit" className="fm-primary-button fm-submit-button">{editingId ? "Save Vehicle" : "Add Vehicle"}</button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(detailId)} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent className="fm-dialog fm-detail-dialog">
          {detailId && (() => {
            const vehicle = state.vehicles.find((item) => item.id === detailId);
            if (!vehicle) return null;
            const days = state.fleetDays.filter((day) => day.vehicleId === vehicle.id).sort((a, b) => b.date.localeCompare(a.date));
            const logs = state.logs.filter((log) => log.vehicleId === vehicle.id);
            const assignedDriver = state.drivers.find((driver) => driver.type === "Temporary" && driver.vehicleId === vehicle.id) || state.drivers.find((driver) => driver.vehicleIds?.includes(vehicle.id) || (driver.type !== "Temporary" && driver.vehicleId === vehicle.id));
            const revenue = logs.reduce((sum, log) => sum + log.amount, 0) + days.reduce((sum, day) => sum + day.amount, 0);
            const fuelCost = state.fuelRecords.filter((fuel) => fuel.vehicleId === vehicle.id).reduce((sum, fuel) => sum + fuel.cost, 0);
            return (
              <>
                <DialogHeader><DialogTitle>{vehicle.name}</DialogTitle></DialogHeader>
                <div className="fm-detail-subtitle">{vehicle.type} <span>•</span> {vehicle.regNumber}</div>
                <div className="fm-kpi-grid"><div><span>Revenue</span><strong>₹{revenue.toLocaleString("en-IN")}</strong></div><div><span>Fuel</span><strong>₹{fuelCost.toLocaleString("en-IN")}</strong></div><div><span>Days</span><strong>{days.length}</strong></div></div>
                <h3 className="fm-section-title">Daily work history</h3>
                <div className="fm-stack">
                  {days.length === 0 ? <p className="fm-muted">No daily entries yet.</p> : days.map((day) => <div className="fm-list-row" key={day.id}><div><strong>{day.date}</strong><small>{day.trips} trips • {day.hours} hours • {day.diesel} L diesel</small></div><div className="fm-list-value">₹{day.amount.toLocaleString("en-IN")}<span className={`fm-status ${statusClass(day.status)}`}>{day.status}</span></div></div>)}
                </div>
                 <div className="fm-detail-fields"><div><span>Current Site</span><strong>{vehicle.currentSite || "—"}</strong></div><div><span>Assigned Driver</span><strong>{assignedDriver?.name || "—"}</strong></div><div><span>Next Service</span><strong>{vehicle.nextService || "—"}</strong></div></div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}