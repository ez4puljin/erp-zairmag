'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Receipt, Save, Eye, CheckCircle, XCircle } from 'lucide-react';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

interface Settings {
  companyName: string;
  subtitle: string;
  phone: string | null;
  address: string | null;
  footerMessage: string;
  paperWidth: number;
  fontSize: number;
  showCustomer: boolean;
  showPhone: boolean;
  showSignatures: boolean;
  showFooter: boolean;
  showDriver: boolean;
  showBarcode: boolean;
  showItemNumber: boolean;
  showSaleDriver: boolean;
  feedbackPhone: string | null;
  printTwoCopies: boolean;
}

const DEFAULT: Settings = {
  companyName: 'ЗАЙРМАГ ТҮГЭЭЛТ',
  subtitle: 'БОРЛУУЛАЛТЫН БАРИМТ',
  phone: '',
  address: '',
  footerMessage: 'Баярлалаа!',
  paperWidth: 58,
  fontSize: 20,
  showCustomer: true,
  showPhone: true,
  showSignatures: true,
  showFooter: true,
  showDriver: true,
  showBarcode: true,
  showItemNumber: true,
  showSaleDriver: true,
  feedbackPhone: '90940123',
  printTwoCopies: true,
};

export default function ReceiptSettingsPage() {
  const [s, setS] = useState<Settings>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get('/api/receipt-settings')
      .then(res => setS({ ...DEFAULT, ...res.data, phone: res.data.phone ?? '', address: res.data.address ?? '', feedbackPhone: res.data.feedbackPhone ?? '' }))
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

  const previewWidth = s.paperWidth >= 80 ? 320 : 240;

  if (loading) {
    return <div className="p-8 text-[#8E8E93]">Уншиж байна...</div>;
  }

  return (
    <div className="space-y-6 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Баримтын загвар</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-xl text-[14px] font-semibold hover:bg-[#0051D5] disabled:opacity-50 transition-all"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Хадгалж байна...' : 'Хадгалах'}
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] ${
          msg.type === 'success' ? 'bg-[#34C75915] text-[#34C759]' : 'bg-[#FF3B3015] text-[#FF3B30]'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings form */}
        <div className="space-y-6">
          {/* Header content */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-6 space-y-4">
            <div className="flex items-center gap-2 text-[16px] font-semibold text-[#1C1C1E]">
              <Receipt className="w-5 h-5 text-[#007AFF]" />
              Толгойн мэдээлэл
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Компанийн нэр</label>
              <input
                type="text"
                value={s.companyName}
                onChange={e => update('companyName', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Дэд гарчиг</label>
              <input
                type="text"
                value={s.subtitle}
                onChange={e => update('subtitle', e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Утас</label>
                <input
                  type="text"
                  value={s.phone ?? ''}
                  onChange={e => update('phone', e.target.value)}
                  placeholder="(заавал биш)"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Хаяг</label>
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
              <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Хөл текст</label>
              <input
                type="text"
                value={s.footerMessage}
                onChange={e => update('footerMessage', e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Санал хүсэлтийн утас</label>
              <input
                type="text"
                value={s.feedbackPhone ?? ''}
                onChange={e => update('feedbackPhone', e.target.value)}
                placeholder="90940123"
                className={inputClass}
              />
            </div>
          </div>

          {/* Layout settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-6 space-y-4">
            <div className="flex items-center gap-2 text-[16px] font-semibold text-[#1C1C1E]">
              <Eye className="w-5 h-5 text-[#34C759]" />
              Загвар, өргөн
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Цаасны өргөн</label>
                <select
                  value={s.paperWidth}
                  onChange={e => update('paperWidth', Number(e.target.value))}
                  className={inputClass}
                >
                  <option value={58}>58мм (стандарт)</option>
                  <option value={80}>80мм (өргөн)</option>
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Үсгийн хэмжээ ({s.fontSize}px)</label>
                <input
                  type="range"
                  min={14}
                  max={32}
                  value={s.fontSize}
                  onChange={e => update('fontSize', Number(e.target.value))}
                  className="w-full mt-3"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <Toggle label="Харилцагч харуулах" value={s.showCustomer} onChange={v => update('showCustomer', v)} />
              <Toggle label="Утас харуулах" value={s.showPhone} onChange={v => update('showPhone', v)} />
              <Toggle label="Гарын үсгийн хэсэг" value={s.showSignatures} onChange={v => update('showSignatures', v)} />
              <Toggle label="Хөл текст" value={s.showFooter} onChange={v => update('showFooter', v)} />
              <Toggle label="Жолоочийн нэр (ачилт)" value={s.showDriver} onChange={v => update('showDriver', v)} />
              <Toggle label="Жолооч (борлуулалт)" value={s.showSaleDriver} onChange={v => update('showSaleDriver', v)} />
              <Toggle label="Барааны баркод" value={s.showBarcode} onChange={v => update('showBarcode', v)} />
              <Toggle label="Барааны дэс дугаар" value={s.showItemNumber} onChange={v => update('showItemNumber', v)} />
              <Toggle label="2 хувь хэвлэх" value={s.printTwoCopies} onChange={v => update('printTwoCopies', v)} />
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-[#F2F2F7] rounded-2xl p-6 sticky top-4 self-start">
          <div className="flex items-center gap-2 text-[14px] font-semibold text-[#8E8E93] uppercase mb-4">
            <Eye className="w-4 h-4" /> Урьдчилан харах
          </div>
          <div
            className="bg-white shadow-md mx-auto p-3 font-mono"
            style={{ width: previewWidth, fontSize: s.fontSize * 0.55 }}
          >
            <div className="text-center font-black" style={{ fontSize: s.fontSize * 0.7 }}>
              {s.companyName}
            </div>
            <div className="text-center font-bold" style={{ fontSize: s.fontSize * 0.6 }}>
              {s.subtitle}
            </div>
            <div className="text-center font-semibold" style={{ fontSize: s.fontSize * 0.5 }}>
              ХАРИЛЦАГЧИЙН ХУВЬ
            </div>
            {s.phone && <div className="text-center" style={{ fontSize: s.fontSize * 0.45 }}>Утас: {s.phone}</div>}
            {s.address && <div className="text-center" style={{ fontSize: s.fontSize * 0.45 }}>{s.address}</div>}

            <div className="border-t-2 border-black my-2" />

            <div>Баримт №: 123</div>
            <div>Огноо: 2026.04.08 14:30</div>
            {s.showSaleDriver && <div>Жолооч: Болд Баяр</div>}

            {s.showCustomer && (
              <>
                <div className="border-t border-black my-1.5" />
                <div>Харилцагч:</div>
                <div className="font-bold">Жишээ дэлгүүр</div>
                {s.showPhone && <div>Утас: 99119911</div>}
              </>
            )}

            <div className="border-t-2 border-black my-2" />

            <div className="font-bold">{s.showItemNumber ? '1. ' : ''}Классик зайрмаг</div>
            {s.showBarcode && <div style={{ fontSize: s.fontSize * 0.4 }}>Баркод: 4820123456789</div>}
            <div className="flex justify-between">
              <span style={{ fontSize: s.fontSize * 0.45 }}>2 x 3,000₮</span>
              <span className="font-bold">6,000₮</span>
            </div>
            <div className="font-bold mt-1">{s.showItemNumber ? '2. ' : ''}Мангон сорбет</div>
            {s.showBarcode && <div style={{ fontSize: s.fontSize * 0.4 }}>Баркод: 4820987654321</div>}
            <div className="flex justify-between">
              <span style={{ fontSize: s.fontSize * 0.45 }}>1 x 5,000₮</span>
              <span className="font-bold">5,000₮</span>
            </div>

            <div className="border-t-2 border-black my-2" />

            <div className="flex justify-between font-black" style={{ fontSize: s.fontSize * 0.7 }}>
              <span>НИЙТ ДҮН</span>
              <span>11,000₮</span>
            </div>
            <div>Төлбөр: Бэлэн</div>

            {s.showSignatures && (
              <>
                <div className="border-t-2 border-black my-2" />
                <div className="mt-1" style={{ fontSize: s.fontSize * 0.45 }}>Хүлээлгэн өгсөн:</div>
                <div style={{ fontSize: s.fontSize * 0.45 }}>__________________</div>
                <div className="mt-1" style={{ fontSize: s.fontSize * 0.45 }}>Хүлээн авсан:</div>
                <div style={{ fontSize: s.fontSize * 0.45 }}>__________________</div>
              </>
            )}

            {s.showFooter && (
              <>
                <div className="border-t-2 border-black my-2" />
                <div className="text-center font-bold">{s.footerMessage}</div>
              </>
            )}

            {s.feedbackPhone && (
              <div className="text-center font-bold mt-1" style={{ fontSize: s.fontSize * 0.45 }}>
                Санал хүсэлт: {s.feedbackPhone}
              </div>
            )}
          </div>
          <div className="text-center text-[11px] text-[#8E8E93] mt-3">
            {s.paperWidth}мм цаас · {s.printTwoCopies ? '2 хувь' : '1 хувь'}
          </div>
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
        value ? 'bg-[#007AFF15] border-[#007AFF]' : 'bg-[#F2F2F7] border-[#E5E5EA]'
      }`}
    >
      <span className={`text-[13px] font-medium ${value ? 'text-[#007AFF]' : 'text-[#8E8E93]'}`}>{label}</span>
      <div className={`w-9 h-5 rounded-full transition-all ${value ? 'bg-[#007AFF]' : 'bg-[#D1D1D6]'} relative`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
    </button>
  );
}
