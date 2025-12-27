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
import { Building2, Loader2, ArrowRight } from 'lucide-react';
import { z } from 'zod';

const orgNameSchema = z.string().min(2, 'Organization name must be at least 2 characters').max(100);

export default function Onboarding() {
  const [orgName, setOrgName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user, loading: authLoading } = useAuth();
  const { organizationId, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    
    // If user already has an organization, go to dashboard
    if (!authLoading && !roleLoading && organizationId) {
      navigate('/dashboard');
      return;
    }
  }, [user, authLoading, roleLoading, organizationId, navigate]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = orgNameSchema.safeParse(orgName);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create an organization.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-organization', {
        body: { name: orgName.trim() },
      });

      if (fnError) throw fnError;

      toast({
        title: 'Organization created!',
        description: `Welcome to ${data?.organization?.name || orgName}. You are now the admin.`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating organization:', error);
      toast({
        title: 'Error',
        description: error.message || error?.context?.error || 'Failed to create organization.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-medium animate-fade-in">
        <CardHeader className="text-center">
          <div className="mx-auto p-3 bg-primary/10 rounded-full w-fit mb-4">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your Organization</CardTitle>
          <CardDescription>
            Set up your organization to start tracking maintenance and managing your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateOrganization} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization Name</Label>
              <Input
                id="orgName"
                type="text"
                placeholder="e.g., Acme Industries"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium text-foreground mb-2">What happens next:</p>
              <ul className="space-y-1 text-muted-foreground">
                <li>• You'll be assigned as the <span className="font-medium text-primary">Admin</span></li>
                <li>• You can invite team members and assign roles</li>
                <li>• Roles: Admin, Manager, Technician, Requester</li>
              </ul>
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Organization
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center pt-2">
              Want to join an existing organization instead?{' '}
              <button
                type="button"
                onClick={() => navigate('/join-organization')}
                className="text-primary hover:underline"
              >
                Join Organization
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}