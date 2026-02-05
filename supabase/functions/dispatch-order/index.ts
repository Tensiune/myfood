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
    const body = await req.json()
    const { orderId, driverId: specificDriverId } = body
    
    console.log("[dispatch-order] Requisição recebida", { orderId, specificDriverId });
    
    if (orderId) {
      return await matchOrderToDriver(supabaseAdmin, orderId);
    } else if (specificDriverId) {
      return await matchDriverToOrders(supabaseAdmin, specificDriverId);
    }

    return new Response(JSON.stringify({ success: false, error: 'Parâmetros ausentes' }), { headers: corsHeaders });

  } catch (err: any) {
    console.error(`[dispatch-order] Erro fatal:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 200, headers: corsHeaders })
  }
})

async function matchOrderToDriver(supabase, orderId) {
    const { data: order, error: orderErr } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('id', orderId).single();
    
    if (orderErr || !order) return new Response(JSON.stringify({ success: false, reason: 'order_not_found' }), { headers: corsHeaders });

    // Proteção: Se o pedido for frota própria, não despacha automaticamente
    if (order.logistics_mode === 'OWN') {
        return new Response(JSON.stringify({ success: true, reason: 'own_fleet_mode' }), { headers: corsHeaders });
    }

    if (['CANCELLED', 'DELIVERED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
        return new Response(JSON.stringify({ success: false, reason: 'status_ineligible' }), { headers: corsHeaders });
    }

    const storeAddr = order.merchant?.metadata?.store_details?.address || order.merchant?.metadata?.address;
    if (!storeAddr || !storeAddr.lat || !storeAddr.lng) {
        console.error("[dispatch-order] Endereço da loja incompleto", orderId);
        return new Response(JSON.stringify({ success: false, error: 'store_location_missing' }), { headers: corsHeaders });
    }

    const { data: drivers } = await supabase.from('driver_applications').select('*').eq('status', 'APPROVED');
    const { data: locations } = await supabase.from('driver_locations').select('*');
    const { data: activeOrders } = await supabase.from('orders').select('*').not('status', 'in', '(DELIVERED,CANCELLED)');

    const storeLat = parseFloat(storeAddr.lat);
    const storeLng = parseFloat(storeAddr.lng);

    const candidates = (drivers || []).map(driver => {
      const loc = locations?.find(l => l.driver_id === driver.id);
      if (!loc || !loc.latitude || !loc.longitude) return null;
      
      if (driver.metadata?.is_exclusive === true) return null;

      if ((order.refused_drivers_ids || []).includes(driver.id)) return null;

      const currentDriverOrders = activeOrders?.filter(o => o.driver_id === driver.id) || [];
      if (currentDriverOrders.length >= 3) return null;

      const distToStore = calculateDistance(parseFloat(loc.latitude), parseFloat(loc.longitude), storeLat, storeLng);
      
      let score = 1000 - (distToStore * 50);
      if (currentDriverOrders.length === 0) score += 200;

      return { id: driver.id, score };
    }).filter(c => c !== null).sort((a, b) => (b?.score || 0) - (a?.score || 0));

    const winner = candidates?.[0];
    if (winner) {
      const { data: config } = await supabase.from('app_settings').select('value').eq('key', 'driver_offer_timeout').single();
      const expiresAt = new Date(Date.now() + ((config?.value?.seconds || 30) * 1000)).toISOString();
      
      await supabase.from('orders').update({ 
          current_driver_offered_id: winner.id, 
          offer_expires_at: expiresAt 
      }).eq('id', orderId);

      return new Response(JSON.stringify({ success: true, driverId: winner.id }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: false, reason: 'no_candidates' }), { headers: corsHeaders });
}

async function matchDriverToOrders(supabase, driverId) {
    const { data: driverProfile } = await supabase.from('driver_applications').select('metadata').eq('id', driverId).single();
    if (driverProfile?.metadata?.is_exclusive === true) return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

    const { data: eligibleOrders } = await supabase
        .from('orders')
        .select('id, refused_drivers_ids')
        .in('status', ['PENDING', 'PREPARING', 'WAITING_FOR_DRIVER'])
        .eq('logistics_mode', 'APP')
        .is('driver_id', null)
        .is('current_driver_offered_id', null)
        .order('created_at', { ascending: true });

    if (!eligibleOrders || eligibleOrders.length === 0) return new Response(JSON.stringify({ success: false }), { headers: corsHeaders });

    const availableOrder = eligibleOrders.find(o => !(o.refused_drivers_ids || []).includes(driverId));
    if (!availableOrder) return new Response(JSON.stringify({ success: false }), { headers: corsHeaders });

    return await matchOrderToDriver(supabase, availableOrder.id);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}