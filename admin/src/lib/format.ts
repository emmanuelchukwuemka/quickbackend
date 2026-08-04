export function formatNaira(value: number): string {
  if (value >= 1_000_000) return `₦${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `₦${(value / 1_000).toFixed(1)}k`;
  return `₦${Math.round(value).toLocaleString()}`;
}

export function formatNumber(value: number): string {
  return value.toLocaleString();
}

export function formatDate(value?: string): string {
  if (!value) return 'Unknown date';
  return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export function formatTime(value?: string): string {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}
