import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/layout/DashboardLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import JoinOrganization from "./pages/JoinOrganization";
import Dashboard from "./pages/Dashboard";
import Team from "./pages/Team";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/join-organization" element={<JoinOrganization />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Dashboard />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/team"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Team />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <div className="flex items-center justify-center h-64 text-muted-foreground">
                          <p>This section is coming soon</p>
                        </div>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

export default App;