"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAppleIdentityToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const APPLE_KEYS_URL = 'https://appleid.apple.com/auth/keys';
const APPLE_ISSUER = 'https://appleid.apple.com';
const APPLE_BUNDLE_ID = 'ng.quickdrop.rider';
let cachedKeys = null;
let cachedAt = 0;
const fetchAppleKeys = async () => {
    const now = Date.now();
    if (cachedKeys && now - cachedAt < 60 * 60 * 1000)
        return cachedKeys;
    let res;
    try {
        res = await fetch(APPLE_KEYS_URL, { signal: AbortSignal.timeout(8000) });
    }
    catch (err) {
        throw new Error(err?.name === 'TimeoutError' || err?.name === 'AbortError'
            ? 'Timed out reaching Apple signing key server'
            : `Failed to reach Apple signing key server: ${err.message}`);
    }
    if (!res.ok)
        throw new Error(`Failed to fetch Apple signing keys (${res.status})`);
    cachedKeys = (await res.json());
    cachedAt = now;
    return cachedKeys;
};
// Verifies an Apple identity token entirely with Node's built-in crypto +
// jsonwebtoken - no jwks-rsa dependency needed, since crypto.createPublicKey
// accepts a JWK directly (Node 12+) and can export it straight to PEM.
const verifyAppleIdentityToken = async (identityToken) => {
    const headerB64 = identityToken.split('.')[0];
    const header = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    const { keys } = await fetchAppleKeys();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk)
        throw new Error('No matching Apple signing key found');
    const publicKey = crypto_1.default.createPublicKey({ key: jwk, format: 'jwk' });
    const pem = publicKey.export({ type: 'spki', format: 'pem' });
    const payload = jsonwebtoken_1.default.verify(identityToken, pem, {
        algorithms: ['RS256'],
        issuer: APPLE_ISSUER,
        audience: APPLE_BUNDLE_ID,
    });
    return { sub: payload.sub, email: payload.email };
};
exports.verifyAppleIdentityToken = verifyAppleIdentityToken;
