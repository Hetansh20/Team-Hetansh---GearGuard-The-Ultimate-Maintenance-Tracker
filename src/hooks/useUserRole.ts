import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'admin' | 'manager' | 'technician' | 'requester';

interface UserRoleData {
  role: UserRole | null;
  organizationId: string | null;
  organizationName: string | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useUserRole(): UserRoleData {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    if (!user) {
      setRole(null);
      setOrganizationId(null);
      setOrganizationName(null);
      setLoading(false);
      return;
    }

    try {
      // First get the user's profile to find their organization
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);

        // Get organization name
        const { data: org } = await supabase
          .from('organizations')
          .select('name')
          .eq('id', profile.organization_id)
          .maybeSingle();

        setOrganizationName(org?.name || null);

        // Get user role in this organization
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('organization_id', profile.organization_id)
          .maybeSingle();

        setRole(userRole?.role as UserRole || null);
      } else {
        setOrganizationId(null);
        setOrganizationName(null);
        setRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [user]);

  return { role, organizationId, organizationName, loading, refetch: fetchRole };
}