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

    console.warn("[dispatch-order] Parâmetros ausentes no corpo da requisição");
    return new Response(JSON.stringify({ success: false, error: 'Missing parameters' }), { headers: corsHeaders });

  } catch (err: any) {
    console.error(`[dispatch-order] Erro fatal:`, err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})

async function matchOrderToDriver(supabase, orderId) {
    console.log(`[dispatch-order] Buscando entregador para pedido: ${orderId}`);
    
    const { data: order, error: orderErr } = await supabase.from('orders').select('*, merchant:merchant_applications(*)').eq('id', orderId).single();
    
    if (orderErr || !order) {
        console.error("[dispatch-order] Pedido não encontrado ou erro no DB", { orderErr });
        return new Response(JSON.stringify({ success: false, reason: 'order_not_found' }), { headers: corsHeaders });
    }

    // Se o pedido explicitamente estiver em modo OWN, não deve rodar despacho automático
    if (order.logistics_mode === 'OWN' && !order.driver_id) {
        console.log(`[dispatch-order] Pedido ${orderId} está em modo FROTA PRÓPRIA. Ignorando despacho automático.`);
        return new Response(JSON.stringify({ success: true, reason: 'own_fleet_mode' }), { headers: corsHeaders });
    }

    if (['CANCELLED', 'DELIVERED', 'OUT_FOR_DELIVERY'].includes(order.status)) {
        console.log(`[dispatch-order] Pedido ${orderId} está em status não elegível: ${order.status}`);
        return new Response(JSON.stringify({ success: false, reason: 'status_ineligible' }), { headers: corsHeaders });
    }

    const storeAddr = order.merchant?.metadata?.store_details?.address || order.merchant?.metadata?.address;
    if (!storeAddr) {
        console.error("[dispatch-order] Endereço da loja ausente para o pedido", orderId);
        return new Response(JSON.stringify({ success: false, error: 'store_address_missing' }), { headers: corsHeaders });
    }

    const { data: drivers } = await supabase.from('driver_applications').select('*').eq('status', 'APPROVED');
    const { data: locations } = await supabase.from('driver_locations').select('*');
    const { data: activeOrders } = await supabase.from('orders').select('*').not('status', 'in', '(DELIVERED,CANCELLED)');

    console.log(`[dispatch-order] Candidatos iniciais: ${drivers?.length || 0} entregadores aprovados.`);

    const candidates = drivers?.map(driver => {
      const loc = locations?.find(l => l.driver_id === driver.id);
      if (!loc) return null;
      
      // EXCLUSIVIDADE: Se o entregador estiver em modo exclusivo, ele é ignorado para o radar público
      if (driver.metadata?.is_exclusive === true) {
          return null;
      }

      if ((order.refused_drivers_ids || []).includes(driver.id)) {
          console.log(`[dispatch-order] Entregador ${driver.id} ignorado (já recusou este pedido)`);
          return null;
      }

      const currentDriverOrders = activeOrders?.filter(o => o.driver_id === driver.id) || [];
      if (currentDriverOrders.length >= 3) {
          console.log(`[dispatch-order] Entregador ${driver.id} ignorado (limite de 3 pedidos atingido)`);
          return null;
      }

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

              if (distBetweenDestinations > 4) {
                  console.log(`[dispatch-order] Entregador ${driver.id} ignorado (desvio de rota > 4km)`);
                  return null; 
              }
              synergyBonus += 500;
              
              const isSameCustomer = currentDriverOrders.some(o => o.customer_id === order.customer_id);
              if (isSameCustomer) synergyBonus += 1000;
          } else {
              score -= 300; // Penalidade por ser de loja diferente (dar chance a outros)
          }
      } else {
          score += 200; // Bônus por estar totalmente ocioso
      }

      return { id: driver.id, score: score + synergyBonus };
    }).filter(c => c !== null).sort((a, b) => b.score - a.score);

    const winner = candidates?.[0];
    if (winner) {
      const { data: config } = await supabase.from('app_settings').select('value').eq('key', 'driver_offer_timeout').single();
      const expiresAt = new Date(Date.now() + ((config?.value?.seconds || 30) * 1000)).toISOString();
      
      const { error: updErr } = await supabase.from('orders').update({ 
          current_driver_offered_id: winner.id, 
          offer_expires_at: expiresAt 
      }).eq('id', orderId);

      if (updErr) {
          console.error("[dispatch-order] Erro ao salvar oferta no DB", updErr);
          throw updErr;
      }

      console.log(`[dispatch-order] Oferta enviada com sucesso para o entregador ${winner.id}`);
      return new Response(JSON.stringify({ success: true, driverId: winner.id }), { headers: corsHeaders });
    }

    console.warn("[dispatch-order] Nenhum entregador elegível encontrado no momento.");
    return new Response(JSON.stringify({ success: false, reason: 'no_candidates_found' }), { headers: corsHeaders });
}

async function matchDriverToOrders(supabase, driverId) {
    console.log(`[dispatch-order] Buscando trabalho para o entregador: ${driverId}`);
    
    // Verifica se o entregador é exclusivo. Se for, ele não busca pedidos da rede pública.
    const { data: driverProfile } = await supabase.from('driver_applications').select('metadata').eq('id', driverId).single();
    if (driverProfile?.metadata?.is_exclusive === true) {
        return new Response(JSON.stringify({ success: true, reason: 'driver_exclusive_mode' }), { headers: corsHeaders });
    }

    const { data: eligibleOrders } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['PENDING', 'PREPARING', 'WAITING_FOR_DRIVER'])
        .eq('logistics_mode', 'APP') // Só busca pedidos em modo APP
        .is('driver_id', null)
        .is('current_driver_offered_id', null)
        .order('created_at', { ascending: true });

    if (!eligibleOrders || eligibleOrders.length === 0) {
        console.log(`[dispatch-order] Entregador ${driverId} está livre mas não há pedidos disponíveis.`);
        return new Response(JSON.stringify({ success: false, reason: 'no_eligible_orders' }), { headers: corsHeaders });
    }

    const availableOrder = eligibleOrders.find(o => !(o.refused_drivers_ids || []).includes(driverId));

    if (!availableOrder) {
        console.log(`[dispatch-order] Entregador ${driverId} já recusou todos os pedidos pendentes.`);
        return new Response(JSON.stringify({ success: false, reason: 'all_refused' }), { headers: corsHeaders });
    }

    console.log(`[dispatch-order] Auto-match: Vinculando entregador ${driverId} ao pedido ${availableOrder.id}`);
    return await matchOrderToDriver(supabase, availableOrder.id);
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}