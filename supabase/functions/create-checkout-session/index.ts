import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

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

        // Bundle Mapping (Match app/shop.tsx)
        const bundles: Record<string, { amount: number, name: string }> = {
            'bundle_small': { amount: 500, name: '500 Credits' }, // 0.500 OMR = 50 cents (approx)
            'bundle_medium': { amount: 2000, name: '2500 Credits' }, // 2.000 OMR = 200 cents
            'bundle_large': { amount: 5000, name: '7500 Credits' }, // 5.000 OMR = 500 cents
        }

        // Note: Stripe uses smallest currency unit (cents). 
        // For OMR, it might need specific setup, but using USD/Cents as base is common.
        // Adjusting amount for testing in Cents:
        const pricing: Record<string, number> = {
            'bundle_small': 50,  // $0.50
            'bundle_medium': 200, // $2.00
            'bundle_large': 500, // $5.00
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: bundles[bundleId]?.name || 'Credits',
                        },
                        unit_amount: pricing[bundleId] || 50,
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.headers.get('origin')}/shop?status=success`,
            cancel_url: `${req.headers.get('origin')}/shop?status=cancel`,
            customer_email: user.email,
            metadata: {
                user_id: user.id,
                credits: credits.toString(),
            },
        })

        return new Response(
            JSON.stringify({ url: session.url }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
    }
})
