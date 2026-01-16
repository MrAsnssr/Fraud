import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const PAYMOB_API_KEY = Deno.env.get('PAYMOB_API_KEY')
const PAYMOB_INTEGRATION_ID = Deno.env.get('PAYMOB_INTEGRATION_ID') || '47812'
const PAYMOB_IFRAME_ID = Deno.env.get('PAYMOB_IFRAME_ID') || '42769'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (userError || !user) throw new Error('Unauthorized')

        const { bundleId, credits } = await req.json()

        // Pricing Mapping (Baisa - 1000 = 1 OMR)
        const pricing: Record<string, number> = {
            'bundle_small': 500,   // 0.500 OMR
            'bundle_medium': 2000, // 2.000 OMR
            'bundle_large': 5000,  // 5.000 OMR
        }

        const amountBaisa = pricing[bundleId] || 500

        // STEP 1: Authentication
        const authRes = await fetch("https://oman.paymob.com/api/auth/tokens", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ api_key: PAYMOB_API_KEY }),
        })
        const { token } = await authRes.json()

        // STEP 2: Order Registration
        const orderRes = await fetch("https://oman.paymob.com/api/ecommerce/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth_token: token,
                delivery_needed: "false",
                amount_cents: amountBaisa.toString(), // Paymob calls it amount_cents but in Oman it is Baisa
                currency: "OMR",
                items: [],
            }),
        })
        const { id: order_id } = await orderRes.json()

        // STEP 3: Payment Key Generation
        const keyRes = await fetch("https://oman.paymob.com/api/acceptance/payment_keys", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                auth_token: token,
                amount_cents: amountBaisa.toString(),
                expiration: 3600,
                order_id: order_id,
                billing_data: {
                    apartment: "NA",
                    email: user.email,
                    floor: "NA",
                    first_name: user.email?.split('@')[0] || "Agent",
                    street: "NA",
                    building: "NA",
                    phone_number: "NA",
                    shipping_method: "NA",
                    postal_code: "NA",
                    city: "NA",
                    country: "OM",
                    last_name: "NA",
                    state: "NA",
                },
                currency: "OMR",
                integration_id: PAYMOB_INTEGRATION_ID,
            }),
        })
        const { token: payment_token } = await keyRes.json()

        const checkoutUrl = `https://oman.paymob.com/api/acceptance/iframes/${PAYMOB_IFRAME_ID}?payment_token=${payment_token}`

        return new Response(
            JSON.stringify({ url: checkoutUrl }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
