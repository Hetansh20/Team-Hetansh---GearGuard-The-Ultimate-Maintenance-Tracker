-- Create security definer function to get user's organization_id without RLS
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id
$$;

-- Drop the recursive policies
DROP POLICY IF EXISTS "Users can view profiles in their organization" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their organization" ON public.organizations;
DROP POLICY IF EXISTS "Users can view roles in their organization" ON public.user_roles;

-- Recreate profiles policies using the security definer function
CREATE POLICY "Users can view profiles in their organization"
  ON public.profiles FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
    OR id = auth.uid()
  );

-- Recreate organizations policy
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  USING (
    id = public.get_user_organization_id(auth.uid())
  );

-- Recreate user_roles policy
CREATE POLICY "Users can view roles in their organization"
  ON public.user_roles FOR SELECT
  USING (
    organization_id = public.get_user_organization_id(auth.uid())
  );