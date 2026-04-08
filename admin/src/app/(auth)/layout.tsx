'use client';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: '#F5F6FA' }}>
      {/* Left side — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12" style={{ background: 'linear-gradient(135deg, #1A1D26 0%, #2D3748 100%)' }}>
        <div className="max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center text-4xl shadow-xl bg-gradient-to-br from-[#007AFF] to-[#5AC8FA]">
            🍦
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Зайрмаг ERP</h1>
          <p className="text-[16px] text-white/60 leading-relaxed">
            Түгээлт, борлуулалт, агуулах, санхүүгийн нэгдсэн удирдлагын систем
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Борлуулалт', icon: '📊' },
              { label: 'Агуулах', icon: '📦' },
              { label: 'Санхүү', icon: '💰' },
            ].map((item) => (
              <div key={item.label} className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-[12px] text-white/50 font-medium">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side — login form */}
      <div className="flex-1 flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
