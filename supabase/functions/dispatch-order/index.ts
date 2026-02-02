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
    console.log(`[dispatch-order] Iniciando inteligência para pedido: ${orderId}`);

    // 1. Dados do Pedido e da Loja
    const { data: order } = await supabaseAdmin.from('orders').select('*, merchant:merchant_applications(*)').eq('id', orderId).single()
    if (!order || order.status === 'CANCELLED') return new Response(JSON.stringify({ success: false }))

    const storeAddr = order.merchant?.metadata?.store_details?.address || order.merchant?.metadata?.address;
    const storeLat = parseFloat(storeAddr.lat);
    const storeLng = parseFloat(storeAddr.lng);

    // 2. Buscar Entregadores e Configurações
    const { data: config } = await supabaseAdmin.from('app_settings').select('value').eq('key', 'driver_offer_timeout').single();
    const timeoutSeconds = config?.value?.seconds || 30;

    const { data: drivers } = await supabaseAdmin.from('driver_applications').select('id, status').eq('status', 'APPROVED');
    const { data: locations } = await supabaseAdmin.from('driver_locations').select('*');
    
    // Buscar pedidos ativos para verificar carga dos entregadores
    const { data: activeOrders } = await supabaseAdmin.from('orders').select('id, driver_id, status, delivery_address').not('status', 'in', '(DELIVERED,CANCELLED)');

    const refusedIds = order.refused_drivers_ids || [];

    // 3. Cálculo de SCORE para cada entregador
    const candidates = drivers?.map(driver => {
      const location = locations?.find(l => l.driver_id === driver.id);
      if (!location || refusedIds.includes(driver.id)) return null;

      const driverLat = parseFloat(location.latitude);
      const driverLng = parseFloat(location.longitude);
      const distToStore = calculateDistance(driverLat, driverLng, storeLat, storeLng);
      
      const driverOrders = activeOrders?.filter(o => o.driver_id === driver.id) || [];
      const isIdle = driverOrders.length === 0;

      // REGRAS DE NEGÓCIO:
      // a) Limite de carga: Max 3 pedidos
      if (driverOrders.length >= 3) return null;

      // b) Score Base: Proximidade (Inverso da distância)
      let score = 1000 - (distToStore * 50);

      // c) Inteligência de Agrupamento (Batching Bonus)
      if (!isIdle) {
          const currentDest = driverOrders[0].delivery_address;
          const deviation = calculateRouteDeviation([driverLat, driverLng], [currentDest.lat, currentDest.lng], [storeLat, storeLng]);
          
          // Se o desvio for menor que 3km, é um ótimo candidato para agrupamento
          if (deviation < 3.0) {
              score += 500; // Bônus alto para otimizar rota
          } else if (deviation > 6.0) {
              score -= 300; // Penaliza se for longe do caminho atual
          }
      } else {
          score += 200; // Bônus por ociosidade (distribuir renda)
      }

      return { id: driver.id, score, distance: distToStore };
    }).filter(c => c !== null).sort((a, b) => b.score - a.score);

    const winner = candidates?.[0];

    if (winner) {
      console.log(`[dispatch-order] Vencedor: ${winner.id} com score ${winner.score}`);
      const expiresAt = new Date(Date.now() + (timeoutSeconds * 1000)).toISOString();
      
      await supabaseAdmin
        .from('orders')
        .update({
          current_driver_offered_id: winner.id,
          offer_expires_at: expiresAt,
        })
        .eq('id', orderId);

      return new Response(JSON.stringify({ success: true, driverId: winner.id }));
    }

    return new Response(JSON.stringify({ success: false, reason: 'no_candidates' }));

  } catch (err: any) {
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

function calculateRouteDeviation(current, dest, waypoint) {
    const d1 = calculateDistance(current[0], current[1], waypoint[0], waypoint[1]);
    const d2 = calculateDistance(waypoint[0], waypoint[1], dest[0], dest[1]);
    const original = calculateDistance(current[0], current[1], dest[0], dest[1]);
    return (d1 + d2) - original;
}