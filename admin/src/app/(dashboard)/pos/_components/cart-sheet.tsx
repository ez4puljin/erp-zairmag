'use client';

import { useEffect } from 'react';
import {
  Check,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';
import { COMBINED_METHODS, PAYMENT_METHODS, tapFeedback } from '../_lib/payment-methods';
import { SearchableSelect } from '@/components/shared/searchable-select';

export interface PosCartLine {
  productId: string;
  name: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  maxQty: number;
  unitsPerBox: number;
}

export interface PosCombinedPayment {
  method: string;
  amount: number;
}

/**
 * Дэлгэцийн доод ирмэг дэх сагсны мөр.
 *
 * Хэзээ ч далдлагдахгүй — нийт дүн, барааны тоо байнга харагдаж,
 * дарахад сагсны хуудас нээгдэнэ.
 */
export function CartBar({
  itemCount,
  unitCount,
  total,
  bottomInset,
  onOpen,
}: {
  itemCount: number;
  unitCount: number;
  total: number;
  /** Жолоочийн доод таб цэсний өндөр (px). */
  bottomInset: number;
  onOpen: () => void;
}) {
  const empty = itemCount === 0;

  return (
    <div
      className="flex-shrink-0 border-t border-[#E8ECF0] bg-white/92 backdrop-blur-xl"
      style={{ paddingBottom: bottomInset ? 0 : 'env(safe-area-inset-bottom)' }}
    >
      <button
        type="button"
        onClick={() => {
          if (empty) return;
          tapFeedback();
          onOpen();
        }}
        disabled={empty}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[#F5F6FA] transition-colors disabled:active:bg-transparent"
      >
        <div className="relative flex-shrink-0">
          <div
            className="w-11 h-11 rounded-2xl grid place-items-center transition-colors"
            style={{ background: empty ? '#F2F4F7' : 'linear-gradient(135deg, #34C759, #30D158)' }}
          >
            <ShoppingCart className="w-5 h-5" style={{ color: empty ? '#AEAEB2' : '#FFFFFF' }} />
          </div>
          {!empty && (
            <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-[#FF3B30] text-white text-[11px] font-bold grid place-items-center tabular-nums ring-2 ring-white">
              {itemCount}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {empty ? (
            <>
              <p className="text-[14px] font-semibold text-[#8C8FA3]">Сагс хоосон</p>
              <p className="text-[12px] text-[#AEAEB2]">Бараа сонгож эхэлнэ үү</p>
            </>
          ) : (
            <>
              <p className="text-[12px] text-[#8C8FA3] tabular-nums">
                {itemCount} нэр төрөл · {unitCount}ш
              </p>
              <p className="text-[20px] font-bold text-[#1A1D26] tabular-nums leading-tight">
                {formatMnt(total)}
              </p>
            </>
          )}
        </div>

        {!empty && (
          <span className="flex-shrink-0 flex items-center gap-1.5 h-11 px-4 rounded-2xl text-[14px] font-bold text-white shadow-sm shadow-[#34C759]/30"
            style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}
          >
            Үргэлжлүүлэх <ChevronUp className="w-4 h-4" />
          </span>
        )}
      </button>
    </div>
  );
}

/**
 * Сагс + төлбөр + баталгаажуулалтын доод хуудас (bottom sheet).
 *
 * Гар утсан дээр борлуулалтыг дуусгах бүх алхам нэг дэлгэцэд багтсан:
 * харилцагч → бараа → төлбөрийн хэлбэр → бүртгэх.
 */
export function CartSheet({
  open,
  onClose,
  cart,
  onQtyChange,
  onRemove,
  onClearAll,
  total,
  customerName,
  onPickCustomer,
  paymentMethod,
  onPaymentMethodChange,
  combinedPayments,
  onCombinedChange,
  onAddCombinedRow,
  onRemoveCombinedRow,
  onAutoFillLastCombined,
  combinedTotal,
  combinedRemaining,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  cart: PosCartLine[];
  onQtyChange: (productId: string, nextQty: number) => void;
  onRemove: (productId: string) => void;
  onClearAll: () => void;
  total: number;
  customerName: string | null;
  onPickCustomer: () => void;
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  combinedPayments: PosCombinedPayment[];
  onCombinedChange: (index: number, field: 'method' | 'amount', value: string) => void;
  onAddCombinedRow: () => void;
  onRemoveCombinedRow: (index: number) => void;
  onAutoFillLastCombined: () => void;
  combinedTotal: number;
  combinedRemaining: number;
  submitting: boolean;
  onSubmit: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const combinedMismatch = paymentMethod === 'COMBINED' && Math.abs(combinedRemaining) > 1;
  const blocker = !customerName
    ? 'Харилцагч сонгоно уу'
    : cart.length === 0
      ? 'Сагсанд бараа нэмнэ үү'
      : combinedMismatch
        ? 'Хосолсон төлбөрийн задаргаа тохирохгүй байна'
        : null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      {/* Дэвсгэр */}
      <button
        type="button"
        aria-label="Хаах"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 animate-ios-fade-in"
      />

      {/* Хуудас */}
      <div className="relative flex flex-col max-h-[92dvh] rounded-t-3xl bg-white shadow-[0_-8px_40px_rgba(26,29,38,0.18)] animate-sheet-up">
        {/* Бариул + толгой */}
        <div className="flex-shrink-0 px-4 pt-2.5 pb-3 border-b border-[#F2F4F7]">
          <div className="w-9 h-1 rounded-full bg-[#D8DEE8] mx-auto mb-3" />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[19px] font-bold text-[#1A1D26] tracking-tight">
              Сагс{' '}
              <span className="text-[15px] font-semibold text-[#8C8FA3] tabular-nums">
                {cart.length}
              </span>
            </h2>
            <div className="flex items-center gap-1.5">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    tapFeedback([12, 40, 12]);
                    onClearAll();
                  }}
                  className="h-9 px-3 rounded-xl text-[13px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 active:scale-[0.95] transition-transform"
                >
                  Цэвэрлэх
                </button>
              )}
              <button
                type="button"
                aria-label="Хаах"
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-[#F2F4F7] grid place-items-center active:scale-[0.9] transition-transform"
              >
                <X className="w-4.5 h-4.5 text-[#8C8FA3]" />
              </button>
            </div>
          </div>
        </div>

        {/* Гүйлгэх хэсэг: харилцагч + бараа + төлбөр */}
        <div className="flex-1 overflow-y-auto sheet-scroll px-4 py-3 space-y-4 min-h-0">
          {/* Харилцагч */}
          <button
            type="button"
            onClick={onPickCustomer}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left active:scale-[0.99] transition-transform"
            style={{
              background: customerName ? '#34C7590D' : '#FF950012',
              borderColor: customerName ? '#34C75940' : '#FF950040',
            }}
          >
            <div
              className="w-9 h-9 flex-shrink-0 rounded-xl grid place-items-center"
              style={{ background: customerName ? '#34C759' : '#FF9500' }}
            >
              {customerName ? (
                <Check className="w-4.5 h-4.5 text-white" />
              ) : (
                <User className="w-4.5 h-4.5 text-white" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#8C8FA3]">
                Харилцагч
              </p>
              <p className="text-[15px] font-semibold text-[#1A1D26] truncate">
                {customerName ?? 'Сонгогдоогүй'}
              </p>
            </div>
            <span className="flex-shrink-0 text-[13px] font-semibold text-[#007AFF]">
              {customerName ? 'Солих' : 'Сонгох'}
            </span>
          </button>

          {/* Барааны жагсаалт */}
          {cart.length === 0 ? (
            <EmptyState icon={ShoppingCart} title="Сагс хоосон байна" hint="Бараа сонгоно уу" />
          ) : (
            <div className="space-y-2">
              {cart.map((line) => {
                const byBox = line.unitsPerBox > 1;
                const boxes = byBox ? Math.floor(line.quantity / line.unitsPerBox) : 0;
                const pieces = byBox ? line.quantity % line.unitsPerBox : line.quantity;
                return (
                  <div
                    key={line.productId}
                    className="p-3 rounded-2xl bg-[#F5F6FA] border border-[#E8ECF0]"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#1A1D26] leading-snug">
                          {line.name}
                        </p>
                        <p className="text-[12px] text-[#8C8FA3] tabular-nums mt-0.5">
                          {byBox ? `${boxes}х${pieces > 0 ? ` + ${pieces}ш` : ''} · ` : ''}
                          {line.quantity}ш × {formatMnt(line.unitPrice)}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={`${line.name} — сагснаас устгах`}
                        onClick={() => {
                          tapFeedback([12, 40, 12]);
                          onRemove(line.productId);
                        }}
                        className="w-8 h-8 -mt-0.5 -mr-0.5 flex-shrink-0 rounded-lg bg-[#FF3B30]/10 grid place-items-center active:scale-[0.88] transition-transform"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-[17px] font-bold text-[#1A1D26] tabular-nums">
                        {formatMnt(line.quantity * line.unitPrice)}
                      </span>
                      <div className="flex items-center flex-shrink-0 rounded-xl bg-white border border-[#E8ECF0] overflow-hidden">
                        <button
                          type="button"
                          aria-label="Хасах"
                          onClick={() => {
                            tapFeedback();
                            onQtyChange(line.productId, line.quantity - 1);
                          }}
                          className="w-10 h-10 grid place-items-center active:scale-[0.88] transition-transform"
                        >
                          <Minus className="w-4 h-4 text-[#8C8FA3]" />
                        </button>
                        <span className="w-11 text-center text-[15px] font-bold text-[#1A1D26] tabular-nums">
                          {line.quantity}
                        </span>
                        <button
                          type="button"
                          aria-label="Нэмэх"
                          onClick={() => {
                            tapFeedback();
                            onQtyChange(line.productId, line.quantity + 1);
                          }}
                          disabled={line.quantity >= line.maxQty}
                          className="w-10 h-10 grid place-items-center active:scale-[0.88] transition-transform disabled:opacity-30"
                        >
                          <Plus className="w-4 h-4 text-[#8C8FA3]" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Төлбөрийн хэлбэр */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#8C8FA3] mb-2">
              Төлбөрийн хэлбэр
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const active = paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => {
                      tapFeedback();
                      onPaymentMethodChange(m.value);
                    }}
                    className={`h-12 px-3 rounded-2xl text-[14px] font-semibold flex items-center gap-2 border transition-all active:scale-[0.97] ${
                      m.value === 'COMBINED' ? 'col-span-2 justify-center' : ''
                    }`}
                    style={
                      active
                        ? { background: m.color, borderColor: m.color, color: '#FFFFFF' }
                        : { background: '#F5F6FA', borderColor: '#E8ECF0', color: '#1A1D26' }
                    }
                  >
                    <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                    <span className="truncate">{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Хосолсон задаргаа */}
            {paymentMethod === 'COMBINED' && (
              <div className="mt-2.5 rounded-2xl bg-[#F5F6FA] border border-[#E8ECF0] p-3 space-y-2">
                {combinedPayments.map((cp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <SearchableSelect
                      value={cp.method}
                      onChange={(v) => onCombinedChange(idx, 'method', v)}
                      options={COMBINED_METHODS}
                      inputClassName="w-full h-11 px-2.5 rounded-xl bg-white border border-[#E8ECF0] text-[15px] text-[#1A1D26] outline-none"
                      widthClass="flex-1 min-w-0"
                      aria-label="Төлбөрийн хэлбэр"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={cp.amount || ''}
                      onChange={(e) =>
                        onCombinedChange(idx, 'amount', e.target.value.replace(/\D/g, ''))
                      }
                      onBlur={() => {
                        if (idx === combinedPayments.length - 1) onAutoFillLastCombined();
                      }}
                      placeholder="Дүн"
                      className="w-28 h-11 px-2.5 rounded-xl bg-white border border-[#E8ECF0] text-[15px] text-[#1A1D26] text-right tabular-nums outline-none"
                    />
                    {combinedPayments.length > 2 && (
                      <button
                        type="button"
                        aria-label="Мөр устгах"
                        onClick={() => onRemoveCombinedRow(idx)}
                        className="w-9 h-9 flex-shrink-0 rounded-full bg-[#FF3B30]/10 grid place-items-center"
                      >
                        <X className="w-4 h-4 text-[#FF3B30]" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between pt-0.5">
                  <button
                    type="button"
                    onClick={onAddCombinedRow}
                    className="h-9 px-3 rounded-xl text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/10 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Мөр нэмэх
                  </button>
                  <div className="text-right">
                    <p className="text-[12px] text-[#8C8FA3] tabular-nums">
                      {formatMnt(combinedTotal)} / {formatMnt(total)}
                    </p>
                    {combinedMismatch ? (
                      <p
                        className="text-[12px] font-bold tabular-nums"
                        style={{ color: combinedRemaining > 0 ? '#FF3B30' : '#FF9500' }}
                      >
                        {combinedRemaining > 0
                          ? `Дутуу: ${formatMnt(combinedRemaining)}`
                          : `Илүү: ${formatMnt(Math.abs(combinedRemaining))}`}
                      </p>
                    ) : (
                      combinedTotal > 0 && (
                        <p className="text-[12px] font-bold text-[#34C759]">Тохирч байна</p>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Тогтмол хөл: нийт дүн + бүртгэх */}
        <div
          className="flex-shrink-0 border-t border-[#E8ECF0] bg-white px-4 pt-3"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[14px] font-semibold text-[#8C8FA3]">Нийт дүн</span>
            <span className="text-[26px] font-bold text-[#1A1D26] tabular-nums tracking-tight">
              {formatMnt(total)}
            </span>
          </div>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitting || Boolean(blocker)}
            className="w-full h-14 rounded-2xl text-[17px] font-bold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-45 shadow-lg shadow-[#34C759]/30"
            style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Бүртгэж байна...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" /> Борлуулалт бүртгэх
              </>
            )}
          </button>
          {blocker && !submitting && (
            <p className="text-[12px] text-[#FF9500] font-semibold text-center mt-2">{blocker}</p>
          )}
        </div>
      </div>
    </div>
  );
}
