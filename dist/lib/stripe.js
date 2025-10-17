"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructWebhookEvent = exports.createCheckoutSession = exports.stripe = void 0;
const stripe_1 = __importDefault(require("stripe"));
exports.stripe = process.env.STRIPE_SECRET_KEY
    ? new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2023-10-16',
    })
    : null;
const createCheckoutSession = async (bookingId, amount, successUrl, cancelUrl) => {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.');
    }
    const session = await exports.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: 'Property Booking',
                        description: `Booking ID: ${bookingId}`,
                    },
                    unit_amount: Math.round(amount * 100),
                },
                quantity: 1,
            },
        ],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            bookingId,
        },
    });
    return session;
};
exports.createCheckoutSession = createCheckoutSession;
const constructWebhookEvent = (body, signature) => {
    if (!exports.stripe) {
        throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.');
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
        throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
    }
    return exports.stripe.webhooks.constructEvent(body, signature, webhookSecret);
};
exports.constructWebhookEvent = constructWebhookEvent;
//# sourceMappingURL=stripe.js.map