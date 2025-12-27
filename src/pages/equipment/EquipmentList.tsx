"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUserRole } from "@/hooks/useUserRole"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, MapPin, Wrench } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

export default function EquipmentList() {
  const { organizationId, role } = useUserRole()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  const { data: equipment, isLoading } = useQuery({
    queryKey: ["equipment", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment")
        .select(`
          *, 
          category:equipment_categories(name), 
          assigned_team:teams(name), 
          technician:profiles(full_name)
        `)
        .eq("organization_id", organizationId)
      if (error) {
        console.error("[v0] Error fetching equipment:", error)
        throw error
      }
      return data
    },
    enabled: !!organizationId,
  })

  const { data: categories } = useQuery({
    queryKey: ["equipment-categories", organizationId],
    queryFn: async () => {
      const { data } = await supabase
        .from("equipment_categories")
        .select("id, name")
        .eq("organization_id", organizationId)
      return data
    },
    enabled: !!organizationId,
  })

  const filteredEquipment = equipment?.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "all" || e.category_id === categoryFilter
    const matchesStatus = statusFilter === "all" || e.status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Equipment Inventory</h2>
        {role === "admin" && (
          <Button onClick={() => navigate("/dashboard/equipment/new")} className="gap-2">
            <Plus className="h-4 w-4" /> New Equipment
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or serial..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Scrapped">Scrapped</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Equipment</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Assigned Team</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                  Loading inventory...
                </TableCell>
              </TableRow>
            ) : filteredEquipment?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No equipment found matching filters.
                </TableCell>
              </TableRow>
            ) : (
              filteredEquipment?.map((e) => (
                <TableRow
                  key={e.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50 transition-colors",
                    e.status === "Scrapped" && "opacity-60 bg-muted/20",
                  )}
                  onClick={() => {
                    if (role === "admin") {
                      navigate(`/dashboard/equipment/${e.id}`)
                    } else {
                      toast.info("Only administrators can edit equipment.")
                    }
                  }}
                >
                  <TableCell>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{e.serial_number}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {e.category?.name || "Uncategorized"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {e.location || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Wrench className="h-3 w-3 text-muted-foreground" />
                      {e.assigned_team?.name || "Unassigned"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={e.status === "Active" ? "default" : "secondary"}
                      className={cn(
                        e.status === "Active" ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {e.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
