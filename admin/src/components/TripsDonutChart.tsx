import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { TripSegment } from '../lib/dashboardStats';

interface TripsDonutChartProps {
  total: number;
  segments: TripSegment[];
}

export default function TripsDonutChart({ total, segments }: TripsDonutChartProps) {
  if (total === 0) {
    return (
      <div className="flex h-44 items-center justify-center text-center text-sm text-gray-400">
        No trips recorded yet.
      </div>
    );
  }

  return (
    <div>
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="count"
              nameKey="label"
              innerRadius={55}
              outerRadius={75}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              stroke="none"
            >
              {segments.map((s) => (
                <Cell key={s.label} fill={s.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-semibold text-gray-900">{total.toLocaleString()}</p>
          <p className="text-xs text-gray-400">Total Trips</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
            <span className="font-medium text-gray-700">
              {s.count.toLocaleString()} ({s.percent}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
