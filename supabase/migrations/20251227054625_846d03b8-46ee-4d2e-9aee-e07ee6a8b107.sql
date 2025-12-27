-- Create table for organization join requests
CREATE TABLE public.organization_join_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_role public.user_role NOT NULL DEFAULT 'requester',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, organization_id)
);

-- Enable RLS
ALTER TABLE public.organization_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view their own requests"
ON public.organization_join_requests
FOR SELECT
USING (user_id = auth.uid());

-- Users can create their own requests
CREATE POLICY "Users can create their own requests"
ON public.organization_join_requests
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Admins can view all requests for their organization
CREATE POLICY "Admins can view org requests"
ON public.organization_join_requests
FOR SELECT
USING (is_org_admin(auth.uid(), organization_id));

-- Admins can update requests for their organization
CREATE POLICY "Admins can update org requests"
ON public.organization_join_requests
FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id));

-- Admins can delete requests for their organization
CREATE POLICY "Admins can delete org requests"
ON public.organization_join_requests
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- Add trigger for updated_at
CREATE TRIGGER update_organization_join_requests_updated_at
BEFORE UPDATE ON public.organization_join_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();