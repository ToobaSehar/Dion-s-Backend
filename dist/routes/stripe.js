"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("../lib/supabase");
const stripe_1 = require("../lib/stripe");
const webhooks_1 = require("../lib/webhooks");
const router = express_1.default.Router();
const createSessionSchema = zod_1.z.object({
    booking_id: zod_1.z.string().uuid(),
});
router.post('/create-session', async (req, res) => {
    try {
        const validatedData = createSessionSchema.parse(req.body);
        const { data: booking, error: bookingError } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select(`
        *,
        property:properties(*)
      `)
            .eq('id', validatedData.booking_id)
            .single();
        if (bookingError || !booking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        const startDate = new Date(booking.start_date);
        const endDate = new Date(booking.end_date);
        const numberOfDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const totalAmount = booking.property.price * numberOfDays;
        const session = await (0, stripe_1.createCheckoutSession)(booking.id, totalAmount, `${process.env.FRONTEND_URL}/contractor?payment=success`, `${process.env.FRONTEND_URL}/contractor?payment=cancelled`);
        const { data: invoice, error: invoiceError } = await supabase_1.supabaseAdmin
            .from('invoices')
            .insert({
            booking_id: booking.id,
            stripe_session_id: session.id,
            stripe_payment_url: session.url,
            amount: totalAmount,
            status: 'unpaid',
        })
            .select()
            .single();
        if (invoiceError) {
            console.error('Error creating invoice:', invoiceError);
            return res.status(500).json({ error: 'Failed to create invoice' });
        }
        return res.json({
            session_id: session.id,
            payment_url: session.url,
            invoice
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors
            });
        }
        console.error('Error creating Stripe session:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
    try {
        const signature = req.headers['stripe-signature'];
        if (!signature) {
            return res.status(400).json({ error: 'Missing stripe signature' });
        }
        const event = (0, stripe_1.constructWebhookEvent)(req.body, signature);
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const bookingId = session.metadata?.bookingId;
                if (!bookingId) {
                    console.error('Missing bookingId in session metadata');
                    return res.status(400).json({ error: 'Missing booking ID' });
                }
                const { error: invoiceError } = await supabase_1.supabaseAdmin
                    .from('invoices')
                    .update({
                    status: 'paid',
                    updated_at: new Date().toISOString()
                })
                    .eq('stripe_session_id', session.id);
                if (invoiceError) {
                    console.error('Error updating invoice:', invoiceError);
                    return res.status(500).json({ error: 'Failed to update invoice' });
                }
                const { error: bookingError } = await supabase_1.supabaseAdmin
                    .from('bookings')
                    .update({
                    status: 'paid',
                    updated_at: new Date().toISOString()
                })
                    .eq('id', bookingId);
                if (bookingError) {
                    console.error('Error updating booking:', bookingError);
                    return res.status(500).json({ error: 'Failed to update booking' });
                }
                await (0, webhooks_1.sendWebhookEvent)('payment_succeeded', {
                    booking_id: bookingId,
                    stripe_session_id: session.id,
                    amount_paid: (session.amount_total || 0) / 100,
                    payment_status: session.payment_status,
                });
                console.log(`Payment succeeded for booking ${bookingId}`);
                break;
            }
            case 'checkout.session.expired': {
                const session = event.data.object;
                const bookingId = session.metadata?.bookingId;
                if (bookingId) {
                    await (0, webhooks_1.sendWebhookEvent)('payment_expired', {
                        booking_id: bookingId,
                        stripe_session_id: session.id,
                    });
                }
                console.log(`Payment session expired for booking ${bookingId}`);
                break;
            }
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        return res.json({ received: true });
    }
    catch (error) {
        console.error('Stripe webhook error:', error);
        return res.status(400).json({ error: 'Webhook signature verification failed' });
    }
});
exports.default = router;
//# sourceMappingURL=stripe.js.map