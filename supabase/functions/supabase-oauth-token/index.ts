const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await request.json()
    const { code, redirect_uri, code_verifier, action, access_token, project_ref, query } = body
    if (action && access_token) {
      if (action === 'projects') {
        return proxyManagementApi('/projects', access_token)
      }
      if (action === 'database_query' && project_ref && query) {
        return proxyManagementApi(`/projects/${encodeURIComponent(project_ref)}/database/query`, access_token, {
          method: 'POST',
          body: JSON.stringify({ query }),
        })
      }
      return json({ error: 'invalid_management_action' }, 400)
    }
    if (!code || !redirect_uri || !code_verifier) {
      return new Response(JSON.stringify({ error: 'missing_oauth_parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const clientId = Deno.env.get('LIANKE_OAUTH_CLIENT_ID')
    const clientSecret = Deno.env.get('LIANKE_OAUTH_CLIENT_SECRET')
    if (!clientId || !clientSecret) throw new Error('OAuth function secrets are not configured')

    const response = await fetch('https://api.supabase.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        code_verifier,
      }),
    })
    const payload = await response.text()
    return new Response(payload, {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || 'oauth_exchange_failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

async function proxyManagementApi(path, accessToken, options = {}) {
  const response = await fetch(`https://api.supabase.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  })
  const payload = await response.text()
  return new Response(payload, {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
