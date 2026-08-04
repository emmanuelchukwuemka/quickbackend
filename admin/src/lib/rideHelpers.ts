export type StatusCategory = 'completed' | 'cancelled' | 'active';

export function statusCategory(status: string): StatusCategory {
  const s = status.toLowerCase();
  if (s === 'completed') return 'completed';
  if (s === 'cancelled') return 'cancelled';
  return 'active';
}

export function statusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function shortenAddress(address?: string): string {
  if (!address) return 'Unknown';
  const first = address.split(',')[0].trim();
  return first.length > 22 ? `${first.slice(0, 22)}…` : first || 'Unknown';
}
