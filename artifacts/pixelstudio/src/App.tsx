import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Layout & Pages
import { AppLayout } from "@/components/layout";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import ManageStaff from "@/pages/manage-staff";
import AllPayments from "@/pages/all-payments";
import StaffDashboard from "@/pages/staff-dashboard";
import NewClient from "@/pages/new-client";
import ClientRecords from "@/pages/client-records";
import InvoicePreview from "@/pages/invoice-preview";
import ClientGallery from "@/pages/client-gallery";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes mock cache
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/gallery/:id" component={ClientGallery} />
      
      {/* Protected Routes wrapped in Layout */}
      <Route path="/">
        <AppLayout>
          {/* Default redirect handled in layout, but let's mount nothing specific here */}
          <div />
        </AppLayout>
      </Route>
      
      <Route path="/admin">
        <AppLayout><AdminDashboard /></AppLayout>
      </Route>
      <Route path="/admin/staff">
        <AppLayout><ManageStaff /></AppLayout>
      </Route>
      <Route path="/admin/payments">
        <AppLayout><AllPayments /></AppLayout>
      </Route>
      
      <Route path="/staff">
        <AppLayout><StaffDashboard /></AppLayout>
      </Route>
      <Route path="/staff/clients/new">
        <AppLayout><NewClient /></AppLayout>
      </Route>
      <Route path="/staff/clients">
        <AppLayout><ClientRecords /></AppLayout>
      </Route>
      
      <Route path="/staff/clients/:id/invoice">
        <AppLayout><InvoicePreview /></AppLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
