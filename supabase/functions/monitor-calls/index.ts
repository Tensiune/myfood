import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    console.log("[monitor-calls] Iniciando monitoramento de chamadas não atendidas.");

    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();

    const { data: expiredCalls, error } = await supabaseAdmin
      .from('calls')
      .select('id, caller_id, receiver_id')
      .eq('status', 'calling')
      .lt('created_at', oneMinuteAgo);

    if (error) throw error;

    if (expiredCalls && expiredCalls.length > 0) {
      console.log(`[monitor-calls] Encontradas ${expiredCalls.length} chamadas expiradas.`);

      const expiredIds = expiredCalls.map(c => c.id);

      const { error: updateError } = await supabaseAdmin
        .from('calls')
        .update({ status: 'rejected' })
        .in('id', expiredIds);

      if (updateError) throw updateError;
      
      console.log(`[monitor-calls] ${expiredCalls.length} chamadas marcadas como rejeitadas.`);
    } else {
      console.log("[monitor-calls] Nenhuma chamada expirada encontrada.");
    }

    return new Response(JSON.stringify({ success: true, rejected_count: expiredCalls?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error(`[monitor-calls] Erro ao processar chamadas:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})