"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const router = express_1.default.Router();
const ghlWebhookSchema = zod_1.z.object({
    event_type: zod_1.z.string(),
    data: zod_1.z.record(zod_1.z.any()),
    timestamp: zod_1.z.string().optional(),
});
router.post('/ghl', async (req, res) => {
    try {
        const validatedData = ghlWebhookSchema.parse(req.body);
        const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
        if (!ghlWebhookUrl) {
            console.warn('GHL_WEBHOOK_URL not configured, skipping webhook forwarding');
            return res.json({ message: 'GHL webhook URL not configured' });
        }
        const response = await axios_1.default.post(ghlWebhookUrl, {
            ...validatedData,
            source: 'property-booking-system',
            forwarded_at: new Date().toISOString(),
        }, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Property-Booking-System/1.0',
            },
        });
        console.log(`Successfully forwarded ${validatedData.event_type} to GHL:`, response.status);
        return res.json({
            success: true,
            forwarded: true,
            ghl_response_status: response.status
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors
            });
        }
        if (axios_1.default.isAxiosError(error)) {
            console.error('Error forwarding to GHL:', error.response?.data || error.message);
            return res.status(502).json({
                error: 'Failed to forward to GoHighLevel',
                details: error.response?.data
            });
        }
        console.error('Error processing GHL webhook:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/events', (req, res) => {
    const eventTypes = [
        {
            event_type: 'booking_created',
            description: 'Triggered when a new booking is created by a contractor',
            payload: {
                booking_id: 'string',
                property_id: 'string',
                contractor_id: 'string',
                start_date: 'string',
                end_date: 'string',
                property_title: 'string',
                contractor_name: 'string',
            },
        },
        {
            event_type: 'booking_confirmed',
            description: 'Triggered when an admin confirms or cancels a booking',
            payload: {
                booking_id: 'string',
                property_id: 'string',
                contractor_id: 'string',
                status: 'confirmed|cancelled',
                property_title: 'string',
                contractor_name: 'string',
                admin_name: 'string',
            },
        },
        {
            event_type: 'payment_succeeded',
            description: 'Triggered when a payment is successfully completed',
            payload: {
                booking_id: 'string',
                stripe_session_id: 'string',
                amount_paid: 'number',
                payment_status: 'string',
            },
        },
        {
            event_type: 'payment_expired',
            description: 'Triggered when a payment session expires',
            payload: {
                booking_id: 'string',
                stripe_session_id: 'string',
            },
        },
    ];
    res.json({
        available_events: eventTypes,
        webhook_url: process.env.GHL_WEBHOOK_URL ? 'configured' : 'not configured',
    });
});
exports.default = router;
//# sourceMappingURL=integrations.js.map