'use client';

import { useAuth } from '@/hooks/use-auth';
import { User, Mail, Shield, LogOut } from 'lucide-react';

export default function ProfilePage() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="max-w-xl animate-ios-fade-in space-y-6">
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1D26]">Профайл</h1>
        <p className="text-[14px] text-[#8C8FA3] mt-1">Хэрэглэгчийн мэдээлэл</p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E8ECF0] p-6">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
            style={{ background: 'linear-gradient(135deg, #667EEA, #764BA2)' }}
          >
            {user.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div>
            <h2 className="text-[18px] font-bold text-[#1A1D26]">
              {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
            </h2>
            <p className="text-[13px] text-[#8C8FA3]">{user.role ?? 'ADMIN'}</p>
          </div>
        </div>

        {/* Info rows */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F6FA]">
            <User className="w-5 h-5 text-[#8C8FA3]" />
            <div>
              <p className="text-[11px] text-[#8C8FA3] font-medium">НЭР</p>
              <p className="text-[14px] font-semibold text-[#1A1D26]">
                {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F6FA]">
            <Mail className="w-5 h-5 text-[#8C8FA3]" />
            <div>
              <p className="text-[11px] text-[#8C8FA3] font-medium">ИМЭЙЛ</p>
              <p className="text-[14px] font-semibold text-[#1A1D26]">{user.email ?? '-'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F5F6FA]">
            <Shield className="w-5 h-5 text-[#8C8FA3]" />
            <div>
              <p className="text-[11px] text-[#8C8FA3] font-medium">ЭРХ</p>
              <p className="text-[14px] font-semibold text-[#1A1D26]">{user.role ?? 'ADMIN'}</p>
            </div>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => logout.mutate()}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FEF2F2] text-[#EF4444] font-semibold text-[14px] hover:bg-[#FEE2E2] transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Системээс гарах
        </button>
      </div>
    </div>
  );
}
