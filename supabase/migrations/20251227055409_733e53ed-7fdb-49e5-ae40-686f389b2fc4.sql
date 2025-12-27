-- Create table for team invites
CREATE TABLE public.team_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'requester',
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(organization_id, email)
);

-- Enable RLS
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

-- Admins can view all invites for their organization
CREATE POLICY "Admins can view org invites"
ON public.team_invites
FOR SELECT
USING (is_org_admin(auth.uid(), organization_id));

-- Admins can create invites for their organization
CREATE POLICY "Admins can create org invites"
ON public.team_invites
FOR INSERT
WITH CHECK (is_org_admin(auth.uid(), organization_id));

-- Admins can update invites for their organization
CREATE POLICY "Admins can update org invites"
ON public.team_invites
FOR UPDATE
USING (is_org_admin(auth.uid(), organization_id));

-- Admins can delete invites for their organization
CREATE POLICY "Admins can delete org invites"
ON public.team_invites
FOR DELETE
USING (is_org_admin(auth.uid(), organization_id));

-- Add trigger for updated_at would need adding the column first
-- Actually, let's not add updated_at for invites, keeping it simple