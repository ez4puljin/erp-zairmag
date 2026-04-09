'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Warehouse,
  CreditCard,
  Receipt,
  Tag,
  Truck,
  BarChart3,
  MessageSquare,
  Wallet,
  FileText,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const mainNavItems = [
  { title: 'Хянах самбар', href: '/', icon: LayoutDashboard },
  { title: 'Захиалга', href: '/orders', icon: ShoppingCart },
  { title: 'Бүтээгдэхүүн', href: '/products', icon: Package },
  { title: 'Харилцагч', href: '/customers', icon: Users },
  { title: 'Агуулах', href: '/inventory', icon: Warehouse },
  { title: 'Төлбөр', href: '/payments', icon: CreditCard },
  { title: 'Данс', href: '/bank-accounts', icon: Wallet },
  { title: 'Зардал', href: '/expenses', icon: Receipt },
  { title: 'Зардлын ангилал', href: '/expense-categories', icon: Tag },
  { title: 'Жолооч', href: '/drivers', icon: Truck },
  { title: 'Тайлан', href: '/reports', icon: BarChart3 },
];

const settingsNavItems = [
  { title: 'SMS тохиргоо', href: '/sms-settings', icon: MessageSquare },
  { title: 'Баримтын загвар', href: '/receipt-settings', icon: FileText },
  { title: 'Дансны тохиргоо', href: '/bank-accounts', icon: Wallet },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl">🍦</span>
          <span className="font-bold text-lg">Ice Cream</span>
        </Link>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Үндсэн цэс</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-2 w-full">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Тохиргоо</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive}>
                      <Link href={item.href} className="flex items-center gap-2 w-full">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <Separator className="mb-4" />
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            {user?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Админ'}</p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.email ?? ''}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => logout.mutate()}
            title="Гарах"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
