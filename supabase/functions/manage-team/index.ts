import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      ...corsHeaders,
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing environment variables');
      return json({ error: 'Server not configured' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      console.warn('Invalid user JWT', userErr);
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    console.log('manage-team action:', action, 'user:', userData.user.id);

    // Verify the user is an admin of the organization
    const { data: isAdmin } = await supabaseAdmin.rpc('is_org_admin', {
      _user_id: userData.user.id,
      _org_id: body.organization_id,
    });

    if (!isAdmin) {
      return json({ error: 'Only admins can perform this action' }, { status: 403 });
    }

    switch (action) {
      case 'approve_request': {
        const { request_id, user_id, organization_id, role } = body;

        if (!request_id || !user_id || !organization_id || !role) {
          return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Update request status
        const { error: updateRequestErr } = await supabaseAdmin
          .from('organization_join_requests')
          .update({ status: 'approved' })
          .eq('id', request_id);

        if (updateRequestErr) {
          console.error('Failed to update request:', updateRequestErr);
          return json({ error: 'Failed to update request' }, { status: 500 });
        }

        // Update user's profile with organization
        const { error: profileErr } = await supabaseAdmin
          .from('profiles')
          .update({ organization_id })
          .eq('id', user_id);

        if (profileErr) {
          console.error('Failed to update profile:', profileErr);
          return json({ error: 'Failed to update user profile' }, { status: 500 });
        }

        // Create user role
        const { error: roleErr } = await supabaseAdmin
          .from('user_roles')
          .upsert(
            { user_id, organization_id, role },
            { onConflict: 'user_id,organization_id' }
          );

        if (roleErr) {
          console.error('Failed to create role:', roleErr);
          return json({ error: 'Failed to assign role' }, { status: 500 });
        }

        console.log('Approved request for user:', user_id);
        return json({ success: true });
      }

      default:
        return json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (e) {
    console.error('manage-team error:', e);
    return json({ error: 'Unexpected error' }, { status: 500 });
  }
});