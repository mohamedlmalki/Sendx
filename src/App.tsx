import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import BulkImport from "./pages/BulkImport";
import SingleUserImport from "./pages/SingleUserImport";
import UserManagement from "./pages/UserManagement";
import Automation from "./pages/Automation"; // UPDATED: Import Automation
import NotFound from "./pages/NotFound";
import { AccountProvider } from "./contexts/AccountContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AccountProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<BulkImport />} />
              <Route path="/single-import" element={<SingleUserImport />} />
              <Route path="/users" element={<UserManagement />} />
              {/* UPDATED: Changed this route */}
              <Route path="/automation" element={<Automation />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AccountProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;