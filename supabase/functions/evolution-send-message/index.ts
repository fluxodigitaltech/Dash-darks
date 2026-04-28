import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const EVOLUTION_API_URL = Deno.env.get('EVOLUTION_API_URL');
const EVOLUTION_API_KEY = Deno.env.get('EVOLUTION_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("EVOLUTION_API_URL and EVOLUTION_API_KEY must be set in environment variables.");
    }

    const { phone, message, instanceName, delay, presence } = await req.json();

    if (!phone || !message || !instanceName) {
      throw new Error("Missing 'phone', 'message', or 'instanceName' in request body.");
    }

    const targetUrl = `${EVOLUTION_API_URL}/message/sendText/${instanceName}`; // Specific Evolution API endpoint
    const headers = {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY,
    };

    const body = {
      number: phone,
      textMessage: {
        text: message
      },
      options: {
        delay: delay || 1200, // Default delay
        presence: presence || "composing" // Default presence
      }
    };

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return new Response(
        JSON.stringify({ 
          error: `Evolution API (sendText) request failed with status: ${response.status}`,
          details: errorBody,
          targetUrl: targetUrl,
          requestBody: body // Include request body for debugging
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const jsonData = await response.json();

    return new Response(
      JSON.stringify(jsonData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})