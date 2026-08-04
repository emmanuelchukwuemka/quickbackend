import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { EarningsPoint } from '../lib/dashboardStats';

function formatAxisNaira(value: number) {
  return `₦${(value / 1000).toFixed(0)}k`;
}

interface EarningsChartProps {
  data: EarningsPoint[];
}

export default function EarningsChart({ data }: EarningsChartProps) {
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="h-64">
      {!hasData && (
        <p className="mb-2 text-xs text-gray-400">No completed trips with earnings yet this week.</p>
      )}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#16A34A" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#16A34A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#EEF2F6" />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
          <YAxis tickFormatter={formatAxisNaira} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} />
          <Tooltip
            formatter={(value) => [`₦${Number(value).toLocaleString()}`, 'Earnings']}
            contentStyle={{ borderRadius: 8, borderColor: '#E5E7EB', fontSize: 13 }}
          />
          <Area type="monotone" dataKey="value" stroke="#16A34A" strokeWidth={2} fill="url(#earningsFill)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
