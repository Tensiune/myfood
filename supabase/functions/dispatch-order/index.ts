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
    console.log(`[dispatch-order] Processando busca para pedido: ${orderId}`);

    // 1. Buscar o pedido e sua localização (loja)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, merchant:merchant_applications(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error("Pedido não encontrado")
    
    // O pedido deve estar em preparo ou já aguardando motorista
    if (order.status !== 'PREPARING' && order.status !== 'WAITING_FOR_DRIVER') {
        console.log(`[dispatch-order] Pedido ${orderId} ignorado pois status é ${order.status}`);
        return new Response(JSON.stringify({ success: true, message: 'Status does not require dispatch' }), { headers: corsHeaders });
    }

    const meta = order.merchant?.metadata || {}
    const addr = meta.store_details?.address || meta.address || {}
    const storeLat = parseFloat(addr.lat)
    const storeLng = parseFloat(addr.lng)

    // Log de coordenadas para depuração
    console.log(`[dispatch-order] Coordenadas da loja: ${storeLat}, ${storeLng}`);

    if (isNaN(storeLat) || isNaN(storeLng)) {
        console.error("[dispatch-order] Loja sem coordenadas válidas.");
        return new Response(JSON.stringify({ error: "Store missing coordinates" }), { status: 400, headers: corsHeaders });
    }

    // 2. Buscar motoristas aprovados
    const { data: drivers, error: driversError } = await supabaseAdmin
      .from('driver_applications')
      .select('id, full_name, status')
      .eq('status', 'APPROVED')

    if (driversError) throw driversError;

    if (!drivers || drivers.length === 0) {
        console.log("[dispatch-order] Nenhum entregador APROVADO encontrado no banco.");
        return new Response(JSON.stringify({ success: false, reason: 'no_approved_drivers' }), { headers: corsHeaders });
    }

    // 3. Buscar localizações atuais de quem está online
    const { data: locations } = await supabaseAdmin
      .from('driver_locations')
      .select('driver_id, latitude, longitude, updated_at')

    // Raio de busca estendido para testes: 50km
    const MAX_DISTANCE_KM = 50.0; 
    const refusedIds = order.refused_drivers_ids || [];

    // 4. Filtrar e Rankear motoristas por distância
    const availableDrivers = drivers.map(d => {
        const loc = locations?.find(l => l.driver_id === d.id);
        // Se não tem localização, está offline ou nunca abriu o app
        if (!loc) return { ...d, distance: 9999, hasRefused: refusedIds.includes(d.id) };
        
        const dist = calculateDistance(storeLat, storeLng, parseFloat(loc.latitude), parseFloat(loc.longitude));
        return { ...d, distance: dist, hasRefused: refusedIds.includes(d.id) };
    }).filter(d => d.distance <= MAX_DISTANCE_KM);

    console.log(`[dispatch-order] Entregadores no raio (${MAX_DISTANCE_KM}km): ${availableDrivers.length}`);

    // Tenta primeiro quem não recusou ainda
    let nextDriver = availableDrivers
        .filter(d => !d.hasRefused && d.distance < 9999)
        .sort((a, b) => a.distance - b.distance)[0];

    // Se todos recusaram, mas há motoristas no raio, oferece novamente para o mais perto
    if (!nextDriver && availableDrivers.filter(d => d.distance < 9999).length > 0) {
        console.log("[dispatch-order] Ciclo de recusa completo. Reiniciando oferta.");
        nextDriver = availableDrivers
          .filter(d => d.distance < 9999)
          .sort((a, b) => a.distance - b.distance)[0];
    }

    if (nextDriver) {
      // Oferta expira em 60 segundos
      const expiresAt = new Date(Date.now() + 60000).toISOString();
      
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          current_driver_offered_id: nextDriver.id,
          offer_expires_at: expiresAt,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      console.log(`[dispatch-order] Pedido ${orderId} oferecido para: ${nextDriver.full_name}`);
      return new Response(JSON.stringify({ success: true, driverId: nextDriver.id }), { headers: corsHeaders });
    }

    console.log("[dispatch-order] Nenhum entregador online encontrado próximo à loja.");
    return new Response(JSON.stringify({ success: false, reason: 'no_drivers_online' }), { headers: corsHeaders });

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
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
}