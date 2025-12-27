export type MaintenanceType = 'Corrective' | 'Preventive';
export type MaintenancePriority = 'Low' | 'Medium' | 'High';
export type MaintenanceStatus = 'New' | 'In Progress' | 'Repaired' | 'Scrap';

export interface MaintenanceRequest {
  id: string;
  title: string;
  description: string | null;
  equipment_id: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assigned_team_id: string | null;
  assigned_technician_id: string | null;
  scheduled_date: string | null;
  duration: number | null;
  created_by: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  
  // Joins
  equipment?: {
    name: string;
    serial_number: string;
  };
  teams?: {
    name: string;
  };
  assignee?: {
    full_name: string;
  };
  reporter?: {
    full_name: string;
  };
}
