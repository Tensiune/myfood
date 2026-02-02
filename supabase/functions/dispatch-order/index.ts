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
    const { orderId } = await req.json()
    console.log(`[dispatch-order] Iniciando busca para pedido: ${orderId}`);

    const { data: order } = await supabaseAdmin.from('orders').select('*, merchant:merchant_applications(*)').eq('id', orderId).single()
    if (!order || order.status === 'CANCELLED') {
        console.log(`[dispatch-order] Pedido ${orderId} inválido ou cancelado.`);
        return new Response(JSON.stringify({ success: false }))
    }

    const storeAddr = order.merchant?.metadata?.store_details?.address || order.merchant?.metadata?.address;
    if (!storeAddr) {
        console.error(`[dispatch-order] Loja sem endereço definido.`);
        return new Response(JSON.stringify({ success: false, error: 'store_address_missing' }));
    }

    const { data: config } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'driver_offer_timeout').single();
    const timeoutSeconds = config?.value?.seconds || 30;

    const { data: drivers } = await supabaseAdmin.from('driver_applications').select('id').eq('status', 'APPROVED');
    const { data: locations } = await supabaseAdmin.from('driver_locations').select('*');
    const { data: activeOrders } = await supabaseAdmin.from('orders').select('id, driver_id, status').not('status', 'in', '(DELIVERED,CANCELLED)');

    const candidates = drivers?.map(driver => {
      const loc = locations?.find(l => l.driver_id === driver.id);
      if (!loc || (order.refused_drivers_ids || []).includes(driver.id)) return null;

      const driverOrders = activeOrders?.filter(o => o.driver_id === driver.id) || [];
      if (driverOrders.length >= 3) return null;

      // Score simplificado para proximidade
      const dist = calculateDistance(parseFloat(loc.latitude), parseFloat(loc.longitude), parseFloat(storeAddr.lat), parseFloat(storeAddr.lng));
      let score = 1000 - (dist * 50);
      if (driverOrders.length === 0) score += 200;

      return { id: driver.id, score };
    }).filter(c => c !== null).sort((a, b) => b.score - a.score);

    const winner = candidates?.[0];

    if (winner) {
      console.log(`[dispatch-order] Oferta enviada para entregador: ${winner.id}`);
      const expiresAt = new Date(Date.now() + (timeoutSeconds * 1000)).toISOString();
      await supabaseAdmin.from('orders').update({ current_driver_offered_id: winner.id, offer_expires_at: expiresAt }).eq('id', orderId);
      return new Response(JSON.stringify({ success: true }));
    }

    console.log(`[dispatch-order] Nenhum entregador disponível para ${orderId}`);
    return new Response(JSON.stringify({ success: false, reason: 'no_candidates' }));

  } catch (err: any) {
    console.error(`[dispatch-order] Erro fatal:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}