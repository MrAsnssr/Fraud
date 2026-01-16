import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@11.1.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
    apiVersion: '2022-11-15',
    httpClient: Stripe.createFetchHttpClient(),
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

serve(async (req) => {
    const signature = req.headers.get('stripe-signature')

    try {
        const body = await req.text()
        let event

        if (endpointSecret) {
            event = await stripe.webhooks.constructEventAsync(body, signature!, endpointSecret)
        } else {
            event = JSON.parse(body)
        }

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object
            const userId = session.metadata.user_id
            const creditsToAdd = parseInt(session.metadata.credits)

            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            // Fetch current credits
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('credits')
                .eq('id', userId)
                .single()

            if (profile) {
                const newCredits = (profile.credits || 0) + creditsToAdd
                await supabaseAdmin
                    .from('profiles')
                    .update({ credits: newCredits })
                    .eq('id', userId)

                console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`)
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 })
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`)
        return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
})
