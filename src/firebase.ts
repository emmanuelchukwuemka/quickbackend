import * as admin from 'firebase-admin';

let initialized = false;

function init() {
  if (initialized) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
    return;
  }
  try {
    const serviceAccount = JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    console.log('[FCM] firebase-admin initialized');
  } catch (e) {
    console.error('[FCM] Failed to init firebase-admin:', e);
  }
}

init();

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string> = {}
): Promise<void> {
  if (!initialized || tokens.length === 0) return;
  const valid = tokens.filter(Boolean);
  if (valid.length === 0) return;
  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens: valid,
      notification: { title, body },
      data,
      android: { priority: 'high' },
    });
    console.log(`[FCM] sent ${response.successCount}/${valid.length} messages`);
  } catch (e) {
    console.error('[FCM] send error:', e);
  }
}
