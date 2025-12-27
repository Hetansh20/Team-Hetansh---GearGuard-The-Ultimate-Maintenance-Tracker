-- Allow authenticated users to search organizations by name (for join requests)
CREATE POLICY "Authenticated users can search organizations"
ON public.organizations
FOR SELECT
USING (auth.uid() IS NOT NULL);