import Stripe from 'stripe';
export declare const stripe: Stripe | null;
export declare const createCheckoutSession: (bookingId: string, amount: number, successUrl: string, cancelUrl: string) => Promise<Stripe.Response<Stripe.Checkout.Session>>;
export declare const constructWebhookEvent: (body: string | Buffer, signature: string) => Stripe.Event;
//# sourceMappingURL=stripe.d.ts.map