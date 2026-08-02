import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { StoreProvider } from '@/lib/store';
import { AuthProvider, useAuth } from '@/lib/auth';

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
import splashLogo from '@assets/FleetX_1785676635299.jpeg';

const queryClient = new QueryClient();

function Router() {
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
      <Route component={NotFound} />
    </Switch>
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

function AuthenticatedShell() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="fm-splash-screen" aria-label="FleetX loading">
        <div className="fm-splash-logo-wrap">
          <img src={splashLogo} alt="FleetX logo" />
        </div>
        <div className="fm-splash-loading-line" aria-hidden="true" />
        <span className="fm-splash-loading-label">Loading...</span>
      </main>
    );
  }
  if (!user) return <Login />;

  return (
    <StoreProvider key={user.id} userId={user.id}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Router />
      </WouterRouter>
    </StoreProvider>
  );
}

export default App;
