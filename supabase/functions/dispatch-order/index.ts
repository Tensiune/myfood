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

    // 1. Buscar o pedido
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) throw new Error("Pedido não encontrado.");
    
    // 2. Buscar coordenadas da loja
    const { data: merchant } = await supabaseAdmin
      .from('merchant_applications')
      .select('*')
      .eq('id', order.merchant_id)
      .single()

    const meta = merchant?.metadata || {}
    const addr = meta.store_details?.address || meta.address || {}
    const storeLat = parseFloat(addr.lat)
    const storeLng = parseFloat(addr.lng)

    // 3. Buscar configuração de timeout
    const { data: config } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'driver_offer_timeout')
      .single();
    
    const timeoutSeconds = config?.value?.seconds || 30;

    // 4. Buscar entregadores APROVADOS e suas localizações
    const { data: drivers } = await supabaseAdmin
      .from('driver_applications')
      .select('id, full_name')
      .eq('status', 'APPROVED')

    const { data: locations } = await supabaseAdmin.from('driver_locations').select('*')

    const MAX_DISTANCE_KM = 50.0; 
    const refusedIds = order.refused_drivers_ids || [];

    const availableDrivers = drivers?.map(d => {
        const loc = locations?.find(l => l.driver_id === d.id);
        if (!loc) return { ...d, distance: 99999, isNearby: false };
        
        const dist = calculateDistance(storeLat, storeLng, parseFloat(loc.latitude), parseFloat(loc.longitude));
        return { 
            ...d, 
            distance: dist, 
            isNearby: dist <= MAX_DISTANCE_KM,
            hasRefused: refusedIds.includes(d.id) 
        };
    }).filter(d => d.isNearby && !d.hasRefused) || [];

    const nextDriver = availableDrivers.sort((a, b) => a.distance - b.distance)[0];

    if (nextDriver) {
      // Calcula expiração baseada na configuração
      const expiresAt = new Date(Date.now() + (timeoutSeconds * 1000)).toISOString();
      
      await supabaseAdmin
        .from('orders')
        .update({
          current_driver_offered_id: nextDriver.id,
          offer_expires_at: expiresAt,
        })
        .eq('id', orderId);

      return new Response(JSON.stringify({ success: true, driverId: nextDriver.id }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: false, reason: 'no_drivers_found' }), { headers: corsHeaders });

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