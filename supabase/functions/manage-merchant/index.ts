import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { userId, status, type } = await req.json()

    console.log(`[manage-merchant] Iniciando atualização para ${userId} (${type}) para o status ${status}`);

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: { status: status } }
    )
    if (authError) throw authError

    const table = type === 'DRIVER' ? 'driver_applications' : 'merchant_applications';
    
    const { error: dbError } = await supabaseAdmin
      .from(table)
      .update({ status: status })
      .eq('id', userId)
    
    if (dbError) throw dbError

    console.log(`[manage-merchant] Sucesso: ${type} ${userId} atualizado.`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(`[manage-merchant] Erro:`, error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})