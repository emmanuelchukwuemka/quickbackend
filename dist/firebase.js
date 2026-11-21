"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushToTokens = sendPushToTokens;
const app_1 = require("firebase-admin/app");
const messaging_1 = require("firebase-admin/messaging");
let initialized = false;
function init() {
    if (initialized || (0, app_1.getApps)().length > 0) {
        initialized = true;
        return;
    }
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) {
        console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
        return;
    }
    try {
        const serviceAccount = JSON.parse(raw);
        (0, app_1.initializeApp)({ credential: (0, app_1.cert)(serviceAccount) });
        initialized = true;
        console.error('[FCM] firebase-admin initialized for project', serviceAccount.project_id);
    }
    catch (e) {
        console.error('[FCM] Failed to init firebase-admin:', e);
    }
}
init();
async function sendPushToTokens(tokens, title, body, data = {}) {
    if (!initialized || tokens.length === 0)
        return;
    const valid = tokens.filter(Boolean);
    if (valid.length === 0)
        return;
    try {
        const messaging = (0, messaging_1.getMessaging)();
        const response = await messaging.sendEachForMulticast({
            tokens: valid,
            notification: { title, body },
            data,
            android: {
                priority: 'high',
                notification: {
                    sound: 'default',
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        contentAvailable: true,
                    }
                }
            }
        });
        console.error(`[FCM] sent ${response.successCount}/${valid.length} messages`);
    }
    catch (e) {
        console.error('[FCM] send error:', e);
    }
}
