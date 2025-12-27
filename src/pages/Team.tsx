import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  UserPlus, 
  Check, 
  X, 
  Clock, 
  Mail, 
  Shield, 
  Users, 
  Wrench,
  Clipboard,
  UserCog,
  Trash2
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface JoinRequest {
  id: string;
  user_id: string;
  requested_role: UserRole;
  status: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  };
}

interface TeamInvite {
  id: string;
  email: string;
  role: UserRole;
  status: string;
  created_at: string;
  expires_at: string;
}

const roleIcons: Record<UserRole, React.ReactNode> = {
  admin: <Shield className="h-4 w-4" />,
  manager: <UserCog className="h-4 w-4" />,
  technician: <Wrench className="h-4 w-4" />,
  requester: <Clipboard className="h-4 w-4" />,
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-primary/10 text-primary border-primary/20',
  technician: 'bg-green-500/10 text-green-600 border-green-500/20',
  requester: 'bg-muted text-muted-foreground border-border',
};

export default function Team() {
  const { user } = useAuth();
  const { role, organizationId } = useUserRole();
  const { toast } = useToast();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [invites, setInvites] = useState<TeamInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('requester');
  const [inviting, setInviting] = useState(false);

  const isAdmin = role === 'admin';

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      // Fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('user_roles')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id (
            full_name,
            email,
            avatar_url
          )
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: true });

      if (membersError) throw membersError;
      setMembers((membersData as any) || []);

      // Fetch join requests (admin only)
      if (isAdmin) {
        // First fetch the join requests
        const { data: requestsData, error: requestsError } = await supabase
          .from('organization_join_requests')
          .select(`
            id,
            user_id,
            requested_role,
            status,
            created_at
          `)
          .eq('organization_id', organizationId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (requestsError) throw requestsError;

        // Then fetch profile data for each request
        if (requestsData && requestsData.length > 0) {
          const userIds = requestsData.map(r => r.user_id);
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
          
          const requestsWithProfiles = requestsData.map(request => ({
            ...request,
            profiles: profilesMap.get(request.user_id) || { full_name: null, email: null }
          }));
          
          setJoinRequests(requestsWithProfiles as any);
        } else {
          setJoinRequests([]);
        }

        // Fetch pending invites
        const { data: invitesData, error: invitesError } = await supabase
          .from('team_invites')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (invitesError) throw invitesError;
        setInvites(invitesData || []);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (request: JoinRequest) => {
    if (!organizationId) return;
    
    setProcessingId(request.id);
    try {
      const { error } = await supabase.functions.invoke('manage-team', {
        body: {
          action: 'approve_request',
          request_id: request.id,
          user_id: request.user_id,
          organization_id: organizationId,
          role: request.requested_role,
        },
      });

      if (error) throw error;

      toast({
        title: 'Request approved',
        description: `${request.profiles?.full_name || request.profiles?.email} has been added to the team.`,
      });
      
      fetchData();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to approve request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (request: JoinRequest) => {
    setProcessingId(request.id);
    try {
      const { error } = await supabase
        .from('organization_join_requests')
        .update({ status: 'rejected' })
        .eq('id', request.id);

      if (error) throw error;

      toast({
        title: 'Request rejected',
        description: 'The join request has been rejected.',
      });
      
      setJoinRequests(prev => prev.filter(r => r.id !== request.id));
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to reject request.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleSendInvite = async () => {
    if (!organizationId || !user) return;
    
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setInviting(true);
    try {
      const { error } = await supabase
        .from('team_invites')
        .insert({
          organization_id: organizationId,
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          invited_by: user.id,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('An invite has already been sent to this email.');
        }
        throw error;
      }

      toast({
        title: 'Invite sent!',
        description: `Invitation sent to ${inviteEmail}.`,
      });

      setInviteEmail('');
      setInviteRole('requester');
      setInviteOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send invite.',
        variant: 'destructive',
      });
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    try {
      const { error } = await supabase
        .from('team_invites')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      toast({
        title: 'Invite cancelled',
        description: 'The invitation has been cancelled.',
      });

      setInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error: any) {
      console.error('Error deleting invite:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel invite.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Team Management</h2>
          <p className="text-muted-foreground">
            Manage your team members{isAdmin && ', invites, and join requests'}.
          </p>
        </div>

        {isAdmin && (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your organization.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as UserRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="requester">Requester</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSendInvite} disabled={inviting}>
                  {inviting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="members" className="space-y-4">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="h-4 w-4 mr-2" />
            Members ({members.length})
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="requests">
                <Clock className="h-4 w-4 mr-2" />
                Requests ({joinRequests.length})
              </TabsTrigger>
              <TabsTrigger value="invites">
                <Mail className="h-4 w-4 mr-2" />
                Invites ({invites.length})
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* Team Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>
                All members of your organization.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No team members yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.profiles?.full_name || 'Unnamed User'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.profiles?.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={roleColors[member.role]}>
                            {roleIcons[member.role]}
                            <span className="ml-1 capitalize">{member.role}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(member.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Join Requests Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Pending Join Requests</CardTitle>
                <CardDescription>
                  Users who have requested to join your organization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {joinRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No pending requests.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Requested Role</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {joinRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {request.profiles?.full_name || 'Unnamed User'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {request.profiles?.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={roleColors[request.requested_role]}>
                              {roleIcons[request.requested_role]}
                              <span className="ml-1 capitalize">{request.requested_role}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(request.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => handleApproveRequest(request)}
                                disabled={processingId === request.id}
                              >
                                {processingId === request.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleRejectRequest(request)}
                                disabled={processingId === request.id}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Pending Invites Tab (Admin only) */}
        {isAdmin && (
          <TabsContent value="invites">
            <Card>
              <CardHeader>
                <CardTitle>Pending Invitations</CardTitle>
                <CardDescription>
                  Invitations that have been sent but not yet accepted.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {invites.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No pending invitations.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invites.map((invite) => (
                        <TableRow key={invite.id}>
                          <TableCell className="font-medium">
                            {invite.email}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={roleColors[invite.role]}>
                              {roleIcons[invite.role]}
                              <span className="ml-1 capitalize">{invite.role}</span>
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invite.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(invite.expires_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteInvite(invite.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}