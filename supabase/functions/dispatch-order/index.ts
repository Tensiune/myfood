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
    console.log(`[dispatch-order] Processando pedido: ${orderId}`);

    // 1. Buscar o pedido e sua localização (loja)
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, merchant:merchant_applications(*)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error("Pedido não encontrado")
    
    // O pedido deve estar em preparo ou já aguardando motorista
    if (order.status !== 'PREPARING' && order.status !== 'WAITING_FOR_DRIVER') {
        console.log(`[dispatch-order] Pedido ${orderId} não está em status de despacho (${order.status}). Abortando.`);
        return new Response(JSON.stringify({ success: true, message: 'Order status does not require dispatch' }), { headers: corsHeaders });
    }

    // Verificação de Timeout: Se já havia um motorista e o tempo passou, move para recusados
    if (order.current_driver_offered_id && order.offer_expires_at) {
        const isExpired = new Date(order.offer_expires_at).getTime() < Date.now();
        if (isExpired) {
            console.log(`[dispatch-order] Timeout detectado para motorista ${order.current_driver_offered_id}. Movendo para lista de recusa.`);
            const updatedRefused = Array.from(new Set([...(order.refused_drivers_ids || []), order.current_driver_offered_id]));
            await supabaseAdmin.from('orders').update({
                current_driver_offered_id: null,
                offer_expires_at: null,
                refused_drivers_ids: updatedRefused
            }).eq('id', orderId);
            order.refused_drivers_ids = updatedRefused;
        } else {
            return new Response(JSON.stringify({ success: true, message: 'Offer still active' }), { headers: corsHeaders });
        }
    }

    const meta = order.merchant?.metadata || {}
    const addr = meta.store_details?.address || meta.address || {}
    const storeLat = parseFloat(addr.lat)
    const storeLng = parseFloat(addr.lng)

    // 2. Buscar motoristas aprovados
    const { data: drivers } = await supabaseAdmin
      .from('driver_applications')
      .select('id, full_name')
      .eq('status', 'APPROVED')

    if (!drivers || drivers.length === 0) return new Response(JSON.stringify({ success: false, reason: 'no_drivers' }), { headers: corsHeaders })

    // 3. Buscar localizações atuais
    const { data: locations } = await supabaseAdmin.from('driver_locations').select('driver_id, latitude, longitude')

    // Aumentamos o raio para 15km para facilitar testes em diferentes cidades
    const MAX_DISTANCE_KM = 15.0; 
    const refusedIds = order.refused_drivers_ids || [];

    // 4. Filtrar e Rankear motoristas
    const availableDrivers = drivers.map(d => {
        const loc = locations?.find(l => l.driver_id === d.id);
        if (!loc) return { ...d, distance: 999, hasRefused: refusedIds.includes(d.id) };
        const dist = calculateDistance(storeLat, storeLng, parseFloat(loc.latitude), parseFloat(loc.longitude));
        return { ...d, distance: dist, hasRefused: refusedIds.includes(d.id) };
    }).filter(d => d.distance <= MAX_DISTANCE_KM);

    let nextDriver = availableDrivers
        .filter(d => !d.hasRefused)
        .sort((a, b) => a.distance - b.distance)[0];

    if (!nextDriver && availableDrivers.length > 0) {
        console.log("[dispatch-order] Fallback: Oferecendo novamente para quem já recusou.");
        nextDriver = availableDrivers.sort((a, b) => a.distance - b.distance)[0];
    }

    if (nextDriver) {
      const expiresAt = new Date(Date.now() + 60000).toISOString();
      
      await supabaseAdmin
        .from('orders')
        .update({
          current_driver_offered_id: nextDriver.id,
          offer_expires_at: expiresAt,
          // REMOVIDO: status: 'WAITING_FOR_DRIVER' - Mantemos o status atual do lojista
        })
        .eq('id', orderId);

      console.log(`[dispatch-order] Oferta enviada para: ${nextDriver.full_name}`);
      return new Response(JSON.stringify({ success: true, driverId: nextDriver.id }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: false, reason: 'no_available_drivers_in_range' }), { headers: corsHeaders });

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