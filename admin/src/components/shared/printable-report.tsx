'use client';

import type { ReactNode } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';

/**
 * Хэвлэх + Excel татах боломжтой тайлангийн нэгдсэн бүрхүүл.
 * Дэлгэц дээр toolbar (.no-print) + хэвлэхэд цэвэр гарчиг/гарын үсгийн хэсэг.
 */
export function PrintableReport({
  title,
  companyName,
  rangeLabel,
  metaLines,
  onExport,
  exporting,
  children,
  footerSignatures = true,
}: {
  title: string;
  companyName?: string | null;
  rangeLabel?: string | null;
  metaLines?: string[];
  onExport?: () => void | Promise<void>;
  exporting?: boolean;
  children: ReactNode;
  footerSignatures?: boolean;
}) {
  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-end gap-2">
        {onExport && (
          <button
            onClick={() => void onExport()}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-semibold text-[#1A1D26] hover:bg-[#F2F4F7] transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#34C759]" />
            {exporting ? 'Бэлдэж байна…' : 'Excel файл'}
          </button>
        )}
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold shadow-sm shadow-[#007AFF]/25 hover:brightness-105 transition-all"
        >
          <Printer className="w-4 h-4" /> Хэвлэх
        </button>
      </div>

      <div className="print-area bg-white rounded-2xl border border-[#E8ECF0]/70 shadow-sm p-6">
        <header className="mb-5 text-center">
          {companyName && <div className="text-[13px] font-semibold text-[#1A1D26] tracking-wide">{companyName}</div>}
          <h2 className="mt-0.5 text-[20px] font-bold text-[#1A1D26] tracking-tight">{title}</h2>
          {rangeLabel && <div className="mt-0.5 text-[13px] text-[#8C8FA3]">{rangeLabel}</div>}
          {metaLines?.map((m, i) => (
            <div key={i} className="text-[12px] text-[#8C8FA3]">
              {m}
            </div>
          ))}
        </header>

        {children}

        {footerSignatures && (
          <footer className="mt-10 grid grid-cols-1 gap-6 text-[13px] text-[#4A4D5C] sm:grid-cols-2">
            <div>Тайлан гаргасан: ……………………………… /………………………/</div>
            <div className="sm:text-right">Хянасан нягтлан: ……………………………… /………………………/</div>
          </footer>
        )}
      </div>
    </div>
  );
}
