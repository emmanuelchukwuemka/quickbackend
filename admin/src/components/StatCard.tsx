import { Users, User, Car, Wallet, Clock, XCircle, ArrowUp, ArrowDown, Minus, type LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  users: Users,
  user: User,
  car: Car,
  wallet: Wallet,
  clock: Clock,
  xCircle: XCircle,
};

const colorMap: Record<string, string> = {
  green: 'bg-emerald-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  purple: 'bg-violet-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

interface StatCardProps {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'flat' | 'link';
  icon: string;
  color: string;
}

export default function StatCard({ label, value, delta, trend, icon, color }: StatCardProps) {
  const Icon = iconMap[icon] ?? Users;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white ${colorMap[color]}`}>
          <Icon size={20} />
        </span>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="mt-3 text-2xl font-semibold text-gray-900">{value}</p>
      {trend === 'link' && (
        <button type="button" className="mt-1 text-xs font-medium text-blue-600 hover:underline">
          {delta}
        </button>
      )}
      {trend === 'up' && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-emerald-600">
          <ArrowUp size={12} />
          {delta}
        </p>
      )}
      {trend === 'down' && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
          <ArrowDown size={12} />
          {delta}
        </p>
      )}
      {trend === 'flat' && (
        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-gray-400">
          <Minus size={12} />
          {delta}
        </p>
      )}
    </div>
  );
}
