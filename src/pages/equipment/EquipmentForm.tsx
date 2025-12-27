"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUserRole } from "@/hooks/useUserRole"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { ArrowLeft, Save, AlertTriangle } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useEffect } from "react"

const equipmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  serial_number: z.string().min(1, "Serial number is required"),
  category_id: z.string().nullable(),
  assigned_team_id: z.string().nullable(),
  technician_id: z.string().nullable(),
  location: z.string().optional(),
  purchase_date: z.string().optional(),
  warranty_expiry: z.string().optional(),
  status: z.enum(["Active", "Scrapped"]),
  description: z.string().optional(),
})

export default function EquipmentForm() {
  const { organizationId, role } = useUserRole()
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = id && id !== "new"

  const form = useForm<z.infer<typeof equipmentSchema>>({
    resolver: zodResolver(equipmentSchema),
    defaultValues: {
      status: "Active",
      name: "",
      serial_number: "",
      category_id: null,
      assigned_team_id: null,
      technician_id: null,
    },
  })

  const { data: equipment, isLoading: isLoadingEquipment } = useQuery({
    queryKey: ["equipment-detail", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("equipment").select("*").eq("id", id).single()
      if (error) throw error
      form.reset(data)
      return data
    },
    enabled: isEditing,
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

  const { data: teams } = useQuery({
    queryKey: ["maintenance-teams", organizationId],
    queryFn: async () => {
      const { data } = await supabase.from("teams").select("id, name").eq("organization_id", organizationId)
      return data
    },
    enabled: !!organizationId,
  })

  const selectedTeamId = form.watch("assigned_team_id")
  const { data: technicians } = useQuery({
    queryKey: ["team-members", selectedTeamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select(`
          user_id,
          profiles (
            id,
            full_name
          )
        `)
        .eq("team_id", selectedTeamId)
      if (error) throw error
      return data
    },
    enabled: !!selectedTeamId,
  })

  useEffect(() => {
    if (equipment?.technician_id && technicians?.length) {
      form.setValue("technician_id", equipment.technician_id)
    }
  }, [technicians, equipment?.technician_id, form])

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof equipmentSchema>) => {
      const { description, ...rest } = values
      const payload = {
        ...rest,
        description: description || null,
        organization_id: organizationId,
      }

      if (isEditing) {
        const { error } = await supabase.from("equipment").update(payload).eq("id", id)
        if (error) throw error
      } else {
        const { error } = await supabase.from("equipment").insert([payload])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment"] })
      toast.success(`Equipment ${isEditing ? "updated" : "created"} successfully`)
      navigate("/dashboard/equipment")
    },
    onError: (error: any) => toast.error(error.message),
  })

  const isScrapped = form.watch("status") === "Scrapped"

  if (isEditing && isLoadingEquipment) return <div className="p-8 text-center italic">Loading asset details...</div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Button variant="ghost" className="gap-2" onClick={() => navigate("/dashboard/equipment")}>
          <ArrowLeft className="h-4 w-4" /> Back to Inventory
        </Button>
        <div className="flex gap-3">
          {(role === "admin" || role === "manager") && !isScrapped && (
            <Button onClick={form.handleSubmit((v) => mutation.mutate(v))} disabled={mutation.isPending}>
              <Save className="h-4 w-4 mr-2" /> {mutation.isPending ? "Saving..." : "Save Asset"}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {isEditing ? `Edit: ${equipment?.name}` : "New Equipment Asset"}
          </h2>
          <p className="text-muted-foreground">Manage company asset details and assignments.</p>
        </div>

        {isScrapped && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5" />
            <div>
              <p className="font-semibold">Asset Scrapped</p>
              <p className="text-sm opacity-90">
                This equipment is marked as scrapped and cannot be edited or assigned to new tasks.
              </p>
            </div>
          </div>
        )}

        <Form {...form}>
          <form className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipment Name</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isScrapped} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serial_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serial Number</FormLabel>
                        <FormControl>
                          <Input {...field} disabled={isScrapped} className="font-mono" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isScrapped}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Purchase Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={isScrapped} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="warranty_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Warranty Expiry</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} disabled={isScrapped} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Right Column */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location / Room</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. Building A, Floor 2" disabled={isScrapped} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="assigned_team_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Responsible Team</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined} disabled={isScrapped}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select Team" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teams?.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="technician_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred Technician</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value || "none"}
                          disabled={isScrapped || !selectedTeamId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={selectedTeamId ? "Select Technician" : "Select team first"} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {technicians?.map((m: any) => (
                              <SelectItem key={m.user_id} value={m.user_id}>
                                {m.profiles?.full_name || "Unknown Technician"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operational Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} disabled={isScrapped}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Active">Active</SelectItem>
                            <SelectItem value="Scrapped">Scrapped</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Technical Description / Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={4} disabled={isScrapped} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>
    </div>
  )
}
