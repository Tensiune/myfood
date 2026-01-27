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

    // 1. Buscar detalhes do pedido e do restaurante
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, merchant:merchant_id(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error("Pedido não encontrado")

    // Se o pedido já tem motorista ou foi cancelado, para aqui
    if (order.driver_id || order.status === 'CANCELLED') {
       return new Response(JSON.stringify({ status: 'already_handled' }), { headers: corsHeaders })
    }

    const merchantMeta = order.merchant?.metadata || {}
    const storeAddress = merchantMeta.store_details?.address || merchantMeta.address || {}
    const storeLat = parseFloat(storeAddress.lat)
    const storeLng = parseFloat(storeAddress.lng)

    // 2. Buscar entregadores online e não bloqueados
    // Filtrar entregadores que já recusaram este pedido
    const refusedIds = order.refused_drivers_ids || []
    
    const { data: drivers, error: driversError } = await supabaseAdmin
      .from('driver_applications')
      .select('id, full_name, metadata, status')
      .eq('status', 'APPROVED')
      .or(`blocked_until.lt.${new Date().toISOString()},blocked_until.is.null`)
      .not('id', 'in', `(${refusedIds.join(',') || '00000000-0000-0000-0000-000000000000'})`)

    if (driversError) throw driversError

    // 3. Buscar localizações e status de rota dos entregadores
    const { data: locations } = await supabaseAdmin
      .from('driver_locations')
      .select('*')
      .in('driver_id', drivers.map(d => d.id))

    // 4. Lógica de Ranking
    const rankedDrivers = drivers.map(driver => {
      const loc = locations?.find(l => l.driver_id === driver.id)
      if (!loc) return { ...driver, score: -1, distance: 999 }

      const dist = calculateDistance(storeLat, storeLng, parseFloat(loc.latitude), parseFloat(loc.longitude))
      
      // Regra 1: Disponibilidade (não pode estar em OUT_FOR_DELIVERY em outro pedido)
      // Aqui simplificaremos: daremos um bônus imenso para quem está "livre"
      const isBusy = false; // TODO: Adicionar checagem de pedidos ativos do driver
      
      // Critério de desempate (avaliação mockada)
      const rating = driver.metadata?.rating || 5.0

      let score = 100 - dist; // Quanto mais perto, maior score
      if (isBusy) score -= 50; 
      score += (rating * 2);

      return { ...driver, score, distance: dist }
    })
    .filter(d => d.distance <= 5.0 && d.score !== -1) // Limite de 5km
    .sort((a, b) => b.score - a.score)

    const nextDriver = rankedDrivers[0]

    if (nextDriver) {
      // 5. Ofertar para o entregador por 60 segundos
      const expiresAt = new Date(Date.now() + 60000).toISOString()
      
      await supabaseAdmin
        .from('orders')
        .update({ 
          current_driver_offered_id: nextDriver.id,
          offer_expires_at: expiresAt
        })
        .eq('id', orderId)

      console.log(`[Dispatch] Pedido ${orderId} ofertado para ${nextDriver.full_name}`);
      
      return new Response(JSON.stringify({ success: true, driverId: nextDriver.id }), { headers: corsHeaders })
    } else {
      console.log(`[Dispatch] Nenhum entregador disponível para o pedido ${orderId}`);
      return new Response(JSON.stringify({ success: false, reason: 'no_drivers' }), { headers: corsHeaders })
    }

  } catch (err: any) {
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