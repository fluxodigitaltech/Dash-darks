import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Get the first day of the current month
    const today = new Date();
    const monthStartDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];

    const fixedValue = 390;

    // Upsert the value: insert if not present, update if it is.
    const { error } = await supabaseClient
      .from('monthly_member_stats')
      .upsert(
        { month_start_date: monthStartDate, adimplentes_count: fixedValue, created_at: new Date().toISOString() },
        { onConflict: 'month_start_date' }
      );

    if (error) {
      throw new Error(`Failed to upsert monthly stats: ${error.message}`);
    }

    return new Response(
      JSON.stringify({ message: `Successfully fixed current month's adimplentes count to ${fixedValue}.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})