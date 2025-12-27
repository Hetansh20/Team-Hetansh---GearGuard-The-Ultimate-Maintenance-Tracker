"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUserRole } from "@/hooks/useUserRole"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowLeft, Save, Trash2, Clock } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useEffect } from "react"

const requestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  equipment_id: z.string().min(1, "Equipment is required"),
  type: z.enum(["Corrective", "Preventive"]),
  priority: z.enum(["Low", "Medium", "High"]),
  status: z.enum(["New", "In Progress", "Repaired", "Scrap"]),
  assigned_team_id: z.string().nullable(),
  assigned_technician_id: z.string().nullable(),
  equipment_category_id: z.string().nullable(),
  scheduled_date: z.string().nullable().optional(),
  duration: z.coerce.number().min(0).optional(),
}).refine((data) => {
  if (data.type === "Preventive" && !data.scheduled_date) return false;
  return true;
}, {
  message: "Scheduled date is required for Preventive maintenance",
  path: ["scheduled_date"],
})

export default function MaintenanceForm() {
  const { organizationId, role } = useUserRole()
  const { user } = useAuth()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = id && id !== "new"

  const form = useForm<z.infer<typeof requestSchema>>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "Corrective",
      priority: "Medium",
      status: "New",
      assigned_team_id: null,
      assigned_technician_id: null,
      equipment_category_id: null,
    },
  })

  // Fetch Request Detail
  const { data: request, isLoading: isLoadingRequest } = useQuery({
    queryKey: ["maintenance-request", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("maintenance_requests")
        .select("*")
        .eq("id", id)
        .single()
      if (error) throw error
      form.reset({
        ...data,
        scheduled_date: data.scheduled_date ? new Date(data.scheduled_date).toISOString().slice(0, 16) : undefined
      } as any)
      return data
    },
    enabled: isEditing,
  })

  // Fetch Equipment
  const { data: equipmentList } = useQuery({
    queryKey: ["equipment-options", organizationId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("equipment")
        .select("id, name, serial_number, assigned_team_id, status, category_id, equipment_categories(id, name)")
        .eq("organization_id", organizationId)
      
      return data as any[]
    },
    enabled: !!organizationId,
  })

  const selectedEquipmentId = form.watch("equipment_id")
  const selectedEquipment = equipmentList?.find(e => e.id === selectedEquipmentId)

  // Auto-fill Logic
  useEffect(() => {
    if (selectedEquipment && !isEditing) {
      if (selectedEquipment.status === 'Scrapped' || selectedEquipment.status === 'Scrap') {
         toast.error("Cannot create request for Scrapped equipment")
         form.setValue("equipment_id", "")
         return
      }

      if (selectedEquipment.assigned_team_id) {
        form.setValue("assigned_team_id", selectedEquipment.assigned_team_id)
      }
      if (selectedEquipment.category_id) {
        form.setValue("equipment_category_id", selectedEquipment.category_id)
      }
    }
  }, [selectedEquipment, isEditing, form])

  // Fetch Teams
  const { data: teams } = useQuery({
    queryKey: ["maintenance-teams", organizationId],
    queryFn: async () => {
      const { data } = await (supabase as any).from("teams").select("id, name").eq("organization_id", organizationId)
      return data as any[]
    },
    enabled: !!organizationId,
  })

  // Fetch Technicians (Members of selected team)
  const selectedTeamId = form.watch("assigned_team_id")
  const { data: technicians } = useQuery({
    queryKey: ["team-members", selectedTeamId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("team_members")
        .select("user_id, profiles(id, full_name)")
        .eq("team_id", selectedTeamId)
      return data as any[]
    },
    enabled: !!selectedTeamId,
  })

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof requestSchema>) => {
      const { scheduled_date, duration, ...rest } = values
      
      const payload = {
        ...rest,
        // If empty string, send null for optional fields if DB expects it or rely on Zod coercion
        scheduled_date: scheduled_date || null,
        duration: duration || null,
        organization_id: organizationId,
        created_by: isEditing ? undefined : user?.id // Only set on create usually, but schema has it non-null
      }

      // If creating, ensure created_by is set.
      if (!isEditing && user?.id) {
        // @ts-ignore
        payload.created_by = user.id
      }
      
      if (isEditing) {
         // @ts-ignore
         delete payload.created_by // Don't update creator
         const { error } = await (supabase as any).from("maintenance_requests").update(payload).eq("id", id)
         if (error) throw error
      } else {
        const { error } = await (supabase as any).from("maintenance_requests").insert([payload])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-requests"] })
      toast.success(`Request ${isEditing ? "updated" : "created"}`)
      navigate("/dashboard/maintenance")
    },
    onError: (err: any) => toast.error(err.message),
  })

  if (isEditing && isLoadingRequest) return <div className="p-8">Loading...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/dashboard/maintenance")}>
          <ArrowLeft className="h-4 w-4" /> Back to Requests
        </Button>
        <div className="flex gap-2">
           {/* Only allow save if user has permission (handled by DB mostly, but UI check is good) */}
           <Button onClick={form.handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending}>
             <Save className="h-4 w-4 mr-2" /> Save Request
           </Button>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Request" : "New Maintenance Request"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g. Pump vibration excessive" 
                          {...field} 
                          disabled={role === 'technician' && isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="equipment_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipment</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value} 
                        disabled={isEditing} // Often safer to lock equipment on edit to avoid context shift
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Equipment" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {equipmentList?.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name} ({e.serial_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="space-y-2">
                   <FormLabel>Equipment Category</FormLabel>
                   <Input 
                     disabled 
                     value={selectedEquipment?.equipment_categories?.name || "Auto-filled"} 
                     placeholder="Category will appear here"
                     className="bg-muted"
                   />
                </div>

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={role === 'technician'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Low">Low</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="High">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          rows={3} 
                          {...field} 
                          disabled={role === 'technician' && isEditing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
               <CardTitle className="text-base">Assignment & Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="assigned_team_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Team</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined} disabled={role === 'requester'}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Team" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {teams?.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assigned_technician_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assigned Technician</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value || "none"}
                        disabled={!selectedTeamId || role === 'requester'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={selectedTeamId ? "Select Technician" : "Select team first"} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Unassigned</SelectItem>
                          {technicians?.map((m: any) => (
                            <SelectItem key={m.user_id} value={m.user_id}>
                              {m.profiles?.full_name || "Unknown"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      {/* @ts-ignore - name clash with zod schema potentially but mapped correctly */}
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={role === 'technician'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Corrective">Corrective</SelectItem>
                          <SelectItem value="Preventive">Preventive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                        disabled={role === 'requester'}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {/* Logic: 
                              - Manager/Admin: All statuses
                              - Technician: 
                                - New -> In Progress
                                - In Progress -> Repaired, Scrap
                                - Terminal (Repaired/Scrap) -> No changes (or maybe back to In Progress if mistake?)
                              - Requester: None (disabled)
                           */}
                           <SelectItem value="New">New</SelectItem>
                           
                           {(role === 'manager' || role === 'admin' || field.value === 'New' || field.value === 'In Progress') && (
                             <SelectItem value="In Progress">In Progress</SelectItem>
                           )}
                           
                           {(role === 'manager' || role === 'admin' || field.value === 'In Progress' || field.value === 'Repaired') && (
                             <SelectItem value="Repaired">Repaired</SelectItem>
                           )}

                           {(role === 'manager' || role === 'admin' || field.value === 'In Progress' || field.value === 'Scrap') && (
                             <SelectItem value="Scrap">Scrap (Equipment will be retired)</SelectItem>
                           )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduled_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scheduled Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="datetime-local" 
                          {...field} 
                          disabled={role === 'technician'}
                        />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          disabled={form.watch("status") !== "Repaired"}
                          placeholder="Enabled when Repaired"
                        />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  )
}
