import React from "react"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import DashboardLayout from "@/components/layout/DashboardLayout"
import Auth from "./pages/Auth"
import Onboarding from "./pages/Onboarding"
import JoinOrganization from "./pages/JoinOrganization"
import Dashboard from "./pages/Dashboard"
import Team from "./pages/Team"
import EquipmentList from "./pages/equipment/EquipmentList"
import EquipmentForm from "./pages/equipment/EquipmentForm"
import Categories from "./pages/equipment/Categories"
import Teams from "./pages/equipment/Teams"
import MaintenanceList from "./pages/maintenance/MaintenanceList"
import MaintenanceForm from "./pages/maintenance/MaintenanceForm"
<<<<<<< HEAD
import MaintenanceKanban from "./pages/maintenance/MaintenanceKanban"
=======
>>>>>>> f3ac9b6db3aae1a0dda67e6f21dbf5fbbec4ca28
import NotFound from "./pages/NotFound"

const queryClient = new QueryClient()

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
                <Route path="/" element={<Navigate to="/auth" replace />} />
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
                  path="/dashboard/equipment"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <EquipmentList />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/equipment/:id"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <EquipmentForm />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/categories"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Categories />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/teams"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <Teams />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/maintenance"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <MaintenanceList />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
<<<<<<< HEAD
                  path="/dashboard/maintenance/kanban"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <MaintenanceKanban />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
=======
>>>>>>> f3ac9b6db3aae1a0dda67e6f21dbf5fbbec4ca28
                  path="/dashboard/maintenance/new"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <MaintenanceForm />
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/maintenance/:id"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <MaintenanceForm />
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
  )
}

export default App
