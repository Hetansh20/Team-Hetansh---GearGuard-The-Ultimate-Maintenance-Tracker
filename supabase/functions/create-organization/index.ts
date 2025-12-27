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
      console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY');
      return json({ error: 'Server not configured' }, { status: 500 });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      console.warn('Missing Authorization header');
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1) Verify the user using an ANON client + the provided JWT
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !userData?.user) {
      console.warn('Invalid user JWT', userErr);
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Perform DB writes using SERVICE ROLE (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (name.length < 2 || name.length > 100) {
      return json({ error: 'Organization name must be 2-100 characters.' }, { status: 400 });
    }

    // Ensure user doesn't already have an org
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (profileErr) {
      console.error('Failed to read profile', profileErr);
      return json({ error: 'Failed to read profile' }, { status: 500 });
    }

    if (profile?.organization_id) {
      return json({ error: 'User already belongs to an organization.' }, { status: 409 });
    }

    // Create org
    const { data: org, error: orgErr } = await supabaseAdmin
      .from('organizations')
      .insert({ name })
      .select('id,name')
      .single();

    if (orgErr || !org) {
      console.error('Failed to create organization', orgErr);
      return json({ error: 'Failed to create organization' }, { status: 500 });
    }

    // Set user org
    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ organization_id: org.id })
      .eq('id', userData.user.id);

    if (updateErr) {
      console.error('Failed to update profile org', updateErr);
      return json({ error: 'Failed to update user profile' }, { status: 500 });
    }

    // Assign admin role (idempotent)
    const { error: roleErr } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        {
          user_id: userData.user.id,
          organization_id: org.id,
          role: 'admin',
        },
        { onConflict: 'user_id,organization_id' }
      );

    if (roleErr) {
      console.error('Failed to assign role', roleErr);
      return json({ error: 'Failed to assign admin role' }, { status: 500 });
    }

    return json({ organization: org });
  } catch (e) {
    console.error('create-organization error', e);
    return json({ error: 'Unexpected error' }, { status: 500 });
  }
});
