import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_BUNDLE_ID = 'ng.quickdrop.rider';

let cachedKeys: { keys: any[] } | null = null;
let cachedAt = 0;

const fetchAppleKeys = async () => {
  const now = Date.now();
  if (cachedKeys && now - cachedAt < 60 * 60 * 1000) return cachedKeys;
  const res = await fetch(APPLE_KEYS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Apple signing keys (${res.status})`);
  cachedKeys = (await res.json()) as { keys: any[] };
  cachedAt = now;
  return cachedKeys;
};

// Verifies an Apple identity token entirely with Node's built-in crypto +
// jsonwebtoken - no jwks-rsa dependency needed, since crypto.createPublicKey
// accepts a JWK directly (Node 12+) and can export it straight to PEM.
export const verifyAppleIdentityToken = async (
  identityToken: string
): Promise<{ sub: string; email?: string }> => {
  const headerB64 = identityToken.split('.')[0];
  const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));

  const { keys } = await fetchAppleKeys();
  const jwk = keys.find((k: any) => k.kid === header.kid);
  if (!jwk) throw new Error('No matching Apple signing key found');

  const publicKey = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  const pem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  const payload = jwt.verify(identityToken, pem, {
    algorithms: ['RS256'],
    issuer: APPLE_ISSUER,
    audience: APPLE_BUNDLE_ID,
  }) as jwt.JwtPayload;

  return { sub: payload.sub as string, email: payload.email as string | undefined };
};
