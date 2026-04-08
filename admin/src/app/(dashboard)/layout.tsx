'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Warehouse,
  CreditCard,
  Truck,
  BarChart3,
  LogOut,
  Menu,
  X,
  FolderOpen,
  Factory,
  MapPin,
  PackagePlus,
  BookOpen,
  Landmark,
  FileText,
  ClipboardCheck,
  ScrollText,
  PackageCheck,
  ShoppingBag,
  Search,
  LayoutGrid,
  User,
  ChevronRight,
  ArrowLeft,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

interface NavGroup {
  title: string;
  description: string;
  items: NavItem[];
}

const menuGroups: NavGroup[] = [
  {
    title: 'БОРЛУУЛАЛТ',
    description: 'Борлуулалт, захиалга, ачилт',
    items: [
      { href: '/pos', label: 'POS Борлуулалт', description: 'Шууд борлуулалт', icon: ShoppingBag, color: '#34C759', bg: '#ECFDF5' },
      { href: '/orders', label: 'Захиалга', description: 'Захиалга удирдах', icon: ShoppingCart, color: '#FF9500', bg: '#FFF7ED' },
      { href: '/truck-loads', label: 'Машины ачилт', description: 'Түгээлтийн ачилт', icon: PackageCheck, color: '#5856D6', bg: '#EEF2FF' },
    ],
  },
  {
    title: 'БАРАА МАТЕРИАЛ',
    description: 'Бүтээгдэхүүн, нөөц, орлого',
    items: [
      { href: '/products', label: 'Бүтээгдэхүүн', description: 'Бараа бүртгэл', icon: Package, color: '#34C759', bg: '#ECFDF5' },
      { href: '/categories', label: 'Ангилал', description: 'Бараа ангилал', icon: FolderOpen, color: '#EAB308', bg: '#FEFCE8' },
      { href: '/inventory', label: 'Агуулах', description: 'Нөөцийн мэдээлэл', icon: Warehouse, color: '#0EA5E9', bg: '#F0F9FF' },
      { href: '/inventory-counts', label: 'Тооллого', description: 'Бараа тоо шалгах', icon: ClipboardCheck, color: '#5856D6', bg: '#EEF2FF' },
      { href: '/suppliers', label: 'Нийлүүлэгч', description: 'Нийлүүлэгч удирдах', icon: Factory, color: '#A855F7', bg: '#FAF5FF' },
      { href: '/purchase-receipts', label: 'Орлого', description: 'Бараа орлого', icon: PackagePlus, color: '#14B8A6', bg: '#F0FDFA' },
    ],
  },
  {
    title: 'САНХҮҮ',
    description: 'Төлбөр, авлага, өглөг',
    items: [
      { href: '/payments', label: 'Төлбөр', description: 'Төлбөр бүртгэх', icon: CreditCard, color: '#EF4444', bg: '#FEF2F2' },
      { href: '/receivables', label: 'Тооцоо', description: 'Харилцагчдын тооцоо', icon: BookOpen, color: '#F472B6', bg: '#FDF2F8' },
      { href: '/supplier-payables', label: 'Нийлүүлэгч тооцоо', description: 'Нийлүүлэгчдийн тооцоо', icon: FileText, color: '#EA580C', bg: '#FFF7ED' },
      { href: '/cash-closings', label: 'Мөнгөн хаалт', description: 'Кассын хаалт', icon: Landmark, color: '#A855F7', bg: '#FAF5FF' },
    ],
  },
  {
    title: 'ХҮМҮҮС',
    description: 'Харилцагч, жолооч, бүс',
    items: [
      { href: '/customers', label: 'Харилцагч', description: 'Харилцагч удирдах', icon: Users, color: '#EC4899', bg: '#FDF2F8' },
      { href: '/customer-categories', label: 'Бүс нутаг', description: 'Бүс нутгийн тохиргоо', icon: MapPin, color: '#F97316', bg: '#FFF7ED' },
      { href: '/drivers', label: 'Жолооч', description: 'Жолоочийн мэдээлэл', icon: Truck, color: '#F59E0B', bg: '#FFFBEB' },
    ],
  },
  {
    title: 'ТАЙЛАН',
    description: 'Нэгдсэн тайлан, анализ',
    items: [
      { href: '/product-ledger', label: 'Бараа тайлан', description: 'Барааны хөдөлгөөн', icon: ScrollText, color: '#0891B2', bg: '#ECFEFF' },
      { href: '/reports', label: 'Тайлан', description: 'Нэгдсэн тайлан', icon: BarChart3, color: '#6366F1', bg: '#EEF2FF' },
      { href: '/reports/drivers', label: 'Жолоочийн тайлан', description: 'Ачилт, борлуулалт', icon: Truck, color: '#5856D6', bg: '#EEF2FF' },
    ],
  },
];

const allNavItems = menuGroups.flatMap((g) => g.items);

function findPageInfo(pathname: string) {
  for (const group of menuGroups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        return item;
      }
    }
  }
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentSubPage = findPageInfo(pathname);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg bg-gradient-to-br from-[#007AFF] to-[#5AC8FA]">
            🍦
          </div>
          <div className="text-sm text-[#8E8E93] font-medium">Ачааллаж байна...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F6FA]">
        <div className="text-sm text-[#8E8E93]">Нэвтрэх хуудас руу шилжиж байна...</div>
      </div>
    );
  }

  // ===== DRIVER ROLE: Mobile-app layout with bottom tab bar =====
  if (user.role === 'DRIVER') {
    const driverTabs = [
      { href: '/pos', label: 'POS', icon: ShoppingBag, color: '#34C759' },
      { href: '/driver/orders', label: 'Захиалга', icon: ShoppingCart, color: '#FF9500' },
      { href: '/driver/load', label: 'Ачилт', icon: Truck, color: '#007AFF' },
      { href: '/driver/sales-history', label: 'Түүх', icon: ScrollText, color: '#5856D6' },
      { href: '/profile', label: 'Профайл', icon: User, color: '#8C8FA3' },
    ];

    const DRIVER_ROUTES = ['/pos', '/driver/orders', '/driver/load', '/driver/sales-history', '/profile'];
    const isDriverRouteAllowed = DRIVER_ROUTES.some((r) => pathname === r || pathname.startsWith(r + '/'));

    if (!isDriverRouteAllowed && pathname !== '/') {
      router.push('/pos');
      return null;
    }
    if (pathname === '/') {
      router.push('/pos');
      return null;
    }

    const activeDriverTab = driverTabs.find((t) => pathname === t.href || pathname.startsWith(t.href + '/'));

    return (
      <div className="flex flex-col min-h-screen bg-[#F5F6FA]">
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 bg-white border-b border-[#E8ECF0]">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] text-sm">
            🍦
          </div>
          <div className="flex-1">
            <h1 className="text-[15px] font-bold text-[#1A1D26]">{activeDriverTab?.label ?? 'Жолооч'}</h1>
            <p className="text-[10px] text-[#8C8FA3]">{user.firstName} {user.lastName}</p>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-24">{children}</main>
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 flex items-end justify-around h-20 px-2 pt-2"
          style={{ background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(20px)', borderTop: '1px solid #E8ECF0' }}
        >
          {driverTabs.map((tab) => {
            const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl transition-all ${isActive ? '' : 'opacity-50'}`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? 'shadow-md' : ''}`}
                  style={{ background: isActive ? `${tab.color}15` : 'transparent' }}
                >
                  <tab.icon className="w-5 h-5" style={{ color: isActive ? tab.color : '#8C8FA3' }} />
                </div>
                <span className="text-[10px] font-semibold" style={{ color: isActive ? tab.color : '#8C8FA3' }}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  // ===== ADMIN / WAREHOUSE_MANAGER: Desktop sidebar layout =====

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  // Sidebar content (shared between desktop and mobile drawer)
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-[#E8ECF0]/60 shrink-0">
        <Link href="/" className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md bg-gradient-to-br from-[#007AFF] to-[#5AC8FA] hover:shadow-lg transition-shadow">
          🍦
        </Link>
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#1A1D26] truncate">Зайрмаг ERP</h2>
          <p className="text-[10px] text-[#8C8FA3] font-medium">Түгээлт & POS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-4 sidebar-scroll">
        {/* Dashboard */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
            pathname === '/'
              ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
              : 'text-[#4A4D5C] hover:bg-[#F2F4F7]'
          }`}
        >
          <LayoutDashboard className="w-[18px] h-[18px] shrink-0" />
          <span className="text-[13px] font-semibold">Хянах самбар</span>
        </Link>

        {/* Nav Groups */}
        {menuGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 mb-1.5 text-[10px] font-bold text-[#8C8FA3] uppercase tracking-wider">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group ${
                      active
                        ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
                        : 'text-[#4A4D5C] hover:bg-[#F2F4F7]'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        active ? 'bg-white/20' : ''
                      }`}
                      style={active ? undefined : { background: item.bg }}
                    >
                      <item.icon
                        className="w-4 h-4"
                        style={{ color: active ? 'white' : item.color }}
                      />
                    </div>
                    <span className="text-[13px] font-medium truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="shrink-0 border-t border-[#E8ECF0]/60 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold text-white shadow-sm shrink-0"
            style={{ background: 'linear-gradient(135deg, #667EEA, #764BA2)' }}
          >
            {user?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-[#1A1D26] truncate">
              {`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
            </p>
            <p className="text-[10px] text-[#8C8FA3] truncate">{user?.email ?? ''}</p>
          </div>
          <button
            onClick={() => logout.mutate()}
            className="p-2 rounded-lg text-[#8C8FA3] hover:text-[#EF4444] hover:bg-[#FEF2F2] transition-all"
            title="Гарах"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F6FA]">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex lg:flex-col lg:w-[260px] lg:shrink-0 sticky top-0 h-screen bg-white border-r border-[#E8ECF0]"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-[280px] flex flex-col bg-white shadow-2xl
          transition-transform duration-300 lg:hidden
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[#F2F4F7] z-10"
        >
          <X className="w-5 h-5 text-[#8C8FA3]" />
        </button>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 lg:px-6 bg-white/80 backdrop-blur-xl border-b border-[#E8ECF0]/60">
          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-[#F2F4F7] transition-colors"
          >
            <Menu className="w-5 h-5 text-[#4A4D5C]" />
          </button>

          {/* Page title */}
          <div className="flex items-center gap-2.5 min-w-0">
            {currentSubPage ? (
              <>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${currentSubPage.color}12` }}
                >
                  <currentSubPage.icon className="w-4 h-4" style={{ color: currentSubPage.color }} />
                </div>
                <h1 className="text-[16px] font-bold text-[#1A1D26] truncate">{currentSubPage.label}</h1>
              </>
            ) : pathname === '/' ? (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#007AFF]/10">
                  <LayoutDashboard className="w-4 h-4 text-[#007AFF]" />
                </div>
                <h1 className="text-[16px] font-bold text-[#1A1D26]">Хянах самбар</h1>
              </>
            ) : pathname === '/profile' ? (
              <>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#667EEA]/10">
                  <User className="w-4 h-4 text-[#667EEA]" />
                </div>
                <h1 className="text-[16px] font-bold text-[#1A1D26]">Профайл</h1>
              </>
            ) : null}
          </div>

          <div className="flex-1" />

          {/* Search (desktop) */}
          <div className="hidden md:flex items-center gap-2 bg-[#F5F6FA] rounded-xl px-3 py-2 w-56 border border-transparent focus-within:border-[#007AFF]/30 focus-within:bg-white transition-all">
            <Search className="w-4 h-4 text-[#8C8FA3]" />
            <input
              type="text"
              placeholder="Хайх..."
              className="bg-transparent text-[13px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const q = (e.target as HTMLInputElement).value.toLowerCase();
                  const match = allNavItems.find((item) => item.label.toLowerCase().includes(q));
                  if (match) router.push(match.href);
                }
              }}
            />
          </div>

          {/* User info (desktop) */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="text-right">
              <p className="text-[12px] font-semibold text-[#1A1D26]">
                {`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()}
              </p>
              <p className="text-[10px] text-[#8C8FA3]">{user?.role === 'ADMIN' ? 'Админ' : 'Нярав'}</p>
            </div>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #667EEA, #764BA2)' }}
            >
              {user?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
