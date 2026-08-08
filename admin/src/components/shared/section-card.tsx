import type { ReactNode } from 'react';

/** Нэгдсэн хэсэг карт: гарчиг + баруун талын үйлдэл + агуулга. */
export function SectionCard({
  title,
  action,
  children,
  className = '',
  noPadding = false,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between gap-3 px-4 lg:px-5 py-3 border-b border-[#F0F2F5]">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#8C8FA3]">{title}</h3>
          {action}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4 lg:p-5'}>{children}</div>
    </div>
  );
}
