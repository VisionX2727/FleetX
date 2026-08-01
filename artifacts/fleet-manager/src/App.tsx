import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { StoreProvider } from '@/lib/store';

import Home from '@/pages/home';
import Fleet from '@/pages/fleet';
import Logs from '@/pages/logs';
import Khata from '@/pages/khata';
import Fuel from '@/pages/fuel';
import Analytics from '@/pages/analytics';
import Drivers from '@/pages/drivers';
import Calculator from '@/pages/calculator';
import Settings from '@/pages/settings';

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <StoreProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </StoreProvider>
  );
}

export default App;
