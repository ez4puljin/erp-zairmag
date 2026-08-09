'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Landmark,
  Upload,
  Settings,
  Trash2,
  ArrowLeftRight,
  WrapText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { ActionButton } from '@/components/shared/filter-bar';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ErrorBanner } from '@/components/shared/error-banner';
import { Money } from '@/components/shared/money';
import type { SelectOption } from '@/components/shared/searchable-select';
import { TxnTable } from './txn-table';
import { ConfigModal } from './config-modal';
import {
  MISSING_LABEL,
  type BankStatement,
  type BankTxn,
  type CrossAccount,
  type MissingCounts,
} from './types';

const MONTHS = [
  '1-р сар', '2-р сар', '3-р сар', '4-р сар', '5-р сар', '6-р сар',
  '7-р сар', '8-р сар', '9-р сар', '10-р сар', '11-р сар', '12-р сар',
];
const WEEKDAYS = ['Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя', 'Ня'];

interface DayStat {
  count: number;
  filled: number;
  total: number;
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Даваа гарагаас эхэлсэн хуанлид тухайн сарын 1 хэдэд таарахыг олно. */
function leadingBlanks(year: number, month: number) {
  const jsDay = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0 = Ням
  return (jsDay + 6) % 7;
}

export default function BankStatementsPage() {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [days, setDays] = useState<Record<string, DayStat>>({});

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayStatements, setDayStatements] = useState<BankStatement[]>([]);
  const [statement, setStatement] = useState<BankStatement | null>(null);

  const [customers, setCustomers] = useState<SelectOption[]>([]);
  const [crossAccounts, setCrossAccounts] = useState<CrossAccount[]>([]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BankStatement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const apiError = (e: unknown, fallback: string) => {
    const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
    setError(Array.isArray(msg) ? msg.join(', ') : msg || fallback);
  };

  const loadCalendar = useCallback(async (y: number, m: number) => {
    const r = await api.get('/api/bank-statements/calendar', { params: { year: y, month: m } });
    setDays(r.data.days ?? {});
  }, []);

  useEffect(() => {
    void loadCalendar(year, month).catch(() => {});
  }, [year, month, loadCalendar]);

  useEffect(() => {
    void Promise.all([
      api
        .get('/api/customers', { params: { limit: 100 } })
        .then((r) =>
          setCustomers(
            (r.data?.data ?? []).map((c: { storeName: string }) => ({
              value: c.storeName,
              label: c.storeName,
            })),
          ),
        ),
      api.get('/api/bank-statements/config/cross-accounts').then((r) => setCrossAccounts(r.data)),
    ]).catch(() => {});
  }, []);

  const openDay = async (key: string) => {
    setSelectedDate(key);
    setStatement(null);
    setLoading(true);
    try {
      const r = await api.get('/api/bank-statements', { params: { date: key } });
      setDayStatements(r.data);
      // Тухайн өдөр ганц хуулгатай бол шууд нээнэ — нэмэлт товшилт хэрэггүй.
      if (r.data.length === 1) await openStatement(r.data[0].id);
    } catch (e) {
      apiError(e, 'Хуулга ачаалахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  const openStatement = async (id: string) => {
    setLoading(true);
    try {
      const r = await api.get(`/api/bank-statements/${id}`);
      setStatement(r.data);
    } catch (e) {
      apiError(e, 'Хуулга нээхэд алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  /** Хуулгын статистикийг серверээс дахин авалгүй шинэчилнэ. */
  const refreshStatement = async (id: string) => {
    const r = await api.get(`/api/bank-statements/${id}`);
    setStatement(r.data);
    setDayStatements((list) => list.map((s) => (s.id === id ? { ...r.data, transactions: undefined } : s)));
    void loadCalendar(year, month).catch(() => {});
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const r = await api.post('/api/bank-statements/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploaded: BankStatement = r.data;
      setStatement(uploaded);
      if (uploaded.dateFrom) {
        const [y, m] = uploaded.dateFrom.split('-').map(Number);
        setYear(y);
        setMonth(m);
        setSelectedDate(uploaded.dateFrom);
        const list = await api.get('/api/bank-statements', { params: { date: uploaded.dateFrom } });
        setDayStatements(list.data);
      }
      await loadCalendar(year, month).catch(() => {});
    } catch (e) {
      apiError(e, 'Хуулга оруулахад алдаа гарлаа');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const updateTxn = async (txnId: string, patch: Partial<BankTxn>) => {
    if (!statement) return;
    // Хариу ирэхээс өмнө дэлгэц дээр шууд тусгана — хүснэгт "мэдрэмжтэй" байх ёстой.
    setStatement((s) =>
      s && s.transactions
        ? { ...s, transactions: s.transactions.map((t) => (t.id === txnId ? { ...t, ...patch } : t)) }
        : s,
    );
    try {
      await api.patch(`/api/bank-statements/${statement.id}/transactions/${txnId}`, patch);
      await refreshStatement(statement.id);
    } catch (e) {
      apiError(e, 'Гүйлгээ хадгалахад алдаа гарлаа');
      await refreshStatement(statement.id);
    }
  };

  const runAction = async (path: string, fallback: string) => {
    if (!statement) return;
    setLoading(true);
    try {
      await api.post(`/api/bank-statements/${statement.id}/${path}`);
      await refreshStatement(statement.id);
    } catch (e) {
      apiError(e, fallback);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/bank-statements/${deleteTarget.id}`);
      setDayStatements((list) => list.filter((s) => s.id !== deleteTarget.id));
      if (statement?.id === deleteTarget.id) setStatement(null);
      await loadCalendar(year, month).catch(() => {});
    } catch (e) {
      apiError(e, 'Устгахад алдаа гарлаа');
    } finally {
      setDeleteTarget(null);
    }
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1));
    setYear(d.getUTCFullYear());
    setMonth(d.getUTCMonth() + 1);
  };

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const blanks = leadingBlanks(year, month);

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Банкны хуулга"
        subtitle="Хуулга оруулж гүйлгээ бүрт харилцагч, данс, утга бөглөнө"
        icon={Landmark}
        iconColor="#0EA5E9"
        actions={
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUpload(f);
              }}
            />
            <ActionButton variant="ghost" onClick={() => setConfigOpen(true)}>
              <Settings className="w-4 h-4" /> Тохиргоо
            </ActionButton>
            <ActionButton onClick={() => fileRef.current?.click()} disabled={uploading}>
              <Upload className="w-4 h-4" /> {uploading ? 'Оруулж…' : 'Хуулга оруулах'}
            </ActionButton>
          </>
        }
      />

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 items-start">
        <SectionCard
          title={`${year} · ${MONTHS[month - 1]}`}
          action={
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-1.5 rounded-lg text-[#8C8FA3] hover:bg-[#F2F4F7]"
                aria-label="Өмнөх сар"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => shiftMonth(1)}
                className="p-1.5 rounded-lg text-[#8C8FA3] hover:bg-[#F2F4F7]"
                aria-label="Дараагийн сар"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-[11px] font-semibold text-[#8C8FA3] py-1">
                {w}
              </div>
            ))}
            {Array.from({ length: blanks }).map((_, i) => (
              <div key={`b${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = dateKey(year, month, day);
              const stat = days[key];
              const isSelected = selectedDate === key;
              // Бүх мөр бөглөгдсөн өдрийг ногоон, дутуутайг улбар шараар тэмдэглэнэ.
              const complete = stat && stat.total > 0 && stat.filled >= stat.total;
              return (
                <button
                  key={key}
                  onClick={() => void openDay(key)}
                  className={`relative h-9 rounded-lg text-[13px] transition-all ${
                    isSelected
                      ? 'bg-[#007AFF] text-white font-semibold'
                      : stat
                        ? 'bg-[#F2F4F7] text-[#1A1D26] font-medium hover:bg-[#E8ECF0]'
                        : 'text-[#8C8FA3] hover:bg-[#F7F8FA]'
                  }`}
                >
                  {day}
                  {stat && (
                    <span
                      className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
                      style={{
                        background: isSelected ? '#FFFFFF' : complete ? '#34C759' : '#FF9500',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDate && dayStatements.length > 1 && (
            <div className="mt-4 space-y-1.5 border-t border-[#F0F2F5] pt-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8C8FA3]">
                {selectedDate} — {dayStatements.length} хуулга
              </p>
              {dayStatements.map((s) => (
                <button
                  key={s.id}
                  onClick={() => void openStatement(s.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[13px] transition-all ${
                    statement?.id === s.id ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'hover:bg-[#F5F6FA]'
                  }`}
                >
                  <span className="font-medium">{s.accountNumber || 'Дугааргүй'}</span>
                  <span className="text-[#8C8FA3]"> · {s.txnCount} гүйлгээ</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          {loading && !statement && (
            <SectionCard>
              <div className="py-12 text-center">
                <RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" />
              </div>
            </SectionCard>
          )}

          {!loading && !statement && (
            <SectionCard>
              <div className="py-14 text-center">
                <Landmark className="w-10 h-10 text-[#D1D5DB] mx-auto mb-3" />
                <p className="text-[14px] text-[#4A4D5C] font-medium">
                  {selectedDate ? 'Энэ өдөр хуулга алга' : 'Хуанлиас өдөр сонгоно уу'}
                </p>
                <p className="text-[12px] text-[#8C8FA3] mt-1">
                  Хаанбанкны Excel хуулгыг «Хуулга оруулах» товчоор нэмнэ.
                </p>
              </div>
            </SectionCard>
          )}

          {statement && (
            <>
              <SectionCard>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-[17px] font-bold text-[#1A1D26]">
                      {statement.accountNumber || 'Дугааргүй данс'}
                      <span className="ml-2 text-[13px] font-medium text-[#8C8FA3]">
                        {statement.currency}
                      </span>
                    </h3>
                    <p className="text-[12px] text-[#8C8FA3] mt-0.5 break-all">
                      {statement.filename} · {statement.dateFrom ?? '—'}
                      {statement.dateTo && statement.dateTo !== statement.dateFrom
                        ? ` — ${statement.dateTo}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <ActionButton
                      variant="ghost"
                      onClick={() => void runAction('fill-descriptions', 'Утга нөхөхөд алдаа гарлаа')}
                    >
                      <WrapText className="w-4 h-4" /> Утга нөхөх
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      onClick={() => void runAction('swap-debit-credit', 'Багана солиход алдаа гарлаа')}
                    >
                      <ArrowLeftRight className="w-4 h-4" /> Дебит/Кредит солих
                    </ActionButton>
                    <ActionButton variant="ghost" onClick={() => setDeleteTarget(statement)}>
                      <Trash2 className="w-4 h-4 text-[#FF3B30]" /> Устгах
                    </ActionButton>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                  <Stat label="Гүйлгээ" value={String(statement.txnCount)} />
                  <Stat
                    label="Орлого"
                    value={<Money value={statement.totalCredit} className="text-[#34C759]" />}
                  />
                  <Stat
                    label="Зарлага"
                    value={<Money value={statement.totalDebit} className="text-[#FF3B30]" />}
                  />
                  <Stat
                    label="Бөглөсөн"
                    value={`${statement.filledCount} / ${statement.txnCount}`}
                    highlight={statement.filledCount >= statement.txnCount ? '#34C759' : '#FF9500'}
                  />
                </div>

                <MissingSummary missing={statement.missing} />
              </SectionCard>

              <SectionCard title={`Гүйлгээ (${statement.transactions?.length ?? 0})`} noPadding>
                <TxnTable
                  transactions={statement.transactions ?? []}
                  customers={customers}
                  crossAccounts={crossAccounts}
                  onChange={(id, patch) => void updateTxn(id, patch)}
                />
              </SectionCard>
            </>
          )}
        </div>
      </div>

      <ConfigModal
        open={configOpen}
        customers={customers}
        onClose={() => {
          setConfigOpen(false);
          void api
            .get('/api/bank-statements/config/cross-accounts')
            .then((r) => setCrossAccounts(r.data))
            .catch(() => {});
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Хуулга устгах"
        message={`${deleteTarget?.filename ?? ''} — бүх гүйлгээний хамт устана. Үргэлжлүүлэх үү?`}
        confirmLabel="Устгах"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: string;
}) {
  return (
    <div className="rounded-xl bg-[#F7F8FA] px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-[#8C8FA3]">{label}</p>
      <p className="text-[15px] font-bold mt-0.5" style={highlight ? { color: highlight } : undefined}>
        {value}
      </p>
    </div>
  );
}

/** Аль талбар хэдэн мөрд дутуу байгааг товч харуулна. */
function MissingSummary({ missing }: { missing: MissingCounts }) {
  const items = (Object.keys(MISSING_LABEL) as Array<keyof MissingCounts>)
    .filter((k) => missing[k] > 0)
    .map((k) => ({ key: k, label: MISSING_LABEL[k], count: missing[k] }));

  if (items.length === 0) {
    return (
      <p className="mt-3 text-[12px] text-[#34C759] font-medium">Бүх мөр бүрэн бөглөгдсөн байна.</p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[12px] text-[#8C8FA3]">Дутуу:</span>
      {items.map((i) => (
        <span
          key={i.key}
          className="px-2 py-0.5 rounded-md bg-[#FFF7ED] text-[#EA580C] text-[12px] font-medium"
        >
          {i.label} · {i.count}
        </span>
      ))}
    </div>
  );
}
