"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUserRole } from "@/hooks/useUserRole"
import { useAuth } from "@/contexts/AuthContext"
import type { MaintenanceRequest, MaintenanceStatus } from "@/types/maintenance"
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Plus,
  MoreVertical,
  Clock,
  UserPlus,
  MessageSquare,
  ImageIcon,
  AlertTriangle,
  Lock,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { format, isBefore } from "date-fns"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const COLUMNS: MaintenanceStatus[] = ["New", "In Progress", "Repaired", "Scrap"]

interface KanbanCardProps {
  request: MaintenanceRequest
  isOverlay?: boolean
  canDrag: boolean
}

function KanbanCard({ request, isOverlay, canDrag }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: request.id,
    data: {
      type: "Card",
      request,
    },
    disabled: !canDrag,
  })

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  }

  const isOverdue =
    request.scheduled_date &&
    isBefore(new Date(request.scheduled_date), new Date()) &&
    request.status !== "Repaired" &&
    request.status !== "Scrap"

  const initials =
    request.assignee?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "?"

  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(request.assigned_team_id)

  const queryClient = useQueryClient()

  const { data: teams } = useQuery({
    queryKey: ["maintenance-teams", request.organization_id],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name").eq("organization_id", request.organization_id)
      return data
    },
  })

  const { data: technicians } = useQuery({
    queryKey: ["team-members", selectedTeamId],
    queryFn: async () => {
      const { data } = await supabase
        .from("team_members")
        .select(`user_id, profiles(id, full_name)`)
        .eq("team_id", selectedTeamId)
      return data
    },
    enabled: !!selectedTeamId,
  })

  const quickAssign = useMutation({
    mutationFn: async (techId: string | null) => {
      const { error } = await supabase
        .from("maintenance_requests")
        .update({ assigned_technician_id: techId })
        .eq("id", request.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests", "kanban"] })
      toast.success("Technician assigned")
    },
  })

  const cardContent = (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "kanban-card group relative",
        isDragging && "opacity-30",
        isOverlay && "cursor-grabbing shadow-lg rotate-1 scale-102",
        isOverdue && "border-l-4 border-l-destructive",
        !canDrag && "kanban-card-locked",
      )}
      {...attributes}
      {...(canDrag ? listeners : {})}
    >
      {isOverdue && <div className="overdue-strip" />}
      {!canDrag && (
        <div className="absolute top-2 right-2">
          <Lock className="h-3 w-3 text-slate-400" />
        </div>
      )}

      <div className="flex justify-between items-start mb-1">
        <div className="kanban-card-title">{request.title}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem className="text-xs" onSelect={() => setIsAssigning(true)}>
              <UserPlus className="mr-2 h-3.5 w-3.5" /> Quick Assign
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              <MessageSquare className="mr-2 h-3.5 w-3.5" /> Add Note
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs">
              <ImageIcon className="mr-2 h-3.5 w-3.5" /> Attach Image
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isAssigning && (
        <div className="mt-2 space-y-2 p-2 bg-slate-50 rounded-md border border-slate-200">
          <Select value={selectedTeamId || ""} onValueChange={setSelectedTeamId}>
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Select Team" />
            </SelectTrigger>
            <SelectContent>
              {teams?.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            onValueChange={(val) => {
              quickAssign.mutate(val === "none" ? null : val)
              setIsAssigning(false)
            }}
          >
            <SelectTrigger className="h-7 text-[10px]">
              <SelectValue placeholder="Select Technician" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unassigned</SelectItem>
              {technicians?.map((tech: any) => (
                <SelectItem key={tech.user_id} value={tech.user_id}>
                  {tech.profiles?.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="sm" className="w-full h-6 text-[10px]" onClick={() => setIsAssigning(false)}>
            Cancel
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        <Badge
          variant="secondary"
          className="text-[10px] px-2 py-0 h-5 font-medium bg-slate-100/80 text-slate-600 border-none rounded-full"
        >
          {request.equipment?.name}
        </Badge>
        <div
          className={cn(
            "text-[10px] font-bold uppercase tracking-wider",
            request.priority === "High" && "priority-high",
            request.priority === "Medium" && "priority-medium",
            request.priority === "Low" && "priority-low",
          )}
        >
          {request.priority === "High" && <AlertTriangle className="h-3 w-3" />}
          {request.priority}
        </div>
      </div>

      <div className="flex items-center justify-between mt-5 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-3 text-slate-400">
          {request.scheduled_date && (
            <div className="flex items-center gap-1.5 text-[10px] font-medium">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(request.scheduled_date), "MMM d")}
            </div>
          )}
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 uppercase tracking-tighter opacity-60">
            {request.type}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[80px]">
                    {request.assignee?.full_name?.split(" ")[0] || "Unassigned"}
                  </span>
                  <Avatar className="h-7 w-7 border-2 border-white shadow-sm ring-1 ring-slate-100">
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">{request.assignee?.full_name || "Unassigned"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )

  if (!canDrag && !isOverlay) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">You don't have permission to move this card</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return cardContent
}

function KanbanColumn({
  status,
  requests,
  organizationId,
  role,
  userId,
}: {
  status: MaintenanceStatus
  requests: MaintenanceRequest[]
  organizationId: string
  role: string | null
  userId: string | undefined
}) {
  const { setNodeRef } = useSortable({
    id: status,
    data: {
      type: "Column",
      status,
    },
  })

  const getCanDrag = (request: MaintenanceRequest): boolean => {
    // Admin and Manager can move anything
    if (role === "admin" || role === "manager") return true

    // Requester can't move cards
    if (role === "requester") return false

    // Technician rules
    if (role === "technician") {
      // Can move cards assigned to them
      if (request.assigned_technician_id === userId) return true
      // Can pick up unassigned cards from "New" if they're on the team
      if (request.status === "New" && !request.assigned_technician_id && request.assigned_team_id) {
        // Would need to check team membership, simplified here
        return true
      }
    }

    return false
  }

  return (
    <div className="kanban-column flex flex-col h-full">
      <div className="kanban-column-header">
        <div className="flex items-center gap-2">
          <span className="text-sm uppercase tracking-wider font-bold text-slate-500">{status}</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-slate-200/50 text-slate-600">
            {requests.length}
          </Badge>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div ref={setNodeRef} className="flex-1 p-2 overflow-y-auto min-h-[150px]">
        <SortableContext items={requests.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          {requests.map((request) => (
            <KanbanCard key={request.id} request={request} canDrag={getCanDrag(request)} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

export default function MaintenanceKanban() {
  const { organizationId, role } = useUserRole()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeRequest, setActiveRequest] = useState<MaintenanceRequest | null>(null)

  const [searchTerm, setSearchTerm] = useState("")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")

  // Transition Modals
  const [showDurationModal, setShowDurationModal] = useState(false)
  const [showScrapModal, setShowScrapModal] = useState(false)
  const [pendingTransition, setPendingTransition] = useState<{ id: string; targetStatus: MaintenanceStatus } | null>(
    null,
  )
  const [duration, setDuration] = useState("")
  const [workNotes, setWorkNotes] = useState("")
  const [scrapReason, setScrapReason] = useState("")

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["maintenance-requests", "kanban", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_requests")
        .select(`
          *,
          equipment:equipment_id(name, serial_number),
          assignee:assigned_technician_id(full_name),
          team:assigned_team_id(name)
        `)
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })

      if (error) throw error
      return data as MaintenanceRequest[]
    },
    enabled: !!organizationId,
  })

  const filteredRequests = requests.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.equipment?.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPriority = priorityFilter === "all" || r.priority === priorityFilter
    return matchesSearch && matchesPriority
  })

  useEffect(() => {
    if (!organizationId) return

    const channel = supabase
      .channel("kanban_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "maintenance_requests",
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log("[v0] Realtime update:", payload)

          // Reconcile optimistic UI if current user triggered change or notify if others did
          queryClient.invalidateQueries({ queryKey: ["maintenance-requests", "kanban"] })

          if (payload.eventType === "UPDATE") {
            const updatedReq = payload.new as MaintenanceRequest
            if (updatedReq.updated_by !== user?.id) {
              toast.info(`Request "${updatedReq.title}" was updated by another user`, {
                description: `Status changed to ${updatedReq.status}`,
                duration: 3000,
              })
            }
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId, queryClient])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const updateStatus = useMutation({
    mutationFn: async ({
      id,
      status,
      duration,
      note,
    }: { id: string; status: MaintenanceStatus; duration?: number; note?: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() }

      const currentReq = requests.find((r) => r.id === id)
      if (!currentReq) return

      if (status === "In Progress" && !currentReq.assigned_technician_id && role === "technician") {
        updates.assigned_technician_id = user?.id
        toast.success("Request assigned to you")
      }

      if (duration) updates.duration = duration

      const { error } = await supabase.from("maintenance_requests").update(updates).eq("id", id)

      if (error) throw error

      if (note) {
        const { error: logError } = await supabase.from("request_logs").insert({
          request_id: id,
          user_id: user?.id,
          action: `Status changed to ${status}`,
          notes: note,
          organization_id: organizationId,
        })
        if (logError) console.error("[v0] Failed to create log:", logError)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests", "kanban"] })
      toast.success("Status updated successfully")
    },
    onError: (err: any) => toast.error(`Failed to update: ${err.message}`),
  })

  const validateTransition = (
    current: MaintenanceStatus,
    target: MaintenanceStatus,
    request: MaintenanceRequest,
  ): { valid: boolean; reason?: string } => {
    // Admin and Manager can do anything
    if (role === "admin" || role === "manager") return { valid: true }

    // Requester cannot change status
    if (role === "requester") {
      return { valid: false, reason: "Requesters cannot change work order status" }
    }

    // Technician rules
    if (role === "technician") {
      // Must be assigned to the request (or picking up from New)
      if (current !== "New" && request.assigned_technician_id !== user?.id) {
        return { valid: false, reason: "You can only update requests assigned to you" }
      }

      // Allowed transitions
      if (current === "New" && target === "In Progress") return { valid: true }
      if (current === "In Progress" && (target === "Repaired" || target === "Scrap")) return { valid: true }

      return {
        valid: false,
        reason: `Cannot move from ${current} to ${target}. Follow proper workflow: New → In Progress → Repaired/Scrap`,
      }
    }

    return { valid: false, reason: "Invalid role" }
  }

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "Card") {
      setActiveRequest(event.active.data.current.request)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveRequest(null)

    if (!over) return

    const activeReq = active.data.current?.request as MaintenanceRequest
    const overId = over.id as string

    // Determine target status
    let targetStatus: MaintenanceStatus | null = null
    if (COLUMNS.includes(overId as MaintenanceStatus)) {
      targetStatus = overId as MaintenanceStatus
    } else {
      const overReq = requests.find((r) => r.id === overId)
      if (overReq) targetStatus = overReq.status
    }

    if (!targetStatus || targetStatus === activeReq.status) return

    const validation = validateTransition(activeReq.status, targetStatus, activeReq)
    if (!validation.valid) {
      toast.error(validation.reason || "This transition is not allowed")
      return
    }

    // Workflow requirements
    if (targetStatus === "Repaired") {
      setPendingTransition({ id: activeReq.id, targetStatus })
      setShowDurationModal(true)
      return
    }

    if (targetStatus === "Scrap") {
      setPendingTransition({ id: activeReq.id, targetStatus })
      setShowScrapModal(true)
      return
    }

    updateStatus.mutate({ id: activeReq.id, status: targetStatus })
  }

  const confirmDuration = () => {
    if (!pendingTransition) return
    const d = Number.parseInt(duration)
    if (isNaN(d) || d <= 0) {
      toast.error("Please enter a valid duration")
      return
    }
    updateStatus.mutate({
      id: pendingTransition.id,
      status: pendingTransition.targetStatus,
      duration: d,
      note: workNotes || "Request marked as repaired",
    })
    setShowDurationModal(false)
    setDuration("")
    setWorkNotes("")
    setPendingTransition(null)
  }

  const confirmScrap = () => {
    if (!pendingTransition || !scrapReason.trim()) {
      toast.error("Please provide a reason for scrapping")
      return
    }
    updateStatus.mutate({
      id: pendingTransition.id,
      status: pendingTransition.targetStatus,
      note: `Equipment scrapped. Reason: ${scrapReason}`,
    })
    setShowScrapModal(false)
    setScrapReason("")
    setPendingTransition(null)
  }

  if (isLoading) return <div className="p-8 text-center text-slate-500">Loading workspace...</div>

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6 px-1">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">Maintenance Ops</h2>
            <p className="text-sm text-slate-500 font-medium">Industrial workflow automation for service lifecycle</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="h-10 border-slate-200 text-slate-600 bg-white shadow-sm hover:bg-slate-50 transition-all px-4 rounded-lg"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["maintenance-requests", "kanban"] })}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
              Sync
            </Button>

            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search orders..."
                className="pl-10 h-10 w-[240px] lg:w-[320px] border-slate-200 bg-white shadow-sm focus-visible:ring-primary/20 rounded-lg transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-10 border-slate-200 text-slate-600 bg-white shadow-sm hover:bg-slate-50 transition-all px-4 rounded-lg"
                >
                  <Filter className="mr-2 h-4 w-4" /> Priority: {priorityFilter === "all" ? "All" : priorityFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPriorityFilter("all")}>All Priorities</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("High")}>High Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("Medium")}>Medium Priority</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPriorityFilter("Low")}>Low Priority</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/10 rounded-lg transition-all font-semibold"
            >
              <Plus className="mr-2 h-4 w-4" /> New Order
            </Button>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="kanban-board overflow-x-auto pb-4 -mx-1 px-1">
            {COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                organizationId={organizationId!}
                role={role}
                userId={user?.id}
                requests={filteredRequests.filter((r) => r.status === status)}
              />
            ))}
          </div>

          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({
                styles: {
                  active: {
                    opacity: "0.5",
                  },
                },
              }),
            }}
          >
            {activeRequest ? <KanbanCard request={activeRequest} isOverlay canDrag={true} /> : null}
          </DragOverlay>
        </DndContext>

        <Dialog open={showDurationModal} onOpenChange={setShowDurationModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                Complete Work Order
              </DialogTitle>
              <DialogDescription>
                Record the time spent and document the work performed before marking this request as repaired.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="duration">Actual Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g. 45"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Work Summary</Label>
                <Textarea
                  id="notes"
                  placeholder="What was done? Any parts replaced?"
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDurationModal(false)}>
                Cancel
              </Button>
              <Button onClick={confirmDuration} className="bg-green-600 hover:bg-green-700">
                Mark Repaired
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showScrapModal} onOpenChange={setShowScrapModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Confirm Equipment Scrap
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                This action will permanently retire the equipment and mark it as scrapped in the system. The equipment
                status will be automatically updated. This action is logged for audit purposes.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="rounded-md bg-destructive/10 p-3 border border-destructive/20">
                <p className="text-sm text-destructive font-medium">Warning: This action cannot be easily undone</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason for Scrap *</Label>
                <Textarea
                  id="reason"
                  placeholder="e.g. Component failure beyond economical repair, catastrophic damage, obsolete technology..."
                  value={scrapReason}
                  onChange={(e) => setScrapReason(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowScrapModal(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmScrap}>
                Confirm Scrap
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
