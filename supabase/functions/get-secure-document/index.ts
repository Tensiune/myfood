import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    // Inicializa Supabase com a Service Role Key (Bypass RLS para gerar o link)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verifica a identidade do usuário que chamou a função
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))

    if (authError || !user || user.app_metadata?.role !== 'ADMIN' && user.user_metadata?.role !== 'ADMIN') {
      return new Response(JSON.stringify({ error: 'Acesso negado. Somente administradores.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const { filePath, bucket = 'driver-documents' } = await req.json()

    // Gera uma URL assinada que expira em 60 segundos
    const { data, error: storageError } = await supabaseAdmin
      .storage
      .from(bucket)
      .createSignedUrl(filePath, 60)

    if (storageError) throw storageError

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})