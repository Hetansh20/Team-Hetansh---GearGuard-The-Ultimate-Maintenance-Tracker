"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useUserRole } from "@/hooks/useUserRole"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Search, Edit2, Users } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

const teamSchema = z.object({
  name: z.string().min(1, "Name is required"),
  member_ids: z.array(z.string()).default([]),
})

export default function Teams() {
  const { organizationId, role } = useUserRole()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTeam, setEditingTeam] = useState<any>(null)

  const form = useForm<z.infer<typeof teamSchema>>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: "", member_ids: [] },
  })

  const { data: teams, isLoading } = useQuery({
    queryKey: ["maintenance-teams", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(`*, team_members(user_id)`)
        .eq("organization_id", organizationId)
      if (error) throw error
      return data
    },
    enabled: !!organizationId,
  })

  const { data: technicians } = useQuery({
    queryKey: ["org-technicians", organizationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("organization_id", organizationId)
      // In a real app, we'd filter by role join, but profiles here represent all org users
      if (error) throw error
      return data
    },
    enabled: !!organizationId,
  })

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof teamSchema>) => {
      let teamId = editingTeam?.id

      if (editingTeam) {
        await supabase.from("teams").update({ name: values.name }).eq("id", teamId)
        // Clear and re-add members
        await supabase.from("team_members").delete().eq("team_id", teamId)
      } else {
        const { data, error } = await supabase
          .from("teams")
          .insert([{ name: values.name, organization_id: organizationId }])
          .select()
          .single()
        if (error) throw error
        teamId = data.id
      }

      if (values.member_ids.length > 0) {
        const membersToInsert = values.member_ids.map((uid) => ({
          team_id: teamId,
          user_id: uid,
          organization_id: organizationId,
        }))
        const { error: memberError } = await supabase.from("team_members").insert(membersToInsert)
        if (memberError) throw memberError
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenance-teams"] })
      toast.success(`Team ${editingTeam ? "updated" : "created"} successfully`)
      setIsDialogOpen(false)
      setEditingTeam(null)
      form.reset()
    },
    onError: (error: any) => {
      toast.error(error.message || "Something went wrong")
    },
  })

  const filteredTeams = teams?.filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Maintenance Teams</h2>
        {(role === "admin" || role === "manager") && (
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open)
              if (!open) {
                setEditingTeam(null)
                form.reset()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> New Team
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingTeam ? "Edit Team" : "Create New Team"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Team Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., Electrical Maintenance" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="space-y-4">
                    <FormLabel>Team Members</FormLabel>
                    <div className="grid grid-cols-2 gap-4 border rounded-md p-4 max-h-60 overflow-y-auto">
                      {technicians?.map((tech) => (
                        <div key={tech.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={tech.id}
                            checked={form.watch("member_ids")?.includes(tech.id)}
                            onCheckedChange={(checked) => {
                              const current = form.getValues("member_ids")
                              if (checked) {
                                form.setValue("member_ids", [...current, tech.id])
                              } else {
                                form.setValue(
                                  "member_ids",
                                  current.filter((id) => id !== tech.id),
                                )
                              }
                            }}
                          />
                          <label htmlFor={tech.id} className="text-sm cursor-pointer">
                            {tech.full_name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? "Saving..." : "Save Team"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search teams..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Team Name</TableHead>
              <TableHead>Members Count</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredTeams?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-8">
                  No teams found.
                </TableCell>
              </TableRow>
            ) : (
              filteredTeams?.map((team) => (
                <TableRow key={team.id}>
                  <TableCell className="font-medium">{team.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      {team.team_members?.length || 0} members
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {(role === "admin" || role === "manager") && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTeam(team)
                            form.reset({
                              name: team.name,
                              member_ids: team.team_members.map((m: any) => m.user_id),
                            })
                            setIsDialogOpen(true)
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
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
