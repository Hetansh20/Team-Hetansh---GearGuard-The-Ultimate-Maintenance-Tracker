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
