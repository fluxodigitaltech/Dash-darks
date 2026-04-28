import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import * as xlsx from "https://esm.sh/xlsx@0.18.5";

const EVO_URL = 'https://evo-integracao.w12app.com.br/api/v1/receivables/summary-excel';
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
    const urlParams = new URL(req.url).searchParams;
    let dtLancamentoDe = urlParams.get('dtLancamentoDe');
    let dtLancamentoAte = urlParams.get('dtLancamentoAte');

    // If dates are not provided, default to the current month
    if (!dtLancamentoDe || !dtLancamentoAte) {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const formatDate = (date: Date) => date.toISOString().split('T')[0];
      dtLancamentoDe = formatDate(firstDayOfMonth);
      dtLancamentoAte = formatDate(lastDayOfMonth);
      // console.log(`[Receivables Proxy] No dates provided, defaulting to current month: ${dtLancamentoDe} to ${dtLancamentoAte}`);
    } else {
      // console.log(`[Receivables Proxy] Using provided dates: ${dtLancamentoDe} to ${dtLancamentoAte}`);
    }

    // Construct URL with the date parameters
    const apiUrl = `${EVO_URL}?dtLancamentoDe=${dtLancamentoDe}&dtLancamentoAte=${dtLancamentoAte}`;
    
    // console.log(`[Receivables Proxy] Full API URL: ${apiUrl}`);

    // Prepare Basic Authentication header
    const authHeader = 'Basic ' + btoa(`${EVO_DNS}:${EVO_SECRET_KEY}`);

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': authHeader,
      },
    });

    if (!response.ok) {
      const errorBody = await response.text();
      // console.error(`[Receivables Proxy] EVO API request failed. Status: ${response.status}. Body: ${errorBody}`);
      return new Response(
        JSON.stringify({ 
          error: `EVO API request failed with status: ${response.status}`,
          details: errorBody,
          url: apiUrl
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const buffer = await response.arrayBuffer();
    const workbook = xlsx.read(new Uint8Array(buffer), { type: 'array' });
    
    // console.log(`[Receivables Proxy] Workbook Sheet Names: ${workbook.SheetNames.join(', ')}`);

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    // console.log(`[Receivables Proxy] Raw JSON data length from Excel: ${jsonData.length}`);

    const normalizedJsonData = jsonData.map(row => {
      const newRow: Record<string, any> = {};
      for (const key in row) {
        const normalizedKey = key.trim();
        newRow[normalizedKey] = row[key];
      }
      return newRow;
    });

    // console.log(`[Receivables Proxy] Normalized JSON data length: ${normalizedJsonData.length}`);
    // console.log("Normalized Receivables Data (first 5 rows):", normalizedJsonData.slice(0, 5).map(item => item.Valor));

    return new Response(
      JSON.stringify({
        data: normalizedJsonData,
        period: `${dtLancamentoDe} até ${dtLancamentoAte}`,
        total: normalizedJsonData.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    // console.error('[Receivables Proxy] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})