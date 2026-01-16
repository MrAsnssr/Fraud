import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const HMAC_SECRET = Deno.env.get('PAYMOB_HMAC_SECRET')

async function verifyHmac(data: any, hmacHeader: string) {
    if (!HMAC_SECRET) return true; // Skip if no secret set (not recommended for production)

    const { obj } = data;

    // Paymob HMAC calculation order for Transaction Webhook
    const variables = [
        obj.amount_cents,
        obj.created_at,
        obj.currency,
        obj.error_occured,
        obj.has_parent_transaction,
        obj.id,
        obj.integration_id,
        obj.is_3d_secure,
        obj.is_auth,
        obj.is_capture,
        obj.is_refunded,
        obj.is_standalone_payment,
        obj.is_voided,
        obj.order.id,
        obj.owner,
        obj.pending,
        obj.source_data.pan,
        obj.source_data.sub_type,
        obj.source_data.type,
        obj.success,
    ].map(String).join('');

    const encoder = new TextEncoder();
    const keyData = encoder.encode(HMAC_SECRET);
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        encoder.encode(variables)
    );

    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex === hmacHeader;
}

serve(async (req) => {
    try {
        const url = new URL(req.url);
        const hmacHeader = url.searchParams.get('hmac');

        const body = await req.json();

        if (hmacHeader && !(await verifyHmac(body, hmacHeader))) {
            console.error("Invalid HMAC signature");
            return new Response("Invalid signature", { status: 401 });
        }

        const { obj } = body;

        if (obj.success === true) {
            const amountBaisa = obj.amount_cents;
            const userEmail = obj.order.shipping_data.email;

            const supabaseAdmin = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            );

            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, credits')
                .eq('email', userEmail)
                .single();

            if (profile) {
                const creditMapping: Record<number, number> = {
                    500: 500,
                    2000: 2500,
                    5000: 7500
                };

                const creditsToAdd = creditMapping[amountBaisa] || 0;
                const newCredits = (profile.credits || 0) + creditsToAdd;

                await supabaseAdmin
                    .from('profiles')
                    .update({ credits: newCredits })
                    .eq('id', profile.id);

                console.log(`Successfully added ${creditsToAdd} credits to user ${profile.id}`);
            }
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
})
