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
    console.log(`[dispatch-order] Iniciando despacho para o pedido: ${orderId}`);

    // 1. Buscar o pedido
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error(`Pedido não encontrado: ${orderError?.message}`);
    
    // 2. Buscar dados da loja (coordenadas)
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchant_applications')
      .select('*')
      .eq('id', order.merchant_id)
      .single()

    if (merchantError || !merchant) throw new Error("Lojista não encontrado.");

    const meta = merchant.metadata || {}
    const addr = meta.store_details?.address || meta.address || {}
    const storeLat = parseFloat(addr.lat)
    const storeLng = parseFloat(addr.lng)

    if (isNaN(storeLat) || isNaN(storeLng)) {
        throw new Error("Loja sem coordenadas válidas no sistema.");
    }

    // 3. Buscar entregadores aprovados e suas localizações
    const { data: drivers, error: driversError } = await supabaseAdmin
      .from('driver_applications')
      .select('id, full_name')
      .eq('status', 'APPROVED')

    if (driversError) throw driversError;
    if (!drivers || drivers.length === 0) {
        console.log("[dispatch-order] Nenhum entregador aprovado no sistema.");
        return new Response(JSON.stringify({ success: false, reason: 'no_approved_drivers' }), { headers: corsHeaders });
    }

    const { data: locations } = await supabaseAdmin
      .from('driver_locations')
      .select('driver_id, latitude, longitude')

    const MAX_DISTANCE_KM = 50.0; 
    const refusedIds = order.refused_drivers_ids || [];

    // Calcular distâncias e filtrar quem está perto e não recusou
    const availableDrivers = drivers.map(d => {
        const loc = locations?.find(l => l.driver_id === d.id);
        if (!loc) return { ...d, distance: 99999 };
        
        const dist = calculateDistance(storeLat, storeLng, parseFloat(loc.latitude), parseFloat(loc.longitude));
        return { ...d, distance: dist, hasRefused: refusedIds.includes(d.id) };
    }).filter(d => d.distance <= MAX_DISTANCE_KM && !d.hasRefused);

    console.log(`[dispatch-order] Entregadores disponíveis no raio: ${availableDrivers.length}`);

    // Ordenar pelo mais próximo
    const nextDriver = availableDrivers.sort((a, b) => a.distance - b.distance)[0];

    if (nextDriver) {
      const expiresAt = new Date(Date.now() + 60000).toISOString(); // 1 minuto para aceitar
      
      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({
          current_driver_offered_id: nextDriver.id,
          offer_expires_at: expiresAt,
        })
        .eq('id', orderId);

      if (updateError) throw updateError;

      console.log(`[dispatch-order] Pedido oferecido com sucesso para: ${nextDriver.full_name}`);
      return new Response(JSON.stringify({ success: true, driverId: nextDriver.id }), { headers: corsHeaders });
    }

    console.log("[dispatch-order] Nenhum entregador disponível ou todos já recusaram.");
    return new Response(JSON.stringify({ success: false, reason: 'no_drivers_nearby' }), { headers: corsHeaders });

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