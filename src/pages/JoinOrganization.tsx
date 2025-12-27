import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search, Building2, Clock, CheckCircle, XCircle } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
}

interface JoinRequest {
  id: string;
  organization_id: string;
  status: string;
  created_at: string;
  organizations?: { name: string };
}

export default function JoinOrganization() {
  const { user, loading: authLoading } = useAuth();
  const { organizationId, loading: roleLoading, refetch } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pendingRequests, setPendingRequests] = useState<JoinRequest[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!authLoading && !roleLoading && user && organizationId) {
      navigate('/dashboard');
    }
  }, [user, authLoading, roleLoading, organizationId, navigate]);

  useEffect(() => {
    if (user) {
      fetchPendingRequests();
    }
  }, [user]);

  const fetchPendingRequests = async () => {
    if (!user) return;
    
    setLoadingRequests(true);
    try {
      const { data, error } = await supabase
        .from('organization_join_requests')
        .select('id, organization_id, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch organization names separately
      if (data && data.length > 0) {
        const orgIds = [...new Set(data.map(r => r.organization_id))];
        const { data: orgs } = await supabase
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);

        const orgMap = new Map(orgs?.map(o => [o.id, o.name]) || []);
        const enrichedRequests = data.map(r => ({
          ...r,
          organizations: { name: orgMap.get(r.organization_id) || 'Unknown' }
        }));
        setPendingRequests(enrichedRequests);
      } else {
        setPendingRequests([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoadingRequests(false);
    }
  };

  const searchOrganizations = async () => {
    if (searchTerm.trim().length < 2) {
      toast({
        title: 'Search term too short',
        description: 'Please enter at least 2 characters.',
        variant: 'destructive',
      });
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name')
        .ilike('name', `%${searchTerm}%`)
        .limit(10);

      if (error) throw error;
      setOrganizations(data || []);

      if (!data || data.length === 0) {
        toast({
          title: 'No organizations found',
          description: 'Try a different search term.',
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Could not search organizations.',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  const requestToJoin = async (org: Organization) => {
    if (!user) return;

    // Check if already requested
    const existingRequest = pendingRequests.find(r => r.organization_id === org.id);
    if (existingRequest) {
      toast({
        title: 'Request already sent',
        description: `You already have a ${existingRequest.status} request for this organization.`,
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get the role from user metadata
      const role = user.user_metadata?.role || 'requester';

      const { error } = await supabase
        .from('organization_join_requests')
        .insert({
          user_id: user.id,
          organization_id: org.id,
          requested_role: role,
          status: 'pending',
        });

      if (error) throw error;

      toast({
        title: 'Request sent!',
        description: `Your request to join ${org.name} has been submitted. Wait for admin approval.`,
      });

      fetchPendingRequests();
      setOrganizations([]);
      setSearchTerm('');
    } catch (error: any) {
      console.error('Request error:', error);
      toast({
        title: 'Request failed',
        description: error.message || 'Could not send join request.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-lg space-y-6">
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Join an Organization
            </CardTitle>
            <CardDescription>
              Search for an organization to request access. An admin will review your request.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Label htmlFor="search" className="sr-only">Search organizations</Label>
                <Input
                  id="search"
                  placeholder="Search by organization name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchOrganizations()}
                />
              </div>
              <Button onClick={searchOrganizations} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {organizations.length > 0 && (
              <div className="space-y-2">
                <Label>Search Results</Label>
                <div className="border rounded-lg divide-y">
                  {organizations.map((org) => (
                    <div
                      key={org.id}
                      className="flex items-center justify-between p-3"
                    >
                      <span className="font-medium">{org.name}</span>
                      <Button
                        size="sm"
                        onClick={() => requestToJoin(org)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Request to Join'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card className="shadow-medium">
          <CardHeader>
            <CardTitle className="text-lg">Your Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No pending requests. Search for an organization above.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{request.organizations?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(request.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <span className="text-sm capitalize">{request.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground text-center">
          Want to create your own organization?{' '}
          <button
            onClick={() => navigate('/onboarding')}
            className="text-primary hover:underline"
          >
            Create Organization
          </button>
        </p>
      </div>
    </div>
  );
}