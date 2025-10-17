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
const confirmBookingSchema = zod_1.z.object({
    status: zod_1.z.enum(['confirmed', 'cancelled']),
});
router.get('/bookings', auth_1.authenticateUser, auth_1.requireAdmin, async (req, res) => {
    try {
        const { page = '1', limit = '20', status } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);
        let query = supabase_1.supabaseAdmin
            .from('bookings')
            .select(`
        *,
        property:properties(*),
        contractor:profiles!bookings_contractor_id_fkey(*),
        invoice:invoices(*)
      `)
            .order('created_at', { ascending: false });
        if (status) {
            query = query.eq('status', status);
        }
        const { data: bookings, error, count } = await query
            .range(offset, offset + parseInt(limit) - 1);
        if (error) {
            console.error('Error fetching bookings:', error);
            return res.status(500).json({ error: 'Failed to fetch bookings' });
        }
        return res.json({
            bookings,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: count || 0,
                pages: Math.ceil((count || 0) / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error('Error fetching admin bookings:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.put('/bookings/:id/confirm', auth_1.authenticateUser, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const validatedData = confirmBookingSchema.parse(req.body);
        const { data: currentBooking, error: fetchError } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select(`
        *,
        property:properties(*),
        contractor:profiles!bookings_contractor_id_fkey(*)
      `)
            .eq('id', id)
            .single();
        if (fetchError || !currentBooking) {
            return res.status(404).json({ error: 'Booking not found' });
        }
        const { data: booking, error: updateError } = await supabase_1.supabaseAdmin
            .from('bookings')
            .update({
            status: validatedData.status,
            updated_at: new Date().toISOString()
        })
            .eq('id', id)
            .select(`
        *,
        property:properties(*),
        contractor:profiles!bookings_contractor_id_fkey(*),
        invoice:invoices(*)
      `)
            .single();
        if (updateError) {
            console.error('Error updating booking:', updateError);
            return res.status(500).json({ error: 'Failed to update booking' });
        }
        await (0, webhooks_1.sendWebhookEvent)('booking_confirmed', {
            booking_id: booking.id,
            property_id: booking.property_id,
            contractor_id: booking.contractor_id,
            status: validatedData.status,
            property_title: booking.property.title,
            contractor_name: booking.contractor.full_name,
            admin_name: req.user.full_name,
        });
        return res.json({ booking });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.errors
            });
        }
        console.error('Error confirming booking:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
router.get('/dashboard', auth_1.authenticateUser, auth_1.requireAdmin, async (req, res) => {
    try {
        const [{ count: totalBookings }, { count: totalProperties }, { count: totalUsers }, { count: pendingBookings }, { count: paidBookings },] = await Promise.all([
            supabase_1.supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }),
            supabase_1.supabaseAdmin.from('properties').select('*', { count: 'exact', head: true }),
            supabase_1.supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
            supabase_1.supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase_1.supabaseAdmin.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'paid'),
        ]);
        const { data: recentBookings } = await supabase_1.supabaseAdmin
            .from('bookings')
            .select(`
        *,
        property:properties(title),
        contractor:profiles!bookings_contractor_id_fkey(full_name)
      `)
            .order('created_at', { ascending: false })
            .limit(5);
        return res.json({
            stats: {
                totalBookings,
                totalProperties,
                totalUsers,
                pendingBookings,
                paidBookings,
            },
            recentBookings,
        });
    }
    catch (error) {
        console.error('Error fetching admin dashboard:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map