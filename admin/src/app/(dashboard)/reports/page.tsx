'use client';

import Link from 'next/link';
import {
  BarChart3,
  ReceiptText,
  BookOpen,
  PercentCircle,
  TrendingUp,
  ScrollText,
  Truck,
  Wallet,
  Landmark,
  FileText,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

const REPORTS = [
  { href: '/reports/sales', title: 'Борлуулалтын бүртгэл', desc: 'Гүйлгээ бүрээр, харилцагч/бараа/төлбөрөөр шүүх', icon: ReceiptText, color: '#007AFF', bg: '#EFF6FF' },
  { href: '/reports/ledger', title: 'Авлагын дэвтэр', desc: 'Харилцагчийн эхний/эцсийн үлдэгдэл, дебет/кредит', icon: BookOpen, color: '#F472B6', bg: '#FDF2F8' },
  { href: '/reports/vat', title: 'НӨАТ тайлан', desc: 'Гарсан НӨАТ (10%), татварын суурь', icon: PercentCircle, color: '#34C759', bg: '#ECFDF5' },
  { href: '/reports/analytics', title: 'Борлуулалтын анализ', desc: 'Өдрийн борлуулалт, ашиг, тооцоо', icon: TrendingUp, color: '#6366F1', bg: '#EEF2FF' },
  { href: '/product-ledger', title: 'Барааны дэвтэр', desc: 'Барааны хөдөлгөөн, эхний/эцсийн үлдэгдэл', icon: ScrollText, color: '#0891B2', bg: '#ECFEFF' },
  { href: '/supplier-payables', title: 'Нийлүүлэгчийн өглөг', desc: 'Нийлүүлэгчдийн тооцоо, өглөгийн дэвтэр', icon: FileText, color: '#EA580C', bg: '#FFF7ED' },
  { href: '/reports/drivers', title: 'Жолоочийн тайлан', desc: 'Ачилт, борлуулалт, төлбөрийн задаргаа', icon: Truck, color: '#5856D6', bg: '#EEF2FF' },
  { href: '/reports/bank-accounts', title: 'Дансны тайлан', desc: 'Банкны данс, орлого-зарлага', icon: Wallet, color: '#0EA5E9', bg: '#F0F9FF' },
  { href: '/cash-closings', title: 'Мөнгөн хаалт', desc: 'Өдрийн кассын хаалт, тооцоо', icon: Landmark, color: '#A855F7', bg: '#FAF5FF' },
] as const;

export default function ReportsHubPage() {
  return (
    <div className="space-y-6 animate-ios-fade-in">
      <PageHeader title="Тайлан" subtitle="Бүх тайлан — хэвлэх + Excel татах" icon={BarChart3} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <Link
              key={r.href}
              href={r.href}
              className="group bg-white rounded-2xl border border-[#E8ECF0]/70 shadow-sm p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: r.bg }}>
                <Icon className="w-5.5 h-5.5" style={{ color: r.color }} />
              </div>
              <h3 className="text-[15px] font-bold text-[#1A1D26]">{r.title}</h3>
              <p className="text-[13px] text-[#8C8FA3] mt-1 leading-snug">{r.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
