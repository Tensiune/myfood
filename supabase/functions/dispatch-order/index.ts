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
    console.log(`[Dispatch] Iniciando busca para pedido: ${orderId}`);

    // 1. Buscar detalhes do pedido e do restaurante
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, merchant:merchant_id(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error("Pedido não encontrado")

    // Se já tem motorista ou foi cancelado, encerra
    if (order.driver_id || order.status === 'CANCELLED') {
       return new Response(JSON.stringify({ status: 'already_handled' }), { headers: corsHeaders })
    }

    const merchantMeta = order.merchant?.metadata || {}
    const storeAddress = merchantMeta.store_details?.address || merchantMeta.address || {}
    const storeLat = parseFloat(storeAddress.lat)
    const storeLng = parseFloat(storeAddress.lng)

    if (!storeLat || !storeLng) throw new Error("Localização do lojista não encontrada.");

    // 2. Buscar TODOS os entregadores aprovados e não bloqueados
    const refusedIds = order.refused_drivers_ids || []
    const now = new Date().toISOString()
    
    const { data: drivers, error: driversError } = await supabaseAdmin
      .from('driver_applications')
      .select('id, full_name, metadata, status, phone')
      .eq('status', 'APPROVED')
      .or(`blocked_until.lt.${now},blocked_until.is.null`)

    if (driversError) throw driversError

    // 3. Filtrar quem já recusou este pedido específico
    const availableDrivers = drivers.filter(d => !refusedIds.includes(d.id))

    // 4. Buscar localizações atuais de quem está online
    const { data: locations } = await supabaseAdmin
      .from('driver_locations')
      .select('*')
      .in('driver_id', availableDrivers.map(d => d.id))

    // 5. Verificar quem está em entrega ativa (Busy)
    const { data: activeDeliveries } = await supabaseAdmin
      .from('orders')
      .select('driver_id')
      .in('status', ['OUT_FOR_DELIVERY', 'WAITING_FOR_DRIVER'])
      .not('driver_id', 'is', null)

    const busyDriverIds = activeDeliveries?.map(d => d.driver_id) || []

    // 6. Aplicar Ranking e Filtro de 5km
    const rankedDrivers = availableDrivers.map(driver => {
      const loc = locations?.find(l => l.driver_id === driver.id)
      if (!loc) return { ...driver, score: -1, distance: 999 }

      const dist = calculateDistance(storeLat, storeLng, parseFloat(loc.latitude), parseFloat(loc.longitude))
      
      const isBusy = busyDriverIds.includes(driver.id)
      const rating = driver.metadata?.rating || 5.0

      // Lógica de Score: 
      // - Prioridade Máxima: Disponibilidade (Bônus de 1000 pontos)
      // - Prioridade 2: Distância (Inversamente proporcional)
      // - Prioridade 3: Avaliação (Desempate)
      let score = 0
      if (!isBusy) score += 1000 
      score += (20 - dist) * 10 // Perto da loja ganha mais pontos
      score += (rating * 5)

      return { ...driver, score, distance: dist }
    })
    // REGRA DE OURO: Apenas dentro de 5km
    .filter(d => d.distance <= 5.0 && d.score !== -1) 
    .sort((a, b) => b.score - a.score)

    const nextDriver = rankedDrivers[0]

    if (nextDriver) {
      // 7. Ofertar por 60 segundos
      const expiresAt = new Date(Date.now() + 60000).toISOString()
      
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ 
          current_driver_offered_id: nextDriver.id,
          offer_expires_at: expiresAt
        })
        .eq('id', orderId)

      if (updateError) throw updateError

      console.log(`[Dispatch] Pedido ${orderId} ofertado para ${nextDriver.full_name} (${nextDriver.distance.toFixed(2)}km)`);
      
      return new Response(JSON.stringify({ success: true, driverId: nextDriver.id }), { headers: corsHeaders })
    } else {
      console.log(`[Dispatch] Nenhum entregador qualificado num raio de 5km para o pedido ${orderId}`);
      return new Response(JSON.stringify({ success: false, reason: 'no_drivers_nearby' }), { headers: corsHeaders })
    }

  } catch (err: any) {
    console.error("[Dispatch] Erro fatal:", err.message);
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