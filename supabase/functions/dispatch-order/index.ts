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

    // 1. Buscar detalhes do pedido e do restaurante
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, merchant:merchant_id(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error("Pedido não encontrado")
    if (order.driver_id || order.status === 'CANCELLED') return new Response(JSON.stringify({ status: 'already_handled' }), { headers: corsHeaders })

    // Busca robusta de coordenadas
    const meta = order.merchant?.metadata || {}
    const addr = meta.store_details?.address || meta.address || {}
    const storeLat = parseFloat(addr.lat)
    const storeLng = parseFloat(addr.lng)

    console.log(`[dispatch-order] Coordenadas Loja: ${storeLat}, ${storeLng}`);

    if (isNaN(storeLat) || isNaN(storeLng)) {
        console.error("[dispatch-order] Loja sem coordenadas válidas.");
        return new Response(JSON.stringify({ error: 'merchant_no_location' }), { status: 200, headers: corsHeaders })
    }

    // 2. Buscar entregadores ativos
    const now = new Date().toISOString()
    const { data: drivers } = await supabaseAdmin
      .from('driver_applications')
      .select('id, full_name')
      .eq('status', 'APPROVED')
      .or(`blocked_until.lt.${now},blocked_until.is.null`)

    if (!drivers || drivers.length === 0) {
        console.log("[dispatch-order] Nenhum entregador aprovado no sistema.");
        return new Response(JSON.stringify({ success: false, reason: 'no_drivers_approved' }), { headers: corsHeaders })
    }

    const refusedIds = order.refused_drivers_ids || []
    const availableDrivers = drivers.filter(d => !refusedIds.includes(d.id))

    // 3. Cruzar com localizações GPS
    const { data: locations } = await supabaseAdmin
      .from('driver_locations')
      .select('*')
      .in('driver_id', availableDrivers.map(d => d.id))

    // 4. Ranking
    const rankedDrivers = availableDrivers.map(driver => {
      const loc = locations?.find(l => l.driver_id === driver.id)
      if (!loc) return { ...driver, score: -1, distance: 999 }

      const dist = calculateDistance(storeLat, storeLng, parseFloat(loc.latitude), parseFloat(loc.longitude))
      return { ...driver, score: (20 - dist), distance: dist }
    })
    .filter(d => d.distance <= 10.0 && d.score !== -1) // Aumentado para 10km para testes
    .sort((a, b) => b.score - a.score)

    const nextDriver = rankedDrivers[0]

    if (nextDriver) {
      const expiresAt = new Date(Date.now() + 65000).toISOString() // 65s para margem de erro
      
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ 
          current_driver_offered_id: nextDriver.id,
          offer_expires_at: expiresAt
        })
        .eq('id', orderId)

      if (updateError) throw updateError
      console.log(`[dispatch-order] Pedido ${orderId} OFERTADO para ${nextDriver.full_name} (${nextDriver.distance.toFixed(2)}km)`);
      
      return new Response(JSON.stringify({ success: true, driverId: nextDriver.id }), { headers: corsHeaders })
    } else {
      console.log(`[dispatch-order] Nenhum entregador num raio de 10km para o pedido ${orderId}`);
      return new Response(JSON.stringify({ success: false, reason: 'no_drivers_nearby' }), { headers: corsHeaders })
    }

  } catch (err: any) {
    console.error("[dispatch-order] Erro fatal:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}