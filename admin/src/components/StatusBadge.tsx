const styles: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-600',
  blue: 'bg-blue-50 text-blue-600',
  red: 'bg-red-50 text-red-600',
  amber: 'bg-amber-50 text-amber-600',
  gray: 'bg-gray-100 text-gray-500',
};

interface StatusBadgeProps {
  label: string;
  tone: keyof typeof styles;
}

export default function StatusBadge({ label, tone }: StatusBadgeProps) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${styles[tone]}`}>{label}</span>;
}
