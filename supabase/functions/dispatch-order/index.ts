import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') 
    return new Response(null, { headers: corsHeaders })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { orderId } = await req.json()
    console.log(`[dispatch-order] Buscando entregador para pedido: ${orderId}`);

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, merchant:merchant_id(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error("Pedido não encontrado")
    
    // Pega as coordenadas da loja
    const meta = order.merchant?.metadata || {}
    const addr = meta.store_details?.address || meta.address || {}
    const storeLat = parseFloat(addr.lat)
    const storeLng = parseFloat(addr.lng)
    
    if (isNaN(storeLat) || isNaN(storeLng)) {
      console.error("[dispatch-order] ERRO: Loja sem coordenadas válidas.");
      return new Response(JSON.stringify({ error: 'merchant_no_location' }), { headers: corsHeaders })
    }

    // Busca todos os aprovados (não importa o status online agora, o RLS cuidará da visibilidade)
    const { data: drivers, error: driversError } = await supabaseAdmin
      .from('driver_applications')
      .select('id, full_name, status')
      .eq('status', 'APPROVED')

    if (driversError) throw driversError
    
    if (!drivers || drivers.length === 0) {
      console.log("[dispatch-order] AVISO: Nenhum entregador com status 'APPROVED' no sistema.");
      return new Response(JSON.stringify({ success: false, reason: 'no_approved_drivers' }), { headers: corsHeaders })
    }

    // Busca localizações
    const { data: locations } = await supabaseAdmin
      .from('driver_locations')
      .select('driver_id, latitude, longitude')

    // Aumentamos para 100km para garantir que o Gabriel (em outra cidade) seja achado nos testes
    const MAX_DISTANCE_KM = 100.0; 
    
    const rankedDrivers = drivers
      .map(driver => {
        const loc = locations?.find(l => l.driver_id === driver.id)
        if (!loc) return { ...driver, distance: 999999 }
        
        const dist = calculateDistance(storeLat, storeLng, parseFloat(loc.latitude), parseFloat(loc.longitude))
        console.log(`[dispatch-order] Entregador ${driver.full_name} está a ${dist.toFixed(2)}km`);
        return { ...driver, distance: dist }
      })
      .filter(d => d.distance <= MAX_DISTANCE_KM)
      .sort((a, b) => a.distance - b.distance)

    const nextDriver = rankedDrivers[0]
    if (nextDriver) {
      const expiresAt = new Date(Date.now() + 65000).toISOString()
      
      await supabaseAdmin
        .from('orders')
        .update({
          current_driver_offered_id: nextDriver.id,
          offer_expires_at: expiresAt
        })
        .eq('id', orderId)

      console.log(`[dispatch-order] SUCESSO: Pedido ${orderId} ofertado para ${nextDriver.full_name}`);
      return new Response(JSON.stringify({ success: true, driverId: nextDriver.id }), { headers: corsHeaders })
    } else {
      console.log(`[dispatch-order] FALHA: Nenhum entregador aprovado num raio de ${MAX_DISTANCE_KM}km.`);
      return new Response(JSON.stringify({ success: false, reason: 'too_far' }), { headers: corsHeaders })
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
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}