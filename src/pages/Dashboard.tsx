import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserRole, UserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardList, Wrench, AlertTriangle, CheckCircle2, Users, Building2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StatCard {
  name: string;
  value: string;
  change: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  roles?: UserRole[];
}

const stats: StatCard[] = [
  {
    name: 'Open Work Orders',
    value: '12',
    change: '+2 from yesterday',
    icon: ClipboardList,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    name: 'Equipment Online',
    value: '48',
    change: '96% availability',
    icon: Wrench,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    name: 'Pending Maintenance',
    value: '5',
    change: '3 due this week',
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    name: 'Completed This Month',
    value: '34',
    change: '+12% vs last month',
    icon: CheckCircle2,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    name: 'Team Members',
    value: '8',
    change: '2 technicians available',
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    roles: ['admin', 'manager'],
  },
  {
    name: 'Departments',
    value: '4',
    change: 'All operational',
    icon: Building2,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    roles: ['admin'],
  },
];

const roleGreetings: Record<UserRole, string> = {
  admin: "Here's your organization overview.",
  manager: "Here's what your team is working on.",
  technician: "Here are your assigned tasks.",
  requester: "Track your maintenance requests here.",
};

const quickActions: { label: string; roles: UserRole[]; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'Create Work Order', roles: ['admin', 'manager', 'requester'], icon: Plus },
  { label: 'Add Equipment', roles: ['admin', 'manager'], icon: Plus },
  { label: 'Invite Team Member', roles: ['admin'], icon: Users },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { role, organizationName } = useUserRole();

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
            <Button key={action.label} variant="outline" size="sm">
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
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Role-specific content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Common section: Recent Work Orders */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>
              {role === 'technician' ? 'My Assigned Work Orders' : 'Recent Work Orders'}
            </CardTitle>
            <CardDescription>
              {role === 'technician' 
                ? 'Tasks assigned to you' 
                : 'Latest maintenance requests and updates'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <p className="text-sm">Work orders will appear here</p>
            </div>
          </CardContent>
        </Card>

        {/* Role-specific right panel */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>
              {role === 'admin' && 'Team Activity'}
              {role === 'manager' && 'Team Performance'}
              {role === 'technician' && 'Upcoming Maintenance'}
              {role === 'requester' && 'My Request Status'}
            </CardTitle>
            <CardDescription>
              {role === 'admin' && 'Recent activity across your organization'}
              {role === 'manager' && 'Your team metrics and performance'}
              {role === 'technician' && 'Scheduled preventive maintenance tasks'}
              {role === 'requester' && 'Track the status of your submitted requests'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-48 text-muted-foreground border-2 border-dashed border-border rounded-lg">
              <p className="text-sm">
                {role === 'admin' && 'Activity feed coming soon'}
                {role === 'manager' && 'Performance metrics coming soon'}
                {role === 'technician' && 'Scheduled tasks coming soon'}
                {role === 'requester' && 'Request tracking coming soon'}
              </p>
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
              <Button variant="outline" size="sm">Manage Team Members</Button>
              <Button variant="outline" size="sm">Configure Roles</Button>
              <Button variant="outline" size="sm">Organization Settings</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}