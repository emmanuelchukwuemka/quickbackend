import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Panel({ title, action, children, className = '' }: PanelProps) {
  return (
    <div className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm md:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
