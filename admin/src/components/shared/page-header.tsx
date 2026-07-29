import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

/** Хуудасны нэгдсэн толгой: гарчиг + дэд тайлбар + баруун талын үйлдлүүд. */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconColor = '#007AFF',
  actions,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconColor?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${iconColor}14` }}>
            <Icon className="w-5 h-5" style={{ color: iconColor }} />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[24px] lg:text-[28px] font-bold text-[#1A1D26] tracking-tight truncate">{title}</h1>
          {subtitle && <p className="text-[13px] lg:text-[14px] text-[#8C8FA3] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}
