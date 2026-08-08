import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExcelSheet {
  /** Sheet tab name (<=31 chars). */
  name: string;
  /** Optional title row (merged visually by being on its own row). */
  title?: string;
  /** Optional meta rows under the title (company, range, filters). */
  meta?: string[];
  columns: ExcelColumn[];
  rows: Array<Record<string, unknown>>;
  /** Optional totals row (column key -> value). */
  totals?: Record<string, unknown>;
}

/**
 * Builds .xlsx workbooks from structured report data using SheetJS (xlsx).
 * Returns a Buffer that controllers stream as an attachment. Money values are
 * passed through as-is (numbers) so Excel formats them; format/labels are the
 * caller's responsibility.
 */
@Injectable()
export class ExcelService {
  build(sheets: ExcelSheet[]): Buffer {
    const wb = XLSX.utils.book_new();

    for (const sheet of sheets) {
      const aoa: unknown[][] = [];

      if (sheet.title) aoa.push([sheet.title]);
      for (const m of sheet.meta ?? []) aoa.push([m]);
      if (sheet.title || (sheet.meta && sheet.meta.length)) aoa.push([]);

      // Header
      aoa.push(sheet.columns.map((c) => c.header));
      // Rows
      for (const row of sheet.rows) {
        aoa.push(sheet.columns.map((c) => normalize(row[c.key])));
      }
      // Totals
      if (sheet.totals) {
        aoa.push(sheet.columns.map((c) => normalize(sheet.totals![c.key])));
      }

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = sheet.columns.map((c) => ({
        wch: c.width ?? Math.max(10, c.header.length + 2),
      }));
      XLSX.utils.book_append_sheet(wb, ws, (sheet.name || 'Sheet').slice(0, 31));
    }

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  /** Standard attachment headers for an .xlsx download. */
  headers(filename: string): Record<string, string> {
    const safe = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    return {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(safe)}"`,
    };
  }
}

function normalize(v: unknown): unknown {
  if (v === null || v === undefined) return '';
  // Prisma Decimal / objects with toNumber -> number for proper Excel formatting
  if (typeof v === 'object' && v !== null && typeof (v as any).toNumber === 'function') {
    return (v as any).toNumber();
  }
  if (v instanceof Date) return v;
  return v;
}
