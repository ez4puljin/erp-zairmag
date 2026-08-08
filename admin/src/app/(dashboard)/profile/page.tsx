'use client';

import { useAuth } from '@/hooks/use-auth';
import { User, Mail, Shield, LogOut } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-5 animate-ios-fade-in">
      <PageHeader title="Профайл" subtitle="Хэрэглэгчийн мэдээлэл" icon={User} />

      <SectionCard>
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #667EEA, #764BA2)' }}
          >
            {user.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="min-w-0">
            <h2 className="text-[18px] font-bold text-[#1A1D26] truncate">
              {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
            </h2>
            <p className="text-[13px] text-[#8C8FA3]">{user.role ?? 'ADMIN'}</p>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-[#E8ECF0]/70">
              <User className="w-4.5 h-4.5 text-[#8C8FA3]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#8C8FA3] font-semibold uppercase tracking-wide">Нэр</p>
              <p className="text-[14px] font-semibold text-[#1A1D26] truncate">
                {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-[#E8ECF0]/70">
              <Mail className="w-4.5 h-4.5 text-[#8C8FA3]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#8C8FA3] font-semibold uppercase tracking-wide">Имэйл</p>
              <p className="text-[14px] font-semibold text-[#1A1D26] truncate">{user.email ?? '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0 border border-[#E8ECF0]/70">
              <Shield className="w-4.5 h-4.5 text-[#8C8FA3]" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#8C8FA3] font-semibold uppercase tracking-wide">Эрх</p>
              <p className="text-[14px] font-semibold text-[#1A1D26] truncate">{user.role ?? 'ADMIN'}</p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => logout.mutate()}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF3B30]/8 text-[#FF3B30] font-semibold text-[14px] hover:bg-[#FF3B30]/15 transition-all active:scale-[0.98]"
        >
          <LogOut className="w-4 h-4" />
          Системээс гарах
        </button>
      </SectionCard>
    </div>
  );
}
