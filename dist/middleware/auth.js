"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireContractor = exports.requireLandlord = exports.requireAdmin = exports.requireRole = exports.authenticateUser = void 0;
const supabase_1 = require("../lib/supabase");
const authenticateUser = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid authorization header' });
        }
        const token = authHeader.substring(7);
        const { data: { user }, error: authError } = await supabase_1.supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        const { data: profile, error: profileError } = await supabase_1.supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
        if (profileError || !profile) {
            return res.status(401).json({ error: 'User profile not found' });
        }
        req.user = {
            id: user.id,
            role: profile.role,
            full_name: profile.full_name,
        };
        return next();
    }
    catch (error) {
        console.error('Authentication error:', error);
        return res.status(500).json({ error: 'Internal server error during authentication' });
    }
};
exports.authenticateUser = authenticateUser;
const requireRole = (allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        return next();
    };
};
exports.requireRole = requireRole;
exports.requireAdmin = (0, exports.requireRole)(['admin']);
exports.requireLandlord = (0, exports.requireRole)(['landlord', 'admin']);
exports.requireContractor = (0, exports.requireRole)(['contractor', 'admin']);
//# sourceMappingURL=auth.js.map