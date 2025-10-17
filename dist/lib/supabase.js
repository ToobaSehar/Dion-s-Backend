"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.supabaseAdmin = void 0;
require("dotenv/config");
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
}
exports.supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
//# sourceMappingURL=supabase.js.map