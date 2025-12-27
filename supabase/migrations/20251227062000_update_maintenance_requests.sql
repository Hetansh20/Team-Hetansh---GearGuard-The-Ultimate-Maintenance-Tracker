alter table maintenance_requests 
add column equipment_category_id uuid references equipment_categories(id);

alter table maintenance_requests
alter column duration type numeric;
