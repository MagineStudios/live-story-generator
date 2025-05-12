// src/app/api/stripe/checkout/route.ts
import Stripe from 'stripe';
import { auth } from '@clerk/nextjs/server';

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: Request) {
    const { userId } = await auth();
    const { packId } = await req.json();
    //
    // const session = await stripe.checkout.sessions.create({
    //     mode: 'payment',
    //     payment_method_types: ['card'],
    //     line_items: [{ price: packId, quantity: 1 }],
    //     success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?paid=1`,
    //     cancel_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
    //     metadata: { userId },
    // });

    return; //Response.json({ url: session.url });
}