import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { organizationId, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    // If user is logged in but has no organization, redirect based on their role
    if (!authLoading && !roleLoading && user && organizationId === null) {
      const userRole = user.user_metadata?.role;
      
      if (userRole === 'admin') {
        // Admins go to create organization
        navigate('/onboarding');
      } else {
        // Other roles go to join organization
        navigate('/join-organization');
      }
    }
  }, [user, authLoading, roleLoading, organizationId, navigate]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !organizationId) {
    return null;
  }

  return <>{children}</>;
}
