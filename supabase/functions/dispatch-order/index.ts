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
    const { orderId, driverId: specificDriverId } = await req.json()
    
    if (orderId) {
      return await matchOrderToDriver(supabaseAdmin, orderId);
    } else if (specificDriverId) {
      return await matchDriverToOrders(supabaseAdmin, specificDriverId);
    }

    return new Response(JSON.stringify({ success: false, error: 'Missing parameters' }));

  } catch (err: any) {
    console.error(`[dispatch-order] Erro fatal:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})

async function matchOrderToDriver(supabase, orderId) {
    console.log(`[dispatch-order] Buscando entregador para pedido: ${orderId}`);
    
    const { data: order } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('id', orderId).single();
    if (!order || ['CANCELLED', 'DELIVERED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
        return new Response(JSON.stringify({ success: false, reason: 'order_status_not_eligible' }));
    }

    const storeAddr = order.merchant?.metadata?.store_details?.address || order.merchant?.metadata?.address;
    if (!storeAddr) return new Response(JSON.stringify({ success: false, error: 'store_address_missing' }));

    const { data: drivers } = await supabase.from('driver_applications').select('id').eq('status', 'APPROVED');
    const { data: locations } = await supabase.from('driver_locations').select('*');
    const { data: activeOrders } = await supabase.from('orders').select('*').not('status', 'in', '(DELIVERED,CANCELLED)');

    const candidates = drivers?.map(driver => {
      const loc = locations?.find(l => l.driver_id === driver.id);
      if (!loc) return null;
      
      // Se o motorista já recusou este pedido especificamente
      if ((order.refused_drivers_ids || []).includes(driver.id)) return null;

      const currentDriverOrders = activeOrders?.filter(o => o.driver_id === driver.id) || [];
      if (currentDriverOrders.length >= 3) return null;

      const driverLat = parseFloat(loc.latitude);
      const driverLng = parseFloat(loc.longitude);
      const storeLat = parseFloat(storeAddr.lat);
      const storeLng = parseFloat(storeAddr.lng);

      const distToStore = calculateDistance(driverLat, driverLng, storeLat, storeLng);
      
      let score = 1000 - (distToStore * 50);
      let synergyBonus = 0;

      if (currentDriverOrders.length > 0) {
          const fromSameStore = currentDriverOrders.some(o => o.merchant_id === order.merchant_id);
          if (fromSameStore) {
              const firstDest = currentDriverOrders[0].delivery_address;
              const distBetweenDestinations = calculateDistance(
                  parseFloat(firstDest.lat), parseFloat(firstDest.lng),
                  parseFloat(order.delivery_address.lat), parseFloat(order.delivery_address.lng)
              );

              if (distBetweenDestinations > 4) return null; 
              synergyBonus += 500;
              
              const isSameCustomer = currentDriverOrders.some(o => o.customer_id === order.customer_id);
              if (isSameCustomer) synergyBonus += 1000;
          } else {
              score -= 300;
          }
      } else {
          score += 200;
      }

      return { id: driver.id, score: score + synergyBonus };
    }).filter(c => c !== null).sort((a, b) => b.score - a.score);

    const winner = candidates?.[0];
    if (winner) {
      const { data: config } = await supabase.from('app_settings').select('value').eq('key', 'driver_offer_timeout').single();
      const expiresAt = new Date(Date.now() + ((config?.value?.seconds || 30) * 1000)).toISOString();
      
      await supabase.from('orders').update({ 
          current_driver_offered_id: winner.id, 
          offer_expires_at: expiresAt 
      }).eq('id', orderId);

      console.log(`[dispatch-order] Oferta enviada para o entregador ${winner.id}`);
      return new Response(JSON.stringify({ success: true, driverId: winner.id }));
    }

    return new Response(JSON.stringify({ success: false, reason: 'no_candidates_found' }));
}

async function matchDriverToOrders(supabase, driverId) {
    console.log(`[dispatch-order] Buscando trabalho elegível para o entregador: ${driverId}`);
    
    // CORREÇÃO CRUCIAL: Busca pedidos que estão PENDING, PREPARING ou WAITING_FOR_DRIVER
    // que ainda não têm entregador nem oferta ativa.
    const { data: eligibleOrders } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['PENDING', 'PREPARING', 'WAITING_FOR_DRIVER'])
        .is('driver_id', null)
        .is('current_driver_offered_id', null)
        .order('created_at', { ascending: true }); // Prioriza o mais antigo

    if (!eligibleOrders || eligibleOrders.length === 0) {
        console.log(`[dispatch-order] Nenhum pedido elegível encontrado para o entregador ${driverId}`);
        return new Response(JSON.stringify({ success: false, reason: 'no_eligible_orders' }));
    }

    // Filtra ordens que este motorista já recusou
    const availableOrder = eligibleOrders.find(o => !(o.refused_drivers_ids || []).includes(driverId));

    if (!availableOrder) {
        return new Response(JSON.stringify({ success: false, reason: 'all_eligible_orders_previously_refused' }));
    }

    // Tenta casar o entregador com este pedido
    return await matchOrderToDriver(supabase, availableOrder.id);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}