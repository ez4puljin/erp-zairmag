'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Receipt, Save, Eye, CheckCircle, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { SaleReceipt, SAMPLE_RECEIPT } from '@/components/shared/sale-receipt';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { PAPER_WIDTHS } from '@/lib/options';
import {
  type ReceiptSettings as Settings,
  DEFAULT_RECEIPT_SETTINGS as DEFAULT,
  mergeReceiptSettings,
} from '@/lib/receipt-settings';

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';
const labelClass = 'block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5';

export default function ReceiptSettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get('/api/receipt-settings')
      .then(res => setS(mergeReceiptSettings(res.data)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        companyName: s.companyName,
        subtitle: s.subtitle,
        phone: s.phone || null,
        address: s.address || null,
        footerMessage: s.footerMessage,
        feedbackPhone: s.feedbackPhone || null,
        paperWidth: s.paperWidth,
        fontSize: s.fontSize,
        showCustomer: s.showCustomer,
        showPhone: s.showPhone,
        showSignatures: s.showSignatures,
        showFooter: s.showFooter,
        showDriver: s.showDriver,
        showSaleDriver: s.showSaleDriver,
        showLoadNumber: s.showLoadNumber,
        showBarcode: s.showBarcode,
        showItemNumber: s.showItemNumber,
        printTwoCopies: s.printTwoCopies,
      };
      await api.put('/api/receipt-settings', payload);
      setMsg({ type: 'success', text: 'Тохиргоо амжилттай хадгалагдлаа' });
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Хадгалахад алдаа гарлаа' });
    }
    setSaving(false);
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setS(prev => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-5 animate-ios-fade-in">
        <PageHeader title="Баримтын загвар" subtitle="Хэвлэх баримтын харагдац тохируулга" icon={Receipt} />
        <div className="py-16 text-center text-[14px] text-[#8C8FA3]">Уншиж байна...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Баримтын загвар"
        subtitle="Хэвлэх баримтын харагдац тохируулга"
        icon={Receipt}
        actions={
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] hover:brightness-105 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
          >
            <Save className="w-4 h-4" />
            {saving ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        }
      />

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[13px] font-medium ${
          msg.type === 'success' ? 'bg-[#34C759]/10 text-[#34C759]' : 'bg-[#FF3B30]/10 text-[#FF3B30]'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Settings form */}
        <div className="space-y-5">
          {/* Header content */}
          <SectionCard title="Толгойн мэдээлэл">
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Компанийн нэр</label>
                <input
                  type="text"
                  value={s.companyName}
                  onChange={e => update('companyName', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Дэд гарчиг</label>
                <input
                  type="text"
                  value={s.subtitle}
                  onChange={e => update('subtitle', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Утас</label>
                  <input
                    type="text"
                    value={s.phone ?? ''}
                    onChange={e => update('phone', e.target.value)}
                    placeholder="(заавал биш)"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Хаяг</label>
                  <input
                    type="text"
                    value={s.address ?? ''}
                    onChange={e => update('address', e.target.value)}
                    placeholder="(заавал биш)"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Хөл текст</label>
                <input
                  type="text"
                  value={s.footerMessage}
                  onChange={e => update('footerMessage', e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Санал хүсэлтийн утас</label>
                <input
                  type="text"
                  value={s.feedbackPhone ?? ''}
                  onChange={e => update('feedbackPhone', e.target.value)}
                  placeholder="90940123"
                  className={inputClass}
                />
              </div>
            </div>
          </SectionCard>

          {/* Layout settings */}
          <SectionCard title="Загвар, өргөн">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Цаасны өргөн</label>
                  <SearchableSelect
                    value={String(s.paperWidth)}
                    onChange={v => update('paperWidth', Number(v))}
                    options={PAPER_WIDTHS}
                    inputClassName={inputClass}
                    widthClass="w-full"
                    aria-label="Цаасны өргөн"
                  />
                </div>
                <div>
                  <label className={labelClass}>Үсгийн хэмжээ ({s.fontSize}px)</label>
                  <input
                    type="range"
                    min={14}
                    max={32}
                    value={s.fontSize}
                    onChange={e => update('fontSize', Number(e.target.value))}
                    className="w-full mt-3 accent-[#007AFF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Toggle label="Харилцагч харуулах" value={s.showCustomer} onChange={v => update('showCustomer', v)} />
                <Toggle label="Утас харуулах" value={s.showPhone} onChange={v => update('showPhone', v)} />
                <Toggle label="Гарын үсгийн хэсэг" value={s.showSignatures} onChange={v => update('showSignatures', v)} />
                <Toggle label="Хөл текст" value={s.showFooter} onChange={v => update('showFooter', v)} />
                <Toggle label="Жолоочийн нэр (ачилт)" value={s.showDriver} onChange={v => update('showDriver', v)} />
                <Toggle label="Жолооч (борлуулалт)" value={s.showSaleDriver} onChange={v => update('showSaleDriver', v)} />
                <Toggle label="Ачилтын дугаар" value={s.showLoadNumber} onChange={v => update('showLoadNumber', v)} />
                <Toggle label="Барааны баркод" value={s.showBarcode} onChange={v => update('showBarcode', v)} />
                <Toggle label="Барааны дэс дугаар" value={s.showItemNumber} onChange={v => update('showItemNumber', v)} />
                <Toggle label="2 хувь хэвлэх" value={s.printTwoCopies} onChange={v => update('printTwoCopies', v)} />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-4 self-start">
          <SectionCard>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-4">
              <Eye className="w-4 h-4" /> Урьдчилан харах
            </div>
            <div className="rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] p-6">
              {/* POS-ийн хэвлэлттэй яг нэг бүрэлдэхүүн — загвар зөрөхгүй. */}
              <div className="shadow-md mx-auto w-fit">
                <SaleReceipt settings={s} data={SAMPLE_RECEIPT} copyLabel="ХАРИЛЦАГЧИЙН ХУВЬ" />
              </div>
              <div className="text-center text-[11px] text-[#8C8FA3] mt-3">
                {s.paperWidth}мм цаас · {s.printTwoCopies ? '2 хувь' : '1 хувь'}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all ${
        value ? 'bg-[#007AFF]/10 border-[#007AFF]/40' : 'bg-[#F5F6FA] border-[#E8ECF0]'
      }`}
    >
      <span className={`text-[13px] font-medium ${value ? 'text-[#007AFF]' : 'text-[#8C8FA3]'}`}>{label}</span>
      <div className={`w-9 h-5 rounded-full transition-all ${value ? 'bg-[#007AFF]' : 'bg-[#D1D1D6]'} relative shrink-0`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
