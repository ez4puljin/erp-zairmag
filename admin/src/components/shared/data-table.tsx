'use client';

import type { ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  render?: (row: T, index: number) => ReactNode;
  className?: string;
}

/** Хариу үзүүлэх нэгдсэн хүснэгт (empty/loading/footer төлөвтэй, mobile-д хэвтээ гүйдэг). */
export function DataTable<T>({
  columns,
  rows,
  keyField,
  onRowClick,
  rowClassName,
  loading = false,
  empty,
  footer,
}: {
  columns: Column<T>[];
  rows: T[];
  keyField: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  footer?: ReactNode;
}) {
  const alignCls = (a?: 'left' | 'right' | 'center') =>
    a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

  if (loading) {
    return (
      <div className="py-16 text-center">
        <RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" />
      </div>
    );
  }

  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#F0F2F5]">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2.5 font-semibold text-[11px] uppercase tracking-wide text-[#8C8FA3] whitespace-nowrap ${alignCls(c.align)}`}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F2F4F7]">
          {rows.map((row, i) => (
            <tr
              key={keyField(row, i)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`${onRowClick ? 'cursor-pointer hover:bg-[#F7F9FC] transition-colors' : ''} ${rowClassName?.(row) ?? ''}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`px-3 py-2.5 text-[#1A1D26] ${alignCls(c.align)} ${c.className ?? ''}`}>
                  {c.render ? c.render(row, i) : ((row as Record<string, unknown>)[c.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot>{footer}</tfoot>}
      </table>
    </div>
  );
}
