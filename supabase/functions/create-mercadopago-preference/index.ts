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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error("Usuário não autenticado.")

    const { orderId, items, origin } = await req.json()
    
    const baseOrigin = origin ? origin.replace(/\/$/, "") : "";
    if (!baseOrigin) throw new Error("Origem (URL do app) não fornecida.");

    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!MERCADOPAGO_ACCESS_TOKEN) {
        throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado no Supabase.");
    }

    // Configuração da Preferência de Pagamento
    const preference = {
      items: items.map((item: any) => ({
        id: item.id,
        title: item.name,
        unit_price: Number(item.price),
        quantity: Number(item.quantity),
        currency_id: "BRL"
      })),
      payer: {
        email: user.email,
      },
      external_reference: orderId,
      back_urls: {
        success: `${baseOrigin}/orders`,
        pending: `${baseOrigin}/orders`,
        failure: `${baseOrigin}/orders`,
      },
      // REMOVIDO: auto_return: "approved"
      // Motivo: O Mercado Pago exige HTTPS para redirecionamento automático. 
      // Ao remover, o checkout funcionará em http://localhost para seus testes.
      
      notification_url: `https://ulaosfxeilccmptlpwxr.supabase.co/functions/v1/mercadopago-webhook`,
    }

    console.log("[create-mercadopago-preference] Enviando payload para MP...");

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    })

    const mpData = await mpResponse.json()

    if (!mpResponse.ok) {
        console.error("[MP API Error]", JSON.stringify(mpData));
        throw new Error(mpData.message || "Erro na API do Mercado Pago.");
    }

    return new Response(JSON.stringify({ 
        success: true, 
        initPoint: mpData.init_point 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error(`[MP Function Error]`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })
  }
})