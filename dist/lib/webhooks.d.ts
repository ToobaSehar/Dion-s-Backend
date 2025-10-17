interface WebhookPayload {
    [key: string]: any;
}
export declare const sendWebhookEvent: (eventType: string, data: WebhookPayload) => Promise<void>;
export declare const sendToExternalService: (serviceUrl: string, payload: WebhookPayload) => Promise<void>;
export {};
//# sourceMappingURL=webhooks.d.ts.map