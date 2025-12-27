"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUserRole } from "@/hooks/useUserRole"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Wrench, Calendar, Clock, AlertTriangle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { MaintenanceStatus, MaintenancePriority } from "@/types/maintenance"

export default function MaintenanceList() {
  const { organizationId, role } = useUserRole()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const { user } = useAuth()

  const { data: requests, isLoading } = useQuery({
    queryKey: ["maintenance-requests", organizationId, role],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_requests")
        .select(`
          *,
          equipment:equipment_id(name, serial_number),
          assignee:assigned_technician_id(full_name),
          team:assigned_team_id(name),
          category:equipment_category_id(name)
        `)
        .eq("organization_id", organizationId)

      if (role !== 'admin' && role !== 'manager' && user?.id) {
        query = query.or(`assigned_technician_id.eq.${user.id},created_by.eq.${user.id}`)
      }
      
      const { data, error } = await query.order("created_at", { ascending: false })
      
      if (error) throw error
      return data as any[]
    },
    enabled: !!organizationId && !!user,
  })

  const filteredRequests = requests?.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.equipment?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.equipment?.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || r.status === statusFilter
    const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter
    const matchesType = typeFilter === "all" || r.type === typeFilter
    const matchesAssignee = assigneeFilter === "all" || (assigneeFilter === "mine" && r.assigned_technician_id === user?.id)
    return matchesSearch && matchesStatus && matchesPriority && matchesType && matchesAssignee
  })

  const getStatusColor = (status: MaintenanceStatus) => {
    switch (status) {
      case "New": return "bg-blue-100 text-blue-800 border-blue-200"
      case "In Progress": return "bg-amber-100 text-amber-800 border-amber-200"
      case "Repaired": return "bg-green-100 text-green-800 border-green-200"
      case "Scrap": return "bg-destructive/10 text-destructive border-destructive/20"
      default: return "bg-slate-100 text-slate-800"
    }
  }

  const getPriorityColor = (priority: MaintenancePriority) => {
    switch (priority) {
      case "High": return "text-destructive font-medium"
      case "Medium": return "text-amber-600"
      case "Low": return "text-slate-600"
      default: return ""
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Maintenance Requests</h2>
        <Button onClick={() => navigate("/dashboard/maintenance/new")} className="gap-2">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, equipment or serial..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="New">New</SelectItem>
              <SelectItem value="In Progress">In Progress</SelectItem>
              <SelectItem value="Repaired">Repaired</SelectItem>
              <SelectItem value="Scrap">Scrap</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Corrective">Corrective</SelectItem>
              <SelectItem value="Preventive">Preventive</SelectItem>
            </SelectContent>

          </Select>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
             <SelectTrigger className="w-[150px]">
               <SelectValue placeholder="Assignee" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Requests</SelectItem>
               <SelectItem value="mine">My Work Orders</SelectItem>
             </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Request</TableHead>
              <TableHead>Equipment</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Scheduled</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground italic">
                  Loading requests...
                </TableCell>
              </TableRow>
            ) : filteredRequests?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No maintenance requests found.
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests?.map((r) => (
                <TableRow
                  key={r.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/dashboard/maintenance/${r.id}`)}
                >
                  <TableCell>
                    <div className="font-semibold">{r.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                    {r.type === 'Corrective' && <Badge variant="outline" className="mt-1 text-[10px] h-5">Corrective</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{r.equipment?.name || "Unknown Equipment"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{r.equipment?.serial_number}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal text-xs">
                       {r.category?.name || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      {r.team && (
                        <div className="flex items-center gap-1.5">
                          <Wrench className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs">{r.team.name}</span>
                        </div>
                      )}
                      {r.assignee && (
                        <div className="text-xs text-muted-foreground pl-4.5">
                          {r.assignee.full_name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={cn("flex items-center gap-1.5", getPriorityColor(r.priority as MaintenancePriority))}>
                      {r.priority === 'High' && <AlertTriangle className="h-3.5 w-3.5" />}
                      {r.priority}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("font-normal border-0", getStatusColor(r.status as MaintenanceStatus))}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {r.scheduled_date ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(r.scheduled_date), "MMM d, yyyy")}
                        </div>
                        {r.duration && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {r.duration}h
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
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
