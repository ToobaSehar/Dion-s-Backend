"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendToExternalService = exports.sendWebhookEvent = void 0;
const axios_1 = __importDefault(require("axios"));
const sendWebhookEvent = async (eventType, data) => {
    const ghlWebhookUrl = process.env.GHL_WEBHOOK_URL;
    if (!ghlWebhookUrl) {
        console.log(`GHL webhook URL not configured, skipping ${eventType} event`);
        return;
    }
    try {
        const payload = {
            event_type: eventType,
            data,
            timestamp: new Date().toISOString(),
            source: 'property-booking-system',
        };
        await axios_1.default.post(ghlWebhookUrl, payload, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Property-Booking-System/1.0',
            },
        });
        console.log(`Successfully sent ${eventType} webhook to GHL`);
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error(`Failed to send ${eventType} webhook to GHL:`, {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message,
            });
        }
        else {
            console.error(`Error sending ${eventType} webhook:`, error);
        }
    }
};
exports.sendWebhookEvent = sendWebhookEvent;
const sendToExternalService = async (serviceUrl, payload) => {
    try {
        await axios_1.default.post(serviceUrl, payload, {
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Property-Booking-System/1.0',
            },
        });
        console.log(`Successfully sent payload to ${serviceUrl}`);
    }
    catch (error) {
        console.error(`Failed to send payload to ${serviceUrl}:`, error);
        throw error;
    }
};
exports.sendToExternalService = sendToExternalService;
//# sourceMappingURL=webhooks.js.map