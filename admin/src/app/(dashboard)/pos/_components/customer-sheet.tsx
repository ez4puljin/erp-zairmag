'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, MapPin, Phone, Search, Users, X } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { tapFeedback } from '../_lib/payment-methods';

export interface PosCustomer {
  id: string;
  storeName: string;
  contactName?: string;
  phone?: string;
  address?: string;
  region?: { name: string };
  /** Эцсийн үлдэгдэл (авлага). Жолооч сонгохын өмнө хардаг. */
  outstandingDebt?: number | string;
}

/**
 * Гар утасны харилцагч сонгох дэлгэц.
 *
 * Доороос гарч ирдэг бүтэн өндөртэй хуудас — жагсаалт урт байсан ч
 * нэг гараар гүйлгэж, хайж олоход тохиромжтой.
 */
/**
 * Эцэг компонент нээх бүрд шинээр mount хийдэг тул (`{open && <CustomerSheet/>}`)
 * хайлтын утга бүр удаад цэвэр эхэлнэ — үүнийг effect дотор цэвэрлэх шаардлагагүй.
 */
export function CustomerSheet({
  customers,
  selectedId,
  onSelect,
  onClose,
}: {
  customers: PosCustomer[];
  selectedId: string;
  onSelect: (customer: PosCustomer) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Хуудас гарч ирсний дараа фокус — анимацийг таслахгүй.
    const t = setTimeout(() => inputRef.current?.focus(), 220);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.storeName?.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [customers, query]);

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-[#F5F6FA] animate-ios-fade-in">
      {/* Толгой */}
      <div className="flex-shrink-0 bg-white border-b border-[#E8ECF0] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-[19px] font-bold text-[#1A1D26] tracking-tight">Харилцагч сонгох</h2>
          <button
            type="button"
            aria-label="Хаах"
            onClick={onClose}
            className="w-10 h-10 -mr-1 rounded-full bg-[#F2F4F7] grid place-items-center active:scale-[0.9] transition-transform"
          >
            <X className="w-5 h-5 text-[#8C8FA3]" />
          </button>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-[#8C8FA3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Нэр, утас, хаягаар хайх..."
            className="w-full h-12 pl-10 pr-10 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[16px] text-[#1A1D26] outline-none transition-all focus:border-[#007AFF] focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/15"
          />
          {query && (
            <button
              type="button"
              aria-label="Хайлт цэвэрлэх"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#AEAEB2]/25 grid place-items-center"
            >
              <X className="w-3.5 h-3.5 text-[#8C8FA3]" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-[#AEAEB2] mt-2 px-0.5">
          {filtered.length} харилцагч{query && ` / нийт ${customers.length}`}
        </p>
      </div>

      {/* Жагсаалт */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Харилцагч олдсонгүй"
            hint={query ? 'Өөр түлхүүр үгээр хайж үзнэ үү' : undefined}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    tapFeedback();
                    onSelect(c);
                  }}
                  className="w-full flex items-center gap-3 text-left px-3.5 py-3 rounded-2xl bg-white border transition-colors active:bg-[#F2F4F7]"
                  style={{ borderColor: active ? '#34C759' : '#E8ECF0' }}
                >
                  <div
                    className="w-10 h-10 flex-shrink-0 rounded-xl grid place-items-center text-[15px] font-bold"
                    style={{
                      background: active ? '#34C759' : '#F2F4F7',
                      color: active ? '#FFFFFF' : '#8C8FA3',
                    }}
                  >
                    {active ? <Check className="w-5 h-5" /> : (c.storeName?.charAt(0) ?? '?')}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-[#1A1D26] truncate">{c.storeName}</p>
                    <div className="flex items-center gap-2.5 mt-0.5">
                      {c.phone && (
                        <span className="text-[12px] text-[#8C8FA3] flex items-center gap-1 flex-shrink-0 tabular-nums">
                          <Phone className="w-3 h-3" /> {c.phone}
                        </span>
                      )}
                      {c.address && (
                        <span className="text-[12px] text-[#8C8FA3] flex items-center gap-1 min-w-0">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{c.address}</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <span
                      className={`text-[13px] font-bold tabular-nums ${
                        Number(c.outstandingDebt ?? 0) > 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'
                      }`}
                    >
                      ₮{Math.round(Number(c.outstandingDebt ?? 0)).toLocaleString()}
                    </span>
                    {c.region && (
                      <span className="text-[10px] font-semibold text-[#007AFF] bg-[#007AFF]/10 px-2 py-0.5 rounded-lg">
                        {c.region.name}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
