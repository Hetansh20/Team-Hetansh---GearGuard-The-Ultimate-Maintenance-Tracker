-- Fix the foreign key: organization_join_requests should reference auth.users, not profiles
-- First drop the existing foreign key
ALTER TABLE public.organization_join_requests 
DROP CONSTRAINT organization_join_requests_user_id_fkey;

-- Add new foreign key referencing auth.users
ALTER TABLE public.organization_join_requests
ADD CONSTRAINT organization_join_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;