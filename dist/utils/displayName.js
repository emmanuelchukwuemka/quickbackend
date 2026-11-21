"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpFallbackDisplayName = exports.sanitizeDisplayName = void 0;
const emailLikePattern = /@/;
const sanitizeDisplayName = (value) => {
    const raw = (value || '').trim();
    if (!raw)
        return '';
    if (emailLikePattern.test(raw))
        return '';
    return raw;
};
exports.sanitizeDisplayName = sanitizeDisplayName;
const otpFallbackDisplayName = (role, phoneNumber) => {
    const phone = (phoneNumber || '').trim();
    if (phone)
        return phone;
    return role === 'driver' ? 'Driver' : 'Passenger';
};
exports.otpFallbackDisplayName = otpFallbackDisplayName;
