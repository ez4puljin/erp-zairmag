'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login.mutate({ email, password });
  };

  return (
    <div className="w-full max-w-[420px]">
      {/* Mobile logo */}
      <div className="lg:hidden text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center text-3xl shadow-lg bg-gradient-to-br from-[#007AFF] to-[#5AC8FA]">
          🍦
        </div>
        <h1 className="text-[22px] font-bold text-[#1A1D26]">Зайрмаг ERP</h1>
      </div>

      {/* Login card */}
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#E8ECF0]">
        <div className="mb-6">
          <h2 className="text-[22px] font-bold text-[#1A1D26]">Нэвтрэх</h2>
          <p className="text-[14px] text-[#8C8FA3] mt-1">Системд нэвтрэхийн тулд мэдээллээ оруулна уу</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1.5">
              Имэйл
            </label>
            <input
              type="email"
              placeholder="admin@icecream.mn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[15px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none transition-all focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1.5">
              Нууц үг
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[15px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none transition-all focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 focus:bg-white"
            />
          </div>

          {login.isError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[#EF4444] text-[13px] font-medium">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              Имэйл эсвэл нууц үг буруу байна
            </div>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="w-full py-3.5 rounded-xl text-[15px] font-semibold text-white bg-[#007AFF] hover:bg-[#0066D6] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-md shadow-[#007AFF]/25"
          >
            {login.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Нэвтэрч байна...
              </span>
            ) : (
              'Нэвтрэх'
            )}
          </button>
        </form>
      </div>

      <p className="text-center mt-6 text-[12px] text-[#A0A3B1]">
        Зайрмаг ERP v1.0 — Түгээлт & POS Систем
      </p>
    </div>
  );
}
