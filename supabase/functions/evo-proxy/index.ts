import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import * as xlsx from "https://esm.sh/xlsx@0.18.5";

const EVO_URL = 'https://evo-integracao.w12app.com.br/api/v1/members/summary-excel';
const EVO_DNS = 'darksgym';
const EVO_SECRET_KEY = '47879638-81A1-4AC9-BBEE-77CDC04CBECF';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Prepare Basic Authentication header
    const authHeader = 'Basic ' + btoa(`${EVO_DNS}:${EVO_SECRET_KEY}`);

    const response = await fetch(EVO_URL, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // console.error(`EVO API request failed. Status: ${response.status}. Body: ${errorBody}`);
      return new Response(
        JSON.stringify({ 
          error: `EVO API request failed with status: ${response.status}`,
          details: errorBody
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // The API returns an Excel file, so we read it as a buffer
    const buffer = await response.arrayBuffer();
    const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert the sheet to JSON
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    return new Response(
      JSON.stringify(jsonData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})