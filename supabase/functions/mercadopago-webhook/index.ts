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
  
  const MERCADOPAGO_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')

  if (!MERCADOPAGO_ACCESS_TOKEN) {
    console.error("[mercadopago-webhook] MERCADOPAGO_ACCESS_TOKEN is missing.");
    return new Response(JSON.stringify({ error: 'Mercado Pago token not configured.' }), { status: 500, headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { type, data } = body
    
    console.log(`[mercadopago-webhook] Received notification: Type=${type}, Resource ID=${data?.id}`);

    if (type !== 'payment' || !data?.id) {
      return new Response(JSON.stringify({ received: true, message: 'Ignored non-payment notification or missing ID.' }), { status: 200, headers: corsHeaders })
    }

    const paymentId = data.id;

    // 1. Consultar a API do Mercado Pago para obter detalhes do pagamento (segurança)
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        "Authorization": `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      },
    })

    if (!mpResponse.ok) {
      console.error(`[mercadopago-webhook] Failed to fetch payment details for ${paymentId}.`);
      return new Response(JSON.stringify({ error: 'Failed to fetch payment details.' }), { status: 400, headers: corsHeaders })
    }

    const paymentDetails = await mpResponse.json()
    const orderId = paymentDetails.external_reference
    const paymentStatus = paymentDetails.status
    
    if (!orderId) {
        console.warn(`[mercadopago-webhook] Payment ${paymentId} has no external_reference (orderId).`);
        return new Response(JSON.stringify({ received: true, message: 'No orderId found.' }), { status: 200, headers: corsHeaders })
    }

    let newOrderStatus = 'PENDING';
    
    if (paymentStatus === 'approved') {
      newOrderStatus = 'PREPARING';
    } else if (paymentStatus === 'rejected' || paymentStatus === 'cancelled') {
      newOrderStatus = 'CANCELLED';
    }
    
    console.log(`[mercadopago-webhook] Updating order ${orderId} to status: ${newOrderStatus} (MP Status: ${paymentStatus})`);

    // 2. Atualizar o status do pedido no Supabase
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: newOrderStatus,
        payment_method: `mercadopago (${paymentStatus})`,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .in('status', ['PENDING', 'PREPARING']); // Só atualiza se ainda estiver pendente ou em preparo (evita sobrescrever DELIVERED)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, orderId, newStatus: newOrderStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (err: any) {
    console.error(`[mercadopago-webhook] Error processing webhook:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})