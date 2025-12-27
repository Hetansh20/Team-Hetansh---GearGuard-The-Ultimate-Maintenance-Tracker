import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Wrench, AlertTriangle, CheckCircle2, Users, Building2, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface StatCard {
  name: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  roles?: UserRole[];
}

const roleGreetings: Record<UserRole, string> = {
  admin: "Here's your organization overview.",
  manager: "Here's what your team is working on.",
  technician: "Here are your assigned tasks.",
  requester: "Track your maintenance requests here.",
};

const quickActions: { label: string; roles: UserRole[]; icon: React.ComponentType<{ className?: string }>; path: string }[] = [
  { label: 'Create Work Order', roles: ['admin', 'manager', 'requester'], icon: Plus, path: '/dashboard/maintenance/new' },
  { label: 'Add Equipment', roles: ['admin', 'manager'], icon: Plus, path: '/dashboard/equipment' }, // Assuming path
  { label: 'Invite Team Member', roles: ['admin'], icon: Users, path: '/dashboard/team' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { role, organizationId, organizationName } = useUserRole();
  const navigate = useNavigate();

  // Fetch Dashboard Stats
  const { data: dashboardData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['dashboard-stats', organizationId, role, user?.id],
    queryFn: async () => {
      if (!organizationId) return null;

      // 1. Fetch Maintenance Request Counts
      const baseRequestQuery = supabase
        .from('maintenance_requests')
        .select('status, assigned_technician_id, created_by', { count: 'exact' })
        .eq('organization_id', organizationId);

      const requestQuery = role === 'technician' 
        ? baseRequestQuery.eq('assigned_technician_id', user?.id)
        : role === 'requester'
          ? baseRequestQuery.eq('created_by', user?.id)
          : baseRequestQuery;

      const { data: requests, error: reqError } = await requestQuery;
      if (reqError) throw reqError;

      const totalOpen = requests?.filter(r => r.status !== 'Repaired' && r.status !== 'Scrap').length || 0;
      const totalCompleted = requests?.filter(r => r.status === 'Repaired').length || 0;
      const totalPending = requests?.filter(r => r.status === 'New').length || 0; // "Pending" conceptual mapping

      // 2. Fetch Equipment Counts (Manager/Admin only usually, but good for all to see context)
      const { count: equipmentCount, error: equipError } = await supabase
        .from('equipment')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .neq('status', 'Scrapped'); // Don't count scrapped
      
      if (equipError) throw equipError;

      // 3. Fetch Team Member Count (Admin/Manager)
      let teamCount = 0;
      if (role === 'admin' || role === 'manager') {
         const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organizationId);
         teamCount = count || 0;
      }

      return {
        openWorkOrders: totalOpen,
        equipmentOnline: equipmentCount || 0,
        pendingMaintenance: totalPending,
        completedWithTime: totalCompleted, // Simple count for now
        teamMembers: teamCount
      };
    },
    enabled: !!organizationId,
  });

  // Fetch Recent Activity / Work Orders
  const { data: recentItems, isLoading: isLoadingItems } = useQuery({
    queryKey: ['dashboard-recent-items', organizationId, role, user?.id],
    queryFn: async () => {
      if (!organizationId) return [];

       const baseQuery = supabase
        .from('maintenance_requests')
        .select(`
          id, 
          title, 
          status, 
          priority, 
          created_at, 
          equipment:equipment_id(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(5);

       const query = role === 'technician'
        ? baseQuery.eq('assigned_technician_id', user?.id)
        : role === 'requester'
          ? baseQuery.eq('created_by', user?.id)
          : baseQuery;

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });

  const stats: StatCard[] = [
    {
      name: 'Open Work Orders',
      value: dashboardData?.openWorkOrders.toString() || '0',
      change: 'Active tasks',
      icon: ClipboardList,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      name: 'Equipment Active',
      value: dashboardData?.equipmentOnline.toString() || '0',
      change: 'Total operational',
      icon: Wrench,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      name: 'Pending / New',
      value: dashboardData?.pendingMaintenance.toString() || '0',
      change: 'Needs attention',
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      name: 'Repaired (All Time)',
      value: dashboardData?.completedWithTime.toString() || '0',
      change: 'Total fixed',
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      name: 'Team Members',
      value: dashboardData?.teamMembers.toString() || '0',
      change: 'Active users',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      roles: ['admin', 'manager'],
    },
  ];

  // Filter stats based on role
  const visibleStats = stats.filter((stat) => {
    if (!stat.roles) return true;
    return role && stat.roles.includes(role);
  });

  // Filter quick actions based on role
  const visibleActions = quickActions.filter((action) => {
    return role && action.roles.includes(role);
  });

  const userName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Welcome back, {userName}!</h2>
          <p className="text-muted-foreground mt-1">
            {role ? roleGreetings[role] : 'Loading your dashboard...'}
          </p>
        </div>
        
        {/* Quick actions based on role */}
        <div className="flex flex-wrap gap-2">
          {visibleActions.map((action) => (
            <Button 
              key={action.label} 
              variant="outline" 
              size="sm"
              onClick={() => navigate(action.path)}
            >
              <action.icon className="h-4 w-4 mr-2" />
              {action.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleStats.map((stat) => (
          <Card key={stat.name} className="shadow-soft hover:shadow-medium transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoadingStats ? "-" : stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role-specific content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Work Orders List */}
        <Card className="shadow-soft col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
               <CardTitle>
                 {role === 'technician' ? 'My Assigned Work Orders' : 'Recent Work Orders'}
               </CardTitle>
               <CardDescription>
                 {role === 'technician' 
                   ? 'Tasks assigned to you that need attention' 
                   : 'Latest maintenance requests and updates'}
               </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/maintenance')}>
              View All <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoadingItems ? (
               <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : recentItems && recentItems.length > 0 ? (
              <div className="space-y-4">
                {recentItems.map((item: any) => (
                  <div 
                    key={item.id} 
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/dashboard/maintenance/${item.id}`)}
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.equipment?.name || "Unknown Equipment"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{item.status}</Badge>
                      <Badge 
                        variant="secondary" 
                        className={`text-[10px] ${item.priority === 'High' ? 'text-destructive bg-destructive/10' : ''}`}
                      >
                        {item.priority}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-border rounded-lg">
                <p className="text-sm">No work orders found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role-specific right panel */}
        <Card className="shadow-soft col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>
              {role === 'admin' && 'Organization Overview'}
              {role === 'manager' && 'Team Performance'}
              {role === 'technician' && 'Quick Status'}
              {role === 'requester' && 'Need Help?'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {role === 'technician' && (
                 <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">You have {dashboardData?.openWorkOrders || 0} active jobs.</p>
                    <Button className="w-full" onClick={() => navigate('/dashboard/maintenance')}>Go to Work Orders</Button>
                 </div>
              )}
              {role === 'requester' && (
                 <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Facing an issue with equipment?</p>
                    <Button className="w-full" onClick={() => navigate('/dashboard/maintenance/new')}>Report a Breakdown</Button>
                 </div>
              )}
              {(role === 'admin' || role === 'manager') && (
                 <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">System Status: Operational</p>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Teams</p>
                          <p className="font-bold text-lg">Active</p>
                       </div>
                       <div className="p-3 bg-muted rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">Preventive</p>
                          <p className="font-bold text-lg">On Track</p>
                       </div>
                    </div>
                 </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Admin-only section */}
      {role === 'admin' && (
        <Card className="shadow-soft border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <CardTitle>Organization Settings</CardTitle>
            </div>
            <CardDescription>
              Manage your organization: {organizationName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/team')}>Manage Team Members</Button>
              <Button variant="outline" size="sm">Configure Roles</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}