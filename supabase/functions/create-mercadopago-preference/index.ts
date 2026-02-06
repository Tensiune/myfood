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
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) throw new Error("User not authenticated.")

    const { orderId, totalAmount, items, origin } = await req.json()
    
    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!MERCADOPAGO_ACCESS_TOKEN) {
        throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado no Supabase.");
    }

    // URL do projeto para o Webhook (hardcoded para segurança)
    const projectUrl = "https://ulaosfxeilccmptlpwxr.supabase.co";

    const preference = {
      items: items.map((item: any) => ({
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
        // O usuário volta para a página de pedidos do seu App
        success: `${origin}/orders?status=success&orderId=${orderId}`,
        pending: `${origin}/orders?status=pending&orderId=${orderId}`,
        failure: `${origin}/orders?status=error&orderId=${orderId}`,
      },
      auto_return: "approved",
      // O Mercado Pago avisa o seu servidor nesta URL
      notification_url: `${projectUrl}/functions/v1/mercadopago-webhook`,
    }

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
        console.error("[MP API Error]", mpData);
        throw new Error(mpData.message || "Falha ao gerar preferência no Mercado Pago.");
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
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})