import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import PlatformLayout from "./components/PlatformLayout";
import Dashboard from "./pages/Dashboard";
import BpanRegistry from "./pages/BpanRegistry";
import BpanDetail from "./pages/BpanDetail";
import BpanRegister from "./pages/BpanRegister";
import Telemetry from "./pages/Telemetry";
import AiSoh from "./pages/AiSoh";
import Marketplace from "./pages/Marketplace";
import MarketplaceCreate from "./pages/MarketplaceCreate";
import MarketplaceDetail from "./pages/MarketplaceDetail";
import Logistics from "./pages/Logistics";
import EprCompliance from "./pages/EprCompliance";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import AiAssistant from "./pages/AiAssistant";
import Documents from "./pages/Documents";
import YieldVerification from "./pages/YieldVerification";
import ServiceHistory from "./pages/ServiceHistory";
import Home from "./pages/Home";
import DataIntegration from "./pages/DataIntegration";
import MqttFlowTester from "./pages/MqttFlowTester";
import DeviceProvisioning from "./pages/DeviceProvisioning";
import DemoMode from "./pages/DemoMode";
import GatewayDocs from "./pages/GatewayDocs";
import AdminUserManagement from "./pages/AdminUserManagement";
import PlatformSettings from "./pages/PlatformSettings";
import ComplianceDashboard from "./pages/ComplianceDashboard";
import EuBatteryPassport from "./pages/EuBatteryPassport";
import SuperAdmin from "./pages/SuperAdmin";
import WarrantyDashboard from "./pages/WarrantyDashboard";
import WarrantyRegister from "./pages/WarrantyRegister";
import WarrantyCheck from "./pages/WarrantyCheck";
import BulkOnboarding from "./pages/BulkOnboarding";
import CirculWiki from "./pages/CirculWiki";
import GettingStarted from "./pages/GettingStarted";
import AdminFeedbackReview from "./pages/AdminFeedbackReview";
import LaunchingSoon from "./pages/LaunchingSoon";
import AlertRules from "./pages/AlertRules";
import PaymentSuccess from "./pages/PaymentSuccess";
import MyOrders from "./pages/MyOrders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CookieConsent, { hasAnalyticsConsent, type ConsentLevel } from "./components/CookieConsent";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import DigitalTwin from "./pages/DigitalTwin";
import CarbonAccounting from "./pages/CarbonAccounting";
import FederatedLearning from "./pages/FederatedLearning";
import BlockchainAudit from "./pages/BlockchainAudit";
import DataSharing from "./pages/DataSharing";
import DeveloperPortal from "./pages/DeveloperPortal";
import AutonomousTriage from "./pages/AutonomousTriage";
import TriageQueue from "./pages/TriageQueue";
import PredictiveProcurement from "./pages/PredictiveProcurement";
import SolidStateBattery from "./pages/SolidStateBattery";
import ApiReference from "./pages/ApiReference";
import McpServer from "./pages/McpServer";
import HealthPortal from "./pages/HealthPortal";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/dashboard" component={() => <PlatformLayout><Dashboard /></PlatformLayout>} />
      <Route path="/batteries" component={() => <PlatformLayout><BpanRegistry /></PlatformLayout>} />
      <Route path="/batteries/register" component={() => <PlatformLayout><BpanRegister /></PlatformLayout>} />
      <Route path="/batteries/:bpan" component={() => <PlatformLayout><BpanDetail /></PlatformLayout>} />
      <Route path="/telemetry" component={() => <PlatformLayout><Telemetry /></PlatformLayout>} />
      <Route path="/ai-soh" component={() => <PlatformLayout><AiSoh /></PlatformLayout>} />
      <Route path="/marketplace" component={() => <PlatformLayout><Marketplace /></PlatformLayout>} />
      <Route path="/marketplace/create" component={() => <PlatformLayout><MarketplaceCreate /></PlatformLayout>} />
      <Route path="/marketplace/payment-success" component={PaymentSuccess} />
      <Route path="/marketplace/orders" component={() => <PlatformLayout><MyOrders /></PlatformLayout>} />
      <Route path="/marketplace/:id" component={() => <PlatformLayout><MarketplaceDetail /></PlatformLayout>} />
      <Route path="/logistics" component={() => <PlatformLayout><Logistics /></PlatformLayout>} />
      <Route path="/epr-compliance" component={() => <PlatformLayout><EprCompliance /></PlatformLayout>} />
      <Route path="/yield-verification" component={() => <PlatformLayout><YieldVerification /></PlatformLayout>} />
      <Route path="/service-history" component={() => <PlatformLayout><ServiceHistory /></PlatformLayout>} />
      <Route path="/analytics" component={() => <PlatformLayout><Analytics /></PlatformLayout>} />
      <Route path="/alerts" component={() => <PlatformLayout><Alerts /></PlatformLayout>} />
      <Route path="/alert-rules" component={() => <PlatformLayout><AlertRules /></PlatformLayout>} />
      <Route path="/assistant" component={() => <PlatformLayout><AiAssistant /></PlatformLayout>} />
      <Route path="/documents" component={() => <PlatformLayout><Documents /></PlatformLayout>} />
      <Route path="/data-integration" component={DataIntegration} />
      <Route path="/mqtt-flow-tester" component={MqttFlowTester} />
      <Route path="/device-provisioning" component={() => <PlatformLayout><DeviceProvisioning /></PlatformLayout>} />
      <Route path="/demo" component={() => <PlatformLayout><DemoMode /></PlatformLayout>} />
      <Route path="/gateway-docs" component={() => <PlatformLayout><GatewayDocs /></PlatformLayout>} />
      <Route path="/admin/users" component={() => <PlatformLayout><AdminUserManagement /></PlatformLayout>} />
      <Route path="/admin/system" component={() => <PlatformLayout><SuperAdmin /></PlatformLayout>} />
      <Route path="/admin/feedback" component={() => <PlatformLayout><AdminFeedbackReview /></PlatformLayout>} />
      <Route path="/settings/platform" component={() => <PlatformLayout><PlatformSettings /></PlatformLayout>} />
      <Route path="/compliance" component={() => <PlatformLayout><ComplianceDashboard /></PlatformLayout>} />
      {/* Warranty */}
      <Route path="/warranty" component={() => <PlatformLayout><WarrantyDashboard /></PlatformLayout>} />
      <Route path="/warranty/register" component={() => <PlatformLayout><WarrantyRegister /></PlatformLayout>} />
      <Route path="/warranty/check" component={WarrantyCheck} />
      {/* Bulk Onboarding */}
      <Route path="/onboarding" component={() => <PlatformLayout><BulkOnboarding /></PlatformLayout>} />
      {/* CirculWiki */}
      <Route path="/wiki" component={CirculWiki} />
      {/* Getting Started Tutorial */}
      <Route path="/getting-started" component={() => <PlatformLayout><GettingStarted /></PlatformLayout>} />
      {/* Marketing / pre-launch page kept for reference */}
      <Route path="/coming-soon" component={() => <LaunchingSoon onAccessGranted={() => {}} />} />
      {/* v2.0 Next-Gen Features */}
      <Route path="/digital-twin" component={() => <PlatformLayout><DigitalTwin /></PlatformLayout>} />
      <Route path="/carbon-accounting" component={() => <PlatformLayout><CarbonAccounting /></PlatformLayout>} />
      <Route path="/federated-learning" component={() => <PlatformLayout><FederatedLearning /></PlatformLayout>} />
      {/* v3.0 Next-Gen Features */}
      <Route path="/blockchain-audit" component={() => <PlatformLayout><BlockchainAudit /></PlatformLayout>} />
      <Route path="/data-sharing" component={() => <PlatformLayout><DataSharing /></PlatformLayout>} />
      <Route path="/developer-portal" component={() => <PlatformLayout><DeveloperPortal /></PlatformLayout>} />
      {/* v4.0 Next-Gen Features */}
      <Route path="/autonomous-triage" component={() => <PlatformLayout><AutonomousTriage /></PlatformLayout>} />
      <Route path="/autonomous-triage/queue" component={() => <PlatformLayout><TriageQueue /></PlatformLayout>} />
      <Route path="/predictive-procurement" component={() => <PlatformLayout><PredictiveProcurement /></PlatformLayout>} />
      <Route path="/solid-state" component={() => <PlatformLayout><SolidStateBattery /></PlatformLayout>} />
      {/* Developer & API pages */}
      <Route path="/api-reference" component={() => <PlatformLayout><ApiReference /></PlatformLayout>} />
      <Route path="/mcp-server" component={() => <PlatformLayout><McpServer /></PlatformLayout>} />
      {/* Health Portal */}
      <Route path="/health" component={() => <PlatformLayout><HealthPortal /></PlatformLayout>} />
      {/* Public legal pages */}
      <Route path="/privacy" component={Privacy} />
      <Route path="/terms" component={Terms} />
      {/* Public passport pages — no auth, no layout shell */}
      <Route path="/passport/EU/:localId" component={EuBatteryPassport} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [analyticsEnabled, setAnalyticsEnabled] = useState(hasAnalyticsConsent());

  // Gate the Umami analytics script on consent
  useEffect(() => {
    const handler = (e: Event) => {
      const level = (e as CustomEvent<{ level: ConsentLevel }>).detail.level;
      setAnalyticsEnabled(level === "all");
    };
    window.addEventListener("cookieConsentChange", handler);
    return () => window.removeEventListener("cookieConsentChange", handler);
  }, []);

  // Dynamically inject / remove the Umami analytics script based on consent
  useEffect(() => {
    const SCRIPT_ID = "umami-analytics";
    const existing = document.getElementById(SCRIPT_ID);
    if (analyticsEnabled) {
      if (!existing) {
        const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT;
        const websiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID;
        if (endpoint && websiteId) {
          const script = document.createElement("script");
          script.id = SCRIPT_ID;
          script.defer = true;
          script.src = `${endpoint}/umami`;
          script.dataset.websiteId = websiteId;
          document.head.appendChild(script);
        }
      }
    } else {
      existing?.remove();
    }
  }, [analyticsEnabled]);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable={true}>
        <TooltipProvider>
          <Toaster richColors position="top-right" />
          <Router />
          <CookieConsent onConsentChange={(level) => setAnalyticsEnabled(level === "all")} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
