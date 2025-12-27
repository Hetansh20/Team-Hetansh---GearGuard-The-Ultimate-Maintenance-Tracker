create table equipment_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  organization_id uuid references organizations(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

alter table equipment_categories enable row level security;

create policy "Users can view equipment categories in their organization"
  on equipment_categories for select
  using (organization_id = (select organization_id from profiles where id = auth.uid()));

create policy "Admins and Managers can manage equipment categories"
  on equipment_categories for all
  using (
    organization_id = (select organization_id from profiles where id = auth.uid()) and
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role in ('admin', 'manager')
    )
  );

create table equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  serial_number text,
  category_id uuid references equipment_categories(id) on delete set null,
  assigned_team_id uuid references teams(id) on delete set null,
  status text not null default 'Operational',
  organization_id uuid references organizations(id) on delete cascade not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table equipment enable row level security;

create policy "Users can view equipment in their organization"
  on equipment for select
  using (organization_id = (select organization_id from profiles where id = auth.uid()));

create policy "Admins and Managers can manage equipment"
  on equipment for all
  using (
    organization_id = (select organization_id from profiles where id = auth.uid()) and
    exists (
      select 1 from user_roles
      where user_id = auth.uid()
      and role in ('admin', 'manager')
    )
  );
