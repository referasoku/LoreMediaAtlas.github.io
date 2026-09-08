import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

serve(async (req) => {
  // 1. Handle CORS Preflight immediately with a 200 OK
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    });
  }

  try {
    // 2. Parse search query from URL params (GET) or JSON body (POST)
    const url = new URL(req.url);
    let searchQuery = url.searchParams.get('query') || url.searchParams.get('searchQuery') || '';

    if (!searchQuery && req.method === 'POST') {
      try {
        const body = await req.json();
        searchQuery = body.query || body.searchQuery || '';
      } catch {
        // Fallback if body is empty
      }
    }

    const tmdbApiKey = Deno.env.get('TMDB_API_KEY');
    if (!tmdbApiKey) {
      throw new Error('TMDB_API_KEY is missing from Supabase environment secrets.');
    }

    // 3. Query TMDB API
    const tmdbUrl = searchQuery.trim()
      ? `https://api.themoviedb.org/3/search/movie?api_key=${tmdbApiKey}&query=${encodeURIComponent(searchQuery)}`
      : `https://api.themoviedb.org/3/movie/popular?api_key=${tmdbApiKey}`;

    const response = await fetch(tmdbUrl);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`TMDB API Error (${response.status}): ${errText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data.results || []), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('TMDB Edge Function Error:', error.message);

    // ALWAYS return CORS headers on errors so the browser receives the real error
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
