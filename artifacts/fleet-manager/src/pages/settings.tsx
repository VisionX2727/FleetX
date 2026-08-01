import { Layout } from "@/components/layout";
import { useStore } from "@/lib/store";
import { useState } from "react";
import { useEffect } from "react";
import { LogOut, CheckCircle2, UserCircle, ImagePlus, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export default function Settings() {
  const { state, dispatch } = useStore();
  const { toast } = useToast();
  const { user, signingIn: authBusy, signOut } = useAuth();
  
  const [businessName, setBusinessName] = useState(state.settings.businessName);
  const [ownerName, setOwnerName] = useState(state.settings.ownerName || "");
  const [phone, setPhone] = useState(state.settings.phone || "");
  const [address, setAddress] = useState(state.settings.address || "");
  const [email, setEmail] = useState(state.settings.email || "");
  const [upiId, setUpiId] = useState(state.settings.upiId || "");
  const [bankName, setBankName] = useState(state.settings.bankName || "");
  const [gstNumber, setGstNumber] = useState(state.settings.gstNumber || "");

  useEffect(() => {
    setBusinessName(state.settings.businessName);
    setOwnerName(state.settings.ownerName || "");
    setPhone(state.settings.phone || "");
    setAddress(state.settings.address || "");
    setEmail(state.settings.email || "");
    setUpiId(state.settings.upiId || "");
    setBankName(state.settings.bankName || "");
    setGstNumber(state.settings.gstNumber || "");
  }, [state.settings]);
  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "Could not sign out", description: error.message });
    } else {
      toast({ title: "Signed out", description: "Your Google account data remains safely linked to your account." });
    }
  };

  const handleSave = () => {
    dispatch({ 
      type: 'UPDATE_SETTINGS', 
      payload: { businessName, ownerName, phone, address, email, upiId, bankName, gstNumber }
    });
    toast({
      title: "Settings Saved",
      description: "Business details have been updated."
    });
  };

  const handleLogo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => dispatch({ type: "UPDATE_SETTINGS", payload: { logoUrl: reader.result as string } });
    reader.readAsDataURL(file);
  };

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${businessName.replace(/\s+/g, "-").toLowerCase()}-fleet-backup.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const resetData = () => {
    if (!window.confirm("Reset all fleet records for this Google account? This cannot be undone.")) return;
    dispatch({ type: "RESET_DATA" });
    toast({ title: "Fleet records reset", description: "This account now has a fresh workspace." });
  };

  return (
    <Layout>
      <div className="pt-12 px-6 pb-6 bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <h1 className="text-3xl font-black tracking-tight">Settings</h1>
      </div>

      <div className="px-6 py-8 space-y-8 pb-24">
        
        <section className="bg-card rounded-2xl border border-border p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-border pb-4 mb-2">
            <UserCircle size={40} className="text-muted-foreground" />
            <div>
              <h3 className="font-bold text-lg">Admin Account</h3>
              <p className="text-sm text-muted-foreground">{user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email}</p>
              <p className="text-xs text-green-600 font-semibold mt-1">Google account workspace synced</p>
            </div>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold">Business Logo</div>
                <div className="text-xs text-muted-foreground">Used on the home screen and receipts</div>
              </div>
              {state.settings.logoUrl && <img src={state.settings.logoUrl} alt="Business logo" className="w-12 h-12 rounded-xl object-cover" />}
            </div>
            <label className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border p-3 text-sm font-bold cursor-pointer hover:bg-muted">
              <ImagePlus size={17} /> Change logo
              <input data-testid="input-business-logo" type="file" accept="image/*" onChange={handleLogo} className="sr-only" />
            </label>
          </div>
          
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Business Name</label>
            <input 
              value={businessName} 
              onChange={e => setBusinessName(e.target.value)} 
              className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" 
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">UPI ID for Payments</label>
            <input 
              value={upiId} 
              onChange={e => setUpiId(e.target.value)} 
              className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" 
              placeholder="e.g. 9876543210@ybl"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Owner / Company Name</label>
            <input value={ownerName} onChange={e => setOwnerName(e.target.value)} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="Your name or company" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Phone</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="Phone number" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="Email" />
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Business Address</label>
            <textarea value={address} onChange={e => setAddress(e.target.value)} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary min-h-20" placeholder="Address shown on receipts" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Bank Name</label>
              <input value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="Optional" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">GST Number</label>
              <input value={gstNumber} onChange={e => setGstNumber(e.target.value)} className="w-full bg-muted border-none rounded-xl p-4 font-semibold outline-none focus:ring-2 focus:ring-primary" placeholder="Optional" />
            </div>
          </div>
          <button 
            onClick={handleSave}
            className="w-full bg-foreground text-background font-bold p-4 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-transform"
          >
            <CheckCircle2 size={20} />
            Save Profile
          </button>
        </section>

        <section>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 pl-2">System Data</h3>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <span className="font-semibold">Export Data</span>
               <button onClick={exportData} className="text-primary font-bold text-sm flex items-center gap-1"><Download size={14} /> Download</button>
            </div>
            <div className="p-4 border-b border-border flex justify-between items-center">
              <span className="font-semibold">Clear Local Data</span>
               <button onClick={resetData} className="text-destructive font-bold text-sm flex items-center gap-1"><Trash2 size={14} /> Reset</button>
            </div>
          </div>
          <button
            data-testid="button-logout"
            type="button"
            disabled={authBusy}
            onClick={handleLogout}
            className="w-full border-2 border-destructive/20 text-destructive font-bold p-4 rounded-xl flex items-center justify-center gap-2 active:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut size={20} />
            {authBusy ? "Signing out..." : "Logout"}
          </button>
        </section>
        
      </div>
    </Layout>
  );
}
