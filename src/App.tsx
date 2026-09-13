import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";
import { WorkspaceProvider, useWorkspace } from "./store/workspace";
import AppLayout from "./layouts/AppLayout";
import { Loading, Empty } from "./components/ui";
import { FeedbackProvider, ErrorBoundary } from "./components/Feedback";
import { CommandPalette } from "./components/CommandPalette";
import { NetworkBanner } from "./components/NetworkBanner";
import { NotificationBridge } from "./notifications/NotificationBridge";
import { WorkflowBridge } from "./workflows/WorkflowBridge";
import { SimulationBridge } from "./services/simulation";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Landing = lazy(() => import("./pages/Landing"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Customers = lazy(() => import("./pages/Customers"));
const CustomerDetail = lazy(() => import("./pages/CustomerDetail"));
const Products = lazy(() => import("./pages/Products"));
const Inventory = lazy(() => import("./pages/Inventory"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderDetail = lazy(() => import("./pages/OrderDetail"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const Notifications = lazy(() => import("./pages/Notifications"));
const Activity = lazy(() => import("./pages/Activity"));
const Automation = lazy(() => import("./pages/Automation"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Team = lazy(() => import("./pages/Team"));
const Settings = lazy(() => import("./pages/Settings"));
function WorkspaceGate() {
  const { data } = useWorkspace();
  const location = useLocation();
  if (!data.settings[0].onboarded)
    return (
      <Navigate
        to={`/onboarding?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  return (
    <>
      <AppLayout />
      <CommandPalette />
      <NotificationBridge />
      <WorkflowBridge />
      <SimulationBridge />
    </>
  );
}
function RouteEffects() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const segment = location.pathname.split("/")[2];
    document.title = segment
      ? `${segment.charAt(0).toUpperCase() + segment.slice(1)} | NEXORA`
      : "NEXORA | Your intelligent workspace";
  }, [location.pathname]);
  return null;
}
export default function App() {
  return (
    <ErrorBoundary>
      <FeedbackProvider>
        <WorkspaceProvider>
          <BrowserRouter>
            <NetworkBanner />
            <RouteEffects />
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/app" element={<WorkspaceGate />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="customers/:id" element={<CustomerDetail />} />
                  <Route path="products" element={<Products />} />
                  <Route path="inventory" element={<Inventory />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/:id" element={<OrderDetail />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="invoices/:id" element={<InvoiceDetail />} />
                  <Route path="notifications" element={<Notifications />} />
                  <Route path="activity" element={<Activity />} />
                  <Route path="automation" element={<Automation />} />
                  <Route path="assistant" element={<Assistant />} />
                  <Route path="team" element={<Team />} />
                  <Route path="settings" element={<Settings />} />
                </Route>
                <Route
                  path="*"
                  element={
                    <Empty
                      title="Page not found"
                      description="The page may have moved, or the address may be incorrect."
                      action={
                        <Link className="btn primary" to="/app/dashboard">
                          Open workspace
                        </Link>
                      }
                    />
                  }
                />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </WorkspaceProvider>
      </FeedbackProvider>
    </ErrorBoundary>
  );
}
