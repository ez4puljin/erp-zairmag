import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type StatGradient = 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'teal' | 'pink' | 'indigo';

const GRADIENTS: Record<StatGradient, string> = {
  blue: 'linear-gradient(135deg, #007AFF, #5AC8FA)',
  green: 'linear-gradient(135deg, #34C759, #30D158)',
  orange: 'linear-gradient(135deg, #FF9500, #FFCC00)',
  red: 'linear-gradient(135deg, #FF3B30, #FF6961)',
  purple: 'linear-gradient(135deg, #AF52DE, #BF5AF2)',
  teal: 'linear-gradient(135deg, #5AC8FA, #64D2FF)',
  pink: 'linear-gradient(135deg, #FF2D55, #FF375F)',
  indigo: 'linear-gradient(135deg, #5856D6, #7A79E0)',
};

/** Gradient KPI карт (dashboard/products/reports-д жигд). */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  gradient = 'blue',
  index = 0,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  gradient?: StatGradient;
  index?: number;
}) {
  return (
    <div
      className={`rounded-2xl p-4 lg:p-5 text-white shadow-lg animate-ios-slide-up stagger-${(index % 5) + 1}`}
      style={{ background: GRADIENTS[gradient] }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[12px] font-medium text-white/80">{label}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      <div className="text-[20px] lg:text-[26px] font-bold mt-2 leading-tight tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-white/70 mt-0.5">{hint}</div>}
    </div>
  );
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const lg = cols === 2 ? 'lg:grid-cols-2' : cols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-4';
  return <div className={`grid grid-cols-2 ${lg} gap-3`}>{children}</div>;
}
