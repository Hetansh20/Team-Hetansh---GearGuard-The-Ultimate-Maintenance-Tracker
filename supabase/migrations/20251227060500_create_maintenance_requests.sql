create type maintenance_type as enum ('Corrective', 'Preventive');
create type maintenance_priority as enum ('Low', 'Medium', 'High');
create type maintenance_status as enum ('New', 'In Progress', 'Repaired', 'Scrap');

create table maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  equipment_id uuid references equipment(id) on delete cascade not null,
  type maintenance_type not null,
  priority maintenance_priority not null,
  status maintenance_status default 'New'::maintenance_status not null,
  assigned_team_id uuid references teams(id) on delete set null,
  assigned_technician_id uuid references profiles(id) on delete set null,
  scheduled_date timestamptz,
  duration integer, -- in minutes
  created_by uuid references profiles(id) on delete set null not null,
  organization_id uuid references organizations(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- RLS Policies
alter table maintenance_requests enable row level security;

create policy "Users can view maintenance requests in their organization"
  on maintenance_requests for select
  using (organization_id = (select organization_id from profiles where id = auth.uid()));

create policy "Requesters can create requests"
  on maintenance_requests for insert
  with check (
    organization_id = (select organization_id from profiles where id = auth.uid()) and
    auth.uid() = created_by
  );

create policy "Users can update requests based on role"
  on maintenance_requests for update
  using (
    organization_id = (select organization_id from profiles where id = auth.uid()) and
    (
      -- Admins and Managers can update anything
      exists (
        select 1 from user_roles
        where user_id = auth.uid()
        and role in ('admin', 'manager')
      )
      or
      -- Technicians can update assigned requests
      assigned_technician_id = auth.uid()
      or
      -- Requesters can update their own 'New' requests (optional, but good for edits)
      (created_by = auth.uid() and status = 'New'::maintenance_status)
    )
  );

-- Function to handle 'Scrap' status side-effect
create or replace function handle_scrap_equipment()
returns trigger as $$
begin
  if new.status = 'Scrap' and old.status != 'Scrap' then
    update equipment
    set status = 'Scrapped'
    where id = new.equipment_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_maintenance_scrap
  after update on maintenance_requests
  for each row
  execute function handle_scrap_equipment();
