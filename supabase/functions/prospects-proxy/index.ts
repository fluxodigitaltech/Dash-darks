import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const EVO_PROSPECTS_URL = 'https://evo-integracao-api.w12app.com.br/api/v1/prospects';
const EVO_DNS = 'darksgym';
const EVO_SECRET_KEY = '47879638-81A1-4AC9-BBEE-77CDC04CBECF';
const PAGE_SIZE = 50; // Maximum 'take' value allowed by the API

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const urlParams = new URL(req.url).searchParams;
    let registerDateStart = urlParams.get('registerDateStart');
    let registerDateEnd = urlParams.get('registerDateEnd');

    // If dates are not provided, default to the current month
    if (!registerDateStart || !registerDateEnd) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      registerDateStart = formatDate(firstDayOfMonth);
      registerDateEnd = formatDate(lastDayOfMonth);
      // console.log(`[Prospects Proxy] No dates provided, defaulting to current month: ${registerDateStart} to ${registerDateEnd}`);
    } else {
      // console.log(`[Prospects Proxy] Using provided dates: ${registerDateStart} to ${registerDateEnd}`);
    }

    const authHeader = 'Basic ' + btoa(`${EVO_DNS}:${EVO_SECRET_KEY}`);
    let allProspects: any[] = [];
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const apiUrl = `${EVO_PROSPECTS_URL}?registerDateStart=${registerDateStart}&registerDateEnd=${registerDateEnd}&take=${PAGE_SIZE}&skip=${skip}`;
      // console.log(`[Prospects Proxy] Fetching from: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': authHeader,
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        // console.error(`[Prospects Proxy] EVO API request failed. Status: ${response.status}. Body: ${errorBody}`);
        return new Response(
          JSON.stringify({ 
            error: `EVO API request failed with status: ${response.status}`,
            details: errorBody,
            url: apiUrl
          }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Retorna o status real do erro
        )
      }

      const data = await response.json();
      // console.log(`[Prospects Proxy] Fetched ${data.length} items from skip ${skip}`);

      if (data && Array.isArray(data)) {
        allProspects = allProspects.concat(data);
        if (data.length < PAGE_SIZE) {
          hasMore = false; // No more data to fetch
        } else {
          skip += PAGE_SIZE; // Move to the next page
        }
      } else {
        // console.warn("[Prospects Proxy] Unexpected data format from EVO API:", data);
        hasMore = false; // Stop if data is not an array
      }
    }

    // console.log(`[Prospects Proxy] Total prospects fetched: ${allProspects.length}`);

    return new Response(
      JSON.stringify({
        data: allProspects,
        period: `${registerDateStart} até ${registerDateEnd}`,
        total: allProspects.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // console.error('[Prospects Proxy] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Retorna status 500 para erros inesperados
    )
  }
})