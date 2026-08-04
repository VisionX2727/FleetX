import { Layout } from "@/components/layout";
import { useRole } from "@/lib/role";
import { useStore } from "@/lib/store";
import { DriverDocument } from "@/lib/workspace";
import { useAuth } from "@/lib/auth";
import { ArrowLeft, FileUp, LogOut, Save } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function DriverSettings() {
  const { state } = useStore();
  const { member, ownerSettings, availableVehicles = [], updateDriverProfile } = useRole();
  const { signOut } = useAuth();
  const profile = member?.profile;
  const [name, setName] = useState(profile?.name || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [address, setAddress] = useState(profile?.address || "");
  const [vehicleIds, setVehicleIds] = useState(profile?.vehicleIds || []);
  const [documents, setDocuments] = useState<DriverDocument[]>(profile?.documents || []);
  const [message, setMessage] = useState("");

  if (!profile) return null;
  const save = async () => {
    await updateDriverProfile({ ...profile, name, phone, address, vehicleIds, documents });
    setMessage("Driver profile saved.");
    window.setTimeout(() => window.location.reload(), 400);
  };
  const uploadDocument = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDocuments((current) => [...current, { id: `${Date.now()}`, name: file.name, type: file.type, dataUrl: String(reader.result), uploadedAt: new Date().toISOString().slice(0, 10) }]);
    reader.readAsDataURL(file);
  };

  return (
    <Layout>
      <div className="flex items-center justify-between bg-[#1b2d3c] px-5 py-4 sticky top-0 z-10 border-b border-border"><div className="flex items-center gap-2"><Link href="/" className="text-muted-foreground"><ArrowLeft size={22} /></Link><h1 className="text-2xl font-black">Settings</h1></div><button type="button" onClick={() => void save()} className="rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground"><Save size={16} className="mr-1 inline" />Save</button></div>
      <main className="space-y-3 px-3 py-5 pb-8">
        <section className="fm-settings-card"><div className="fm-settings-section-title">Owner Branding</div><div className="mt-3 flex items-center gap-3">{ownerSettings?.logoUrl ? <img src={ownerSettings.logoUrl} alt="Owner logo" className="h-16 w-16 rounded-full object-cover" /> : <div className="fm-settings-logo-placeholder text-sm">OF</div>}<div><strong>{ownerSettings?.companyName || ownerSettings?.businessName || "Owner Fleet"}</strong><p className="text-xs text-muted-foreground">{ownerSettings?.ownerName || "Owner"}</p></div></div><p className="mt-3 text-xs text-muted-foreground">Owner logo and company name are managed by the owner and cannot be changed here.</p></section>
        <section className="fm-settings-card space-y-3"><div className="fm-settings-section-title">My Details</div><label className="fm-settings-label">Name<input value={name} onChange={(event) => setName(event.target.value)} /></label><label className="fm-settings-label">Mobile Number<input value={phone} onChange={(event) => setPhone(event.target.value)} /></label><label className="fm-settings-label">Address<textarea value={address} onChange={(event) => setAddress(event.target.value)} /></label></section>
        <section className="fm-settings-card space-y-3"><div className="fm-settings-section-title">My Vehicles</div><p className="text-xs text-muted-foreground">Select only vehicles you work with. You cannot access other vehicles.</p>{availableVehicles.length ? availableVehicles.map((vehicle) => <label key={vehicle.id} className="flex items-center gap-3 rounded-xl bg-muted p-3 text-sm font-bold"><input type="checkbox" checked={vehicleIds.includes(vehicle.id)} onChange={(event) => setVehicleIds((current) => event.target.checked ? [...new Set([...current, vehicle.id])] : current.filter((id) => id !== vehicle.id))} />{vehicle.name} <span className="ml-auto text-xs text-muted-foreground">{vehicle.type}</span></label>) : <p className="text-sm text-muted-foreground">The owner has not added vehicles yet.</p>}</section>
        <section className="fm-settings-card space-y-3"><div className="fm-settings-section-title">Optional Documents</div><label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm font-bold text-primary"><FileUp size={17} /> Upload license or document<input type="file" accept="image/*,.pdf" onChange={uploadDocument} className="sr-only" /></label>{documents.map((document) => <div key={document.id} className="flex items-center justify-between rounded-xl bg-muted p-3 text-xs"><span className="truncate">{document.name}</span><span className="text-muted-foreground">{document.uploadedAt}</span></div>)}</section>
        {message && <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">{message}</p>}
        <button type="button" onClick={() => void signOut()} className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/40 p-3 font-bold text-rose-300"><LogOut size={17} /> Logout</button>
        <div className="pb-3 pt-4 text-center text-xs font-semibold tracking-wide text-muted-foreground opacity-40">App made by Mandar</div>
      </main>
    </Layout>
  );
}