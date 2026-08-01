import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

let initialized = false;

function init() {
  if (initialized || getApps().length > 0) { initialized = true; return; }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.warn('[FCM] FIREBASE_SERVICE_ACCOUNT not set — push notifications disabled');
    return;
  }
  try {
    const serviceAccount = JSON.parse(raw);
    initializeApp({ credential: cert(serviceAccount) });
    initialized = true;
    console.error('[FCM] firebase-admin initialized for project', serviceAccount.project_id);
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
    const messaging = getMessaging();
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
  } catch (e) {
    console.error('[FCM] send error:', e);
  }
}
