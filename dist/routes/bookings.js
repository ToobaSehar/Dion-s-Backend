"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const supabase_1 = require("../lib/supabase");
const auth_1 = require("../middleware/auth");
const webhooks_1 = require("../lib/webhooks");
const router = express_1.default.Router();
const createBookingSchema = zod_1.z.object({
    property_id: zod_1.z.string().uuid(),
    start_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((data) => new Date(data.end_date) > new Date(data.start_date), {
    message: "End date must be after start date",
    path: ["end_date"],
});
router.get('/:id', auth_1.authenticateUser, async (req, res) => {
    try {
        const { id } = req.params;
        const { data: booking, error } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select(`
        *,
        property:properties(*),
        contractor:profiles!bookings_contractor_id_fkey(*),
        invoice:invoices(*)
      `)
            .eq('id', id)
            .single();
        if (error) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        if (req.user?.role !== 'admin' &&
            booking.contractor_id !== req.user?.id &&
            booking.property.owner_id !== req.user?.id) {
            return res.status(403).json({ error: 'Access denied' });
        }
        return res.json({ booking });
    }
    catch (error) {
        console.error('Error fetching booking:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.post('/create', auth_1.authenticateUser, auth_1.requireContractor, async (req, res) => {
    try {
        const validatedData = createBookingSchema.parse(req.body);
        const { data: property, error: propertyError } = await supabase_1.supabaseAdmin
            .from('properties')
            .select('*')
            .eq('id', validatedData.property_id)
            .single();
        if (propertyError || !property) {
            return res.status(404).json({ error: 'Property not found' });
        }
        const { data: booking, error: bookingError } = await supabase_1.supabaseAdmin
            .from('bookings')
            .insert({
            property_id: validatedData.property_id,
            contractor_id: req.user.id,
            start_date: validatedData.start_date,
            end_date: validatedData.end_date,
            status: 'pending',
        })
            .select(`
        *,
        property:properties(*),
        contractor:profiles!bookings_contractor_id_fkey(*)
      `)
            .single();
        if (bookingError) {
            console.error('Error creating booking:', bookingError);
            return res.status(500).json({ error: 'Failed to create booking' });
        }
        await (0, webhooks_1.sendWebhookEvent)('booking_created', {
            booking_id: booking.id,
            property_id: booking.property_id,
            contractor_id: booking.contractor_id,
            start_date: booking.start_date,
            end_date: booking.end_date,
            property_title: property.title,
            contractor_name: req.user.full_name,
        });
        return res.status(201).json({ booking });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors
            });
        }
        console.error('Error creating booking:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=bookings.js.map