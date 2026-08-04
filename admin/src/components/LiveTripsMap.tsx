import { Car } from 'lucide-react';

// Deterministic layout, not real GPS — there's no Maps/Mapbox API key wired
// up yet. Pin count reflects real in-progress rides; positions are just a
// stable spread so the panel doesn't look empty or jump around on refetch.
const SLOTS = [
  { top: '22%', left: '18%' },
  { top: '55%', left: '38%' },
  { top: '30%', left: '62%' },
  { top: '68%', left: '80%' },
  { top: '78%', left: '28%' },
  { top: '15%', left: '48%' },
  { top: '60%', left: '65%' },
  { top: '40%', left: '12%' },
];

interface LiveTripsMapProps {
  count: number;
}

export default function LiveTripsMap({ count }: LiveTripsMapProps) {
  const pins = SLOTS.slice(0, Math.min(count, SLOTS.length));
  const overflow = count - pins.length;

  return (
    <div>
      <p className="mb-2 text-xs text-gray-400">
        {count === 0 ? 'No trips currently in progress.' : `${count} trip${count === 1 ? '' : 's'} currently in progress`}
      </p>
      <div className="relative h-64 overflow-hidden rounded-lg bg-[#E3E9F0]">
        <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <path d="M0,80 C150,20 250,140 500,60" stroke="#C7D2E0" strokeWidth="10" fill="none" />
          <path d="M40,220 C180,180 320,260 480,190" stroke="#C7D2E0" strokeWidth="8" fill="none" />
          <path d="M120,0 L90,260" stroke="#C7D2E0" strokeWidth="6" fill="none" />
          <path d="M350,0 L380,260" stroke="#C7D2E0" strokeWidth="6" fill="none" />
        </svg>
        {pins.map((pos, i) => (
          <span
            key={i}
            className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md ring-4 ring-white/60"
            style={{ top: pos.top, left: pos.left }}
          >
            <Car size={14} />
          </span>
        ))}
        {overflow > 0 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-white px-2 py-1 text-xs font-medium text-gray-600 shadow">
            +{overflow} more
          </span>
        )}
      </div>
    </div>
  );
}
