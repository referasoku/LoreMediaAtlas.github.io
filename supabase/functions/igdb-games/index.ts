import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let searchQuery = '';
    
    // Safely parse request body if present
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        searchQuery = body.searchQuery || '';
      } catch {
        // Fallback for empty body requests
      }
    }

    const clientId = Deno.env.get('TWITCH_CLIENT_ID');
    const clientSecret = Deno.env.get('TWITCH_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      throw new Error('Twitch API credentials are missing from Supabase Environment Secrets.');
    }

    // 2. Obtain Twitch OAuth Token safely
    const tokenResponse = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Failed to fetch Twitch OAuth Token: ${errorText}`);
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 3. Build IGDB APICal Query
    const queryBody = searchQuery.trim()
      ? `search "${searchQuery.replace(/"/g, '')}"; fields name, cover.image_id, rating; limit 20;`
      : `fields name, cover.image_id, rating; sort rating desc; where rating != null; limit 20;`;

    // 4. Query IGDB API
    const igdbResponse = await fetch('https://api.igdb.com/v4/games', {
      method: 'POST',
      headers: {
        'Client-ID': clientId,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'text/plain',
      },
      body: queryBody,
    });

    if (!igdbResponse.ok) {
      const igdbError = await igdbResponse.text();
      throw new Error(`IGDB API Error: ${igdbError}`);
    }

    const games = await igdbResponse.json();

    return new Response(JSON.stringify(games), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Edge Function Error:', error.message);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
