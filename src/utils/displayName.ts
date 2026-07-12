const emailLikePattern = /@/;

export const sanitizeDisplayName = (value?: string | null) => {
  const raw = (value || '').trim();
  if (!raw) return '';
  if (emailLikePattern.test(raw)) return '';
  return raw;
};

export const otpFallbackDisplayName = (role: 'driver' | 'passenger', phoneNumber?: string | null) => {
  const phone = (phoneNumber || '').trim();
  if (phone) return phone;
  return role === 'driver' ? 'Driver' : 'Passenger';
};
