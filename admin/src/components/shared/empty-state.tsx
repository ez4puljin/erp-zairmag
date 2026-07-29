import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Хоосон төлөв — жагсаалт/хүснэгт хоосон үед. */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-2xl bg-[#F2F4F7] flex items-center justify-center mb-1">
          <Icon className="w-6 h-6 text-[#8C8FA3]" />
        </div>
      )}
      <p className="text-[15px] font-semibold text-[#1A1D26]">{title}</p>
      {hint && <p className="text-[13px] text-[#8C8FA3] max-w-sm">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
