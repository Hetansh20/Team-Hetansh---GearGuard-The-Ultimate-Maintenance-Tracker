-- Drop and recreate the organizations insert policy with correct permissions
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- Create a more permissive insert policy
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Also fix the admins update policy that has recursion issues
DROP POLICY IF EXISTS "Admins can update their organization" ON public.organizations;

-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_org_admin(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id 
    AND organization_id = _org_id 
    AND role = 'admin'
  )
$$;

-- Recreate admin update policy using the function
CREATE POLICY "Admins can update their organization"
  ON public.organizations FOR UPDATE
  USING (public.is_org_admin(auth.uid(), id));

-- Fix the admins manage roles policy that also has recursion
DROP POLICY IF EXISTS "Admins can manage roles in their organization" ON public.user_roles;

CREATE POLICY "Admins can manage roles in their organization"
  ON public.user_roles FOR ALL
  USING (public.is_org_admin(auth.uid(), organization_id));