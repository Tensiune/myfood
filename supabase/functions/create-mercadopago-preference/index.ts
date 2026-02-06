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

    const { orderId, totalAmount, description, items } = await req.json()
    
    console.log("[create-mercadopago-preference] Received request for order:", orderId);

    const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')
    if (!MERCADOPAGO_ACCESS_TOKEN) {
        console.error("[create-mercadopago-preference] MERCADOPAGO_ACCESS_TOKEN is missing.");
        throw new Error("Mercado Pago token not configured.");
    }

    const preference = {
      items: items.map(item => ({
        title: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        currency_id: "BRL"
      })),
      payer: {
        email: user.email,
      },
      external_reference: orderId,
      back_urls: {
        success: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook?status=success&orderId=${orderId}`,
        pending: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook?status=pending&orderId=${orderId}`,
        failure: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook?status=failure&orderId=${orderId}`,
      },
      auto_return: "approved",
      notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mercadopago-webhook`,
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
        console.error("[create-mercadopago-preference] MP API Error:", mpData);
        throw new Error(mpData.message || "Failed to create preference.");
    }
    
    console.log("[create-mercadopago-preference] Preference created successfully.");

    return new Response(JSON.stringify({ 
        success: true, 
        preferenceId: mpData.id,
        initPoint: mpData.init_point, // Link de pagamento
        qrCode: mpData.qr_code // Se aplicável
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error(`[create-mercadopago-preference] Error:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})