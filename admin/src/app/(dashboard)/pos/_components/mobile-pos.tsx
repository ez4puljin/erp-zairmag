'use client';

import {
  Check,
  ChevronRight,
  Package,
  RefreshCw,
  ScanLine,
  Search,
  Truck,
  User,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { PosProductRow } from './product-row';
import { CartBar } from './cart-sheet';

/** Гар утасны жагсаалтад бэлдсэн барааны мөр. */
export interface PosProductEntry {
  /** React key — ачилтын мөрийн id. */
  key: string;
  productId: string;
  name: string;
  sku?: string;
  unitPrice: number;
  remaining: number;
  unitsPerBox: number;
  /** Сагсанд байгаа тоо (ширхэгээр). */
  quantity: number;
}

/**
 * Гар утасны POS дэлгэц.
 *
 * Зохиомжийн зарчим: дээрээс доош борлуулалтын дараалал —
 * ачилт → харилцагч → бараа → сагс. Гол үйлдлүүд (скан, тоо оруулах,
 * сагс) эрхий хуруунд хүрэх доод хэсэгт байрлана.
 *
 * `position: fixed` ашигласан нь зориудын шийдэл: гадна талын `main` нь
 * өөрөө гүйлгэгддэг тул энгийн урсгалд байрлуулбал хоёр давхар гүйлт үүсч,
 * борлуулалт бүртгэх товч дэлгэцээс гарна.
 */
export function MobilePos({
  loadNumber,
  driverName,
  totalLoaded,
  totalSold,
  totalRemaining,
  onRefresh,
  customerName,
  customerDetail,
  onPickCustomer,
  productSearch,
  onProductSearchChange,
  onScan,
  products,
  totalProductCount,
  onQtyChange,
  cartItemCount,
  cartUnitCount,
  cartTotal,
  onOpenCart,
  bottomInset,
}: {
  loadNumber: string;
  driverName: string;
  totalLoaded: number;
  totalSold: number;
  totalRemaining: number;
  onRefresh: () => void;
  customerName: string | null;
  customerDetail: string | null;
  onPickCustomer: () => void;
  productSearch: string;
  onProductSearchChange: (value: string) => void;
  onScan: () => void;
  /** Хайлтаар шүүгдсэн барааны жагсаалт. */
  products: PosProductEntry[];
  /** Шүүлтгүй үеийн нийт барааны тоо. */
  totalProductCount: number;
  onQtyChange: (productId: string, nextQty: number) => void;
  cartItemCount: number;
  cartUnitCount: number;
  cartTotal: number;
  onOpenCart: () => void;
  /** Жолоочийн доод таб цэсний өндөр (px). */
  bottomInset: number;
}) {
  return (
    <div
      className="lg:hidden fixed inset-x-0 top-14 flex flex-col bg-[#F5F6FA] animate-ios-fade-in"
      style={{ bottom: bottomInset }}
    >
      {/* Ачилтын мөр */}
      <div className="flex-shrink-0 bg-white border-b border-[#E8ECF0] px-4 py-2.5 flex items-center gap-2.5">
        <div
          className="w-9 h-9 flex-shrink-0 rounded-xl grid place-items-center"
          style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
        >
          <Truck className="w-4.5 h-4.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[15px] font-bold text-[#1A1D26] tracking-tight truncate leading-tight">
            {loadNumber}
          </h1>
          <p className="text-[11px] text-[#8C8FA3] truncate tabular-nums">
            {driverName && `${driverName} · `}
            зарсан {totalSold}/{totalLoaded}
          </p>
        </div>
        <div className="flex-shrink-0 text-center rounded-xl bg-[#007AFF]/10 px-2.5 py-1">
          <p className="text-[9px] font-bold uppercase tracking-[0.06em] text-[#007AFF] leading-tight">
            Үлдэгдэл
          </p>
          <p className="text-[16px] font-bold text-[#007AFF] leading-tight tabular-nums">
            {totalRemaining}
          </p>
        </div>
        <button
          onClick={onRefresh}
          aria-label="Шинэчлэх"
          className="w-10 h-10 flex-shrink-0 rounded-xl bg-[#F2F4F7] grid place-items-center active:scale-[0.9] transition-transform"
        >
          <RefreshCw className="w-4 h-4 text-[#8C8FA3]" />
        </button>
      </div>

      {/* Харилцагч */}
      <button
        onClick={onPickCustomer}
        className="flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 border-b text-left active:opacity-70 transition-opacity"
        style={{
          background: customerName ? '#34C7590F' : '#FF95001A',
          borderColor: customerName ? '#34C75933' : '#FF950033',
        }}
      >
        <div
          className="w-7 h-7 flex-shrink-0 rounded-lg grid place-items-center"
          style={{ background: customerName ? '#34C759' : '#FF9500' }}
        >
          {customerName ? (
            <Check className="w-4 h-4 text-white" />
          ) : (
            <User className="w-4 h-4 text-white" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-[#1A1D26] truncate leading-tight">
            {customerName ?? 'Харилцагч сонгох'}
          </p>
          {customerName && customerDetail && (
            <p className="text-[11px] text-[#8C8FA3] truncate">{customerDetail}</p>
          )}
        </div>
        <ChevronRight className="w-4.5 h-4.5 text-[#8C8FA3] flex-shrink-0" />
      </button>

      {/* Хайлт + скан */}
      <div className="flex-shrink-0 flex items-center gap-2 px-4 pt-3 pb-2">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-[#8C8FA3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => onProductSearchChange(e.target.value)}
            placeholder="Бараа хайх..."
            className="w-full h-12 pl-10 pr-10 rounded-2xl bg-white border border-[#E8ECF0] text-[16px] text-[#1A1D26] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15"
          />
          {productSearch && (
            <button
              onClick={() => onProductSearchChange('')}
              aria-label="Хайлт цэвэрлэх"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#AEAEB2]/25 grid place-items-center"
            >
              <X className="w-3.5 h-3.5 text-[#8C8FA3]" />
            </button>
          )}
        </div>
        <button
          onClick={onScan}
          aria-label="Камераар зураасан код унших"
          className="w-12 h-12 flex-shrink-0 rounded-2xl grid place-items-center text-white active:scale-[0.92] transition-transform shadow-sm shadow-[#007AFF]/30"
          style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
        >
          <ScanLine className="w-5 h-5" />
        </button>
      </div>

      {/* Барааны жагсаалт */}
      <div className="flex-1 overflow-y-auto sheet-scroll px-4 pb-4 min-h-0">
        {productSearch && (
          <p className="text-[11px] text-[#AEAEB2] pb-2 px-0.5 tabular-nums">
            {products.length} илэрц / нийт {totalProductCount}
          </p>
        )}
        {products.length === 0 ? (
          <EmptyState
            icon={Package}
            title={productSearch ? 'Хайлтад тохирох бараа олдсонгүй' : 'Үлдэгдэл бараа байхгүй'}
            hint={productSearch ? 'Нэр эсвэл SKU-гаар хайна уу' : undefined}
          />
        ) : (
          <div className="space-y-2.5">
            {products.map((p, i) => (
              <PosProductRow
                key={p.key}
                index={i}
                name={p.name}
                unitPrice={p.unitPrice}
                remaining={p.remaining}
                unitsPerBox={p.unitsPerBox}
                quantity={p.quantity}
                onChange={(nextQty) => onQtyChange(p.productId, nextQty)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Сагсны мөр */}
      <CartBar
        itemCount={cartItemCount}
        unitCount={cartUnitCount}
        total={cartTotal}
        bottomInset={bottomInset}
        onOpen={onOpenCart}
      />
    </div>
  );
}
