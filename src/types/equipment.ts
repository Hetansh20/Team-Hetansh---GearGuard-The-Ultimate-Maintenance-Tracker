export interface EquipmentCategory {
  id: string;
  name: string;
  organization_id: string;
  created_at: string;
}

export interface Equipment {
  id: string;
  name: string;
  serial_number: string | null;
  category_id: string | null;
  assigned_team_id: string | null;
  status: 'Operational' | 'Down' | 'Maintenance' | 'Scrapped';
  organization_id: string;
  created_at: string;
  updated_at: string;
  
  // Joins
  category?: EquipmentCategory;
  team?: {
    name: string;
  };
}
