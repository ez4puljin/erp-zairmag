'use client';

import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const pathLabels: Record<string, string> = {
  '/': 'Хянах самбар',
  '/orders': 'Захиалга',
  '/products': 'Бүтээгдэхүүн',
  '/customers': 'Харилцагч',
  '/inventory': 'Агуулах',
  '/payments': 'Төлбөр',
  '/drivers': 'Жолооч',
  '/reports': 'Тайлан',
};

function getBreadcrumb(pathname: string): string {
  if (pathLabels[pathname]) return pathLabels[pathname];

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length > 0) {
    const base = `/${segments[0]}`;
    return pathLabels[base] ?? segments[0];
  }
  return 'Хянах самбар';
}

export function Topbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <header className="flex h-14 items-center gap-3 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <nav className="flex-1">
        <h1 className="text-sm font-medium">{breadcrumb}</h1>
      </nav>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">
                {user?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
              </AvatarFallback>
            </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium">{`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'Админ'}</p>
            <p className="text-xs text-muted-foreground">{user?.email ?? ''}</p>
          </div>
          <DropdownMenuItem onClick={() => logout.mutate()}>
            <LogOut className="mr-2 size-4" />
            Гарах
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
