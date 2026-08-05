import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { StoreProvider, getLocalState, type AppState } from '@/lib/store';
import { AuthProvider, useAuth } from '@/lib/auth';
import { getWorkspace, createOwnerWorkspace, joinOwnerWorkspace, type WorkspaceResponse } from '@/lib/workspace';
import { RoleProvider, type WorkspaceRole } from '@/lib/role';
import { useCallback, useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import Home from '@/pages/home';
import Fleet from '@/pages/fleet';
import Logs from '@/pages/logs';
import Khata from '@/pages/khata';
import Fuel from '@/pages/fuel';
import Analytics from '@/pages/analytics';
import Drivers from '@/pages/drivers';
import Calculator from '@/pages/calculator';
import Settings from '@/pages/settings';
import Login from '@/pages/login';
import Notes from '@/pages/notes';
import DriverHome from '@/pages/driver-home';
import DriverSettings from '@/pages/driver-settings';
import DriverInvoices from '@/pages/driver-invoices';
import DriverMaintenance from '@/pages/driver-maintenance';
import Maintenance from '@/pages/maintenance';
import DriverPayments from '@/pages/driver-payments';
import splashLogo from '@assets/FleetX_1785676635299.jpeg';

const queryClient = new QueryClient();

function Router({ role }: { role: 'owner' | 'driver' }) {
  if (role === 'driver') {
    return (
      <Switch>
        <Route path="/" component={DriverHome} />
        <Route path="/logs" component={Logs} />
        <Route path="/fuel" component={Fuel} />
        <Route path="/calculator" component={Calculator} />
        <Route path="/notes" component={Notes} />
        <Route path="/maintenance" component={DriverMaintenance} />
        <Route path="/invoices" component={DriverInvoices} />
        <Route path="/payments" component={DriverPayments} />
        <Route path="/settings" component={DriverSettings} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/fleet" component={Fleet} />
      <Route path="/logs" component={Logs} />
      <Route path="/khata" component={Khata} />
      <Route path="/fuel" component={Fuel} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/drivers" component={Drivers} />
      <Route path="/calculator" component={Calculator} />
      <Route path="/settings" component={Settings} />
      <Route path="/notes" component={Notes} />
      <Route path="/maintenance" component={Maintenance} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Splash({ label = 'Loading...' }: { label?: string }) {
  return (
    <main className="fm-splash-screen" aria-label="FleetX loading">
      <div className="fm-splash-logo-wrap"><img src={splashLogo} alt="FleetX logo" /></div>
      <div className="fm-splash-loading-line" aria-hidden="true" />
      <span className="fm-splash-loading-label">{label}</span>
    </main>
  );
}

function RoleSelection({
  userId,
  accessToken,
  onReady,
}: {
  userId: string;
  accessToken: string;
  onReady: (workspace: WorkspaceResponse) => void;
}) {
  const { signOut } = useAuth();
  const [driverJoinOpen, setDriverJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [ownerBusy, setOwnerBusy] = useState(false);
  const [driverBusy, setDriverBusy] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    phone: '',
    address: '',
    vehicleIds: [] as string[],
    documents: [],
  });

  const selectOwner = async () => {
    try {
      setError('');
      setOwnerBusy(true);
      const createdWorkspace = await createOwnerWorkspace(accessToken);
      // Keep any records entered before Google sign-in, but only sync them
      // after the server has established the canonical owner workspace.
      onReady({ ...createdWorkspace, state: getLocalState(userId) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the owner workspace');
    } finally {
      setOwnerBusy(false);
    }
  };

  const joinDriver = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      setError('');
      setDriverBusy(true);
      onReady(await joinOwnerWorkspace(accessToken, joinCode, profile));
      setDriverJoinOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not join the owner workspace');
    } finally {
      setDriverBusy(false);
    }
  };

  const backToSignIn = async () => {
    await signOut();
  };

  return (
    <main className="min-h-[100dvh] bg-background px-5 py-10 text-foreground">
      <div className="mx-auto flex min-h-[80dvh] w-full max-w-md flex-col justify-center">
        <div className="mb-8 text-center">
          <img src={splashLogo} alt="FleetX logo" className="fm-login-logo" />
          <h1 className="text-3xl font-black">Choose your FleetX workspace</h1>
          <p className="mt-2 text-sm text-muted-foreground">Select how you use this account.</p>
        </div>
        <div className="grid gap-4">
          <button type="button" onClick={() => void selectOwner()} disabled={ownerBusy} className="rounded-2xl bg-primary p-5 text-left font-black text-primary-foreground disabled:cursor-wait disabled:opacity-70">
            <span className="block text-xl">Owner</span>
            <span className="mt-1 block text-sm font-medium opacity-80">{ownerBusy ? 'Creating your secure workspace…' : 'Manage vehicles, customers, drivers, payments and reports.'}</span>
          </button>
          <button type="button" onClick={() => setDriverJoinOpen(true)} className="rounded-2xl border border-border bg-card p-5 text-left font-black">
            <span className="block text-xl">Driver</span>
            <span className="mt-1 block text-sm font-medium text-muted-foreground">Join an owner using their FleetX code.</span>
          </button>
        </div>
        {error && (
          <div className="mt-4 space-y-3">
            <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setError('')}
                className="flex-1 rounded-xl border border-border bg-card p-3 text-sm font-bold"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => void backToSignIn()}
                className="flex-1 rounded-xl border border-primary/40 bg-primary/10 p-3 text-sm font-bold text-primary"
              >
                Back to sign in
              </button>
            </div>
          </div>
        )}
        {!error && (
          <button
            type="button"
            onClick={() => void backToSignIn()}
            className="mt-5 w-full rounded-xl border border-border bg-card/60 p-3 text-sm font-bold text-muted-foreground"
          >
            Back to sign in / switch account
          </button>
        )}
      </div>
      <Dialog open={driverJoinOpen} onOpenChange={setDriverJoinOpen}>
        <DialogContent className="w-[90vw] max-w-md rounded-2xl">
          <DialogHeader><DialogTitle>Join as Driver</DialogTitle></DialogHeader>
           <form onSubmit={joinDriver} className="space-y-4 pt-3">
            <p className="text-sm text-muted-foreground">Enter the owner code. You will choose your permitted vehicle after joining.</p>
            <input required value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="Owner code" className="w-full rounded-xl bg-muted p-4 font-black tracking-[0.2em] outline-none" />
            <input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Your name" className="w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
            <input required type="tel" value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} placeholder="Mobile number" className="w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
            <textarea value={profile.address} onChange={(event) => setProfile({ ...profile, address: event.target.value })} placeholder="Address (optional)" className="w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
             {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{error}</p>}
             <button type="submit" disabled={driverBusy} className="w-full rounded-xl bg-primary p-4 font-black text-primary-foreground disabled:cursor-wait disabled:opacity-70">{driverBusy ? 'Checking owner code…' : 'Join Owner Workspace'}</button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function AuthenticatedShell() {
  const { user, session, loading, signOut } = useAuth();
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState('');

  useEffect(() => {
    if (!user || !session) {
      setWorkspace(null);
      return;
    }
    setWorkspaceLoading(true);
    setWorkspaceError('');
    let cancelled = false;
    const loadWorkspace = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const latest = await getWorkspace(session.access_token);
          if (!cancelled) setWorkspace(latest);
          return;
        } catch (cause) {
          lastError = cause;
          if (attempt < 2) await new Promise((resolve) => window.setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
      if (!cancelled) setWorkspaceError(lastError instanceof Error ? lastError.message : 'Could not load workspace');
    };
    void loadWorkspace()
      .finally(() => setWorkspaceLoading(false));
    return () => { cancelled = true; };
  }, [user, session]);

  const refreshWorkspace = useCallback(async () => {
    if (!session) return;
    const latest = await getWorkspace(session.access_token);
    setWorkspace(latest);
  }, [session]);

  if (loading) return <Splash />;
  if (!user || !session) return <Login />;
  if (workspaceLoading) return <Splash label="Preparing workspace..." />;
  if (workspaceError) {
    return (
      <main className="fm-splash-screen px-6 text-center">
        <div className="fm-splash-logo-wrap"><img src={splashLogo} alt="FleetX logo" /></div>
        <p className="max-w-sm text-sm font-semibold text-destructive">{workspaceError}</p>
        <div className="mt-4 flex w-full max-w-sm gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="flex-1 rounded-xl border border-border bg-card p-3 text-sm font-bold"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex-1 rounded-xl bg-primary p-3 text-sm font-bold text-primary-foreground"
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }
  if (!workspace) return <Splash label="Preparing workspace..." />;
  if (!workspace.role) {
    return <RoleSelection userId={user.id} accessToken={session.access_token} onReady={setWorkspace} />;
  }
  if (workspace.role === "blocked" || workspace.role === "removed") {
    return <DriverAccessStatus status={workspace.role} userId={user.id} accessToken={session.access_token} member={workspace.member} onReady={setWorkspace} />;
  }

  const role = workspace.role;
  const roleValue: WorkspaceRole = {
    role,
    ownerUserId: workspace.ownerUserId,
    inviteCode: workspace.inviteCode,
    member: workspace.member,
    ownerSettings: workspace.ownerSettings,
    availableVehicles: workspace.availableVehicles,
    invoices: workspace.invoices,
    members: workspace.members,
    session,
    refreshWorkspace,
  };

  return (
    <RoleProvider value={roleValue}>
      <StoreProvider
        key={`${user.id}-${role}`}
        userId={user.id}
        role={role}
        accessToken={session.access_token}
        remoteState={workspace.state as AppState}
      >
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router role={role} />
        </WouterRouter>
      </StoreProvider>
    </RoleProvider>
  );
}

function DriverAccessStatus({
  status,
  userId,
  accessToken,
  member,
  onReady,
}: {
  status: "blocked" | "removed";
  userId: string;
  accessToken: string;
  member?: WorkspaceResponse["member"];
  onReady: (workspace: WorkspaceResponse) => void;
}) {
  const { signOut } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState(member?.profile.name || "");
  const [phone, setPhone] = useState(member?.profile.phone || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const rejoin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onReady(await joinOwnerWorkspace(accessToken, code, { name, phone, address: member?.profile.address || "", vehicleIds: member?.profile.vehicleIds || [], documents: member?.profile.documents || [] }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not join the owner workspace");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="min-h-[100dvh] bg-background px-5 py-10 text-foreground">
      <div className="mx-auto flex min-h-[80dvh] w-full max-w-md flex-col justify-center text-center">
        <img src={splashLogo} alt="FleetX logo" className="fm-login-logo mx-auto" />
        <h1 className="mt-6 text-3xl font-black">{status === "blocked" ? "Owner blocked you" : "Owner removed you"}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{status === "blocked" ? "Your previous logs and payment history are safe. Ask the owner to unblock you to continue." : "You can join an owner again with a valid FleetX code."}</p>
        {status === "removed" && <form onSubmit={rejoin} className="mt-6 space-y-3 text-left">
          <input required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Owner FleetX code" className="w-full rounded-xl bg-muted p-4 font-black tracking-[0.2em] outline-none" />
          <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" className="w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
          <input required type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Mobile number" className="w-full rounded-xl bg-muted p-4 font-semibold outline-none" />
          {error && <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <button disabled={busy} type="submit" className="w-full rounded-xl bg-primary p-4 font-black text-primary-foreground">{busy ? "Joining..." : "Join Owner Again"}</button>
        </form>}
        <button type="button" onClick={() => void signOut()} className="mt-4 w-full rounded-xl border border-border bg-card p-3 text-sm font-bold">Back to sign in / switch account</button>
      </div>
    </main>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthenticatedShell />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;