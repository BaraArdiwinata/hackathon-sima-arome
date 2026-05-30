'use client';

import React, { ReactNode, createContext, useState, use, useMemo } from 'react';
import {
  IconLayoutDashboard,
  IconBottle,
  IconBuildingFactory2,
  IconTimeline,
  IconClipboardList,
} from '@tabler/icons-react';
import {
  DashboardLayout,
  type DashboardMenuItem,
} from '@/components/ui/dashboard-layout';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Context untuk moduleTitle
 * Memungkinkan setiap page untuk set moduleTitle sendiri
 */
export const ModuleTitleContext = createContext<{
  moduleTitle: string;
  setModuleTitle: (title: string) => void;
}>({
  moduleTitle: 'Dashboard',
  setModuleTitle: () => {},
});

/**
 * Dashboard Shared Layout — Productions Module
 * Wraps all dashboard pages with the DashboardLayout
 */
export default function DashboardLayoutWrapper({
  children,
  params,
}: {
  children: ReactNode;
  params?: Promise<Record<string, string>>;
}) {
  // Unwrap params if provided (Next.js 15+ requirement)
  if (params) {
    use(params);
  }

  const router = useRouter();
  const pathname = usePathname();
  const [moduleTitle, setModuleTitle] = useState('Dashboard');

  // Productions Module menu items dengan active state berdasarkan current pathname
  const menuItems = useMemo<DashboardMenuItem[]>(() => {
    const baseMenuItems: DashboardMenuItem[] = [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard',
      },
      {
        id: 'products',
        label: 'Products',
        icon: <IconBottle size={20} />,
        href: '/dashboard/production-module/product',
      },
      {
        id: 'production',
        label: 'Production',
        icon: <IconBuildingFactory2 size={20} />,
        href: '/dashboard/production-module/production',
      },
      {
        id: 'tracking-phase',
        label: 'Tracking phase',
        icon: <IconTimeline size={20} />,
        href: '/dashboard/production-module/tracking-phase',
      },
      {
        id: 'phase',
        label: 'Phase',
        icon: <IconClipboardList size={20} />,
        href: '/dashboard/production-module/phase',
      },
    ];

    // Set active state based on current pathname
    return baseMenuItems.map((item) => {
      const isActive = item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname === item.href || pathname.startsWith(item.href + '/');
      return {
        ...item,
        active: isActive,
      };
    });
  }, [pathname]);

  const handleMenuItemClick = (item: DashboardMenuItem) => {
    router.push(item.href);
  };

  const handleLogout = async () => {
    // TODO: Implement logout logic with auth API
    router.push('/login');
  };

  return (
    <ModuleTitleContext.Provider value={{ moduleTitle, setModuleTitle }}>
      <DashboardLayout
        menuItems={menuItems}
        brandTitle="Sima Arôme"
        logoSrc="/image/logo-sima-arome.png"
        moduleTitle={moduleTitle}
        userInfo={{
          name: 'John Smyth',
          role: 'GC Manager',
          avatar: 'https://avatars.githubusercontent.com/u/1234?v=4',
        }}
        notificationCount={3}
        onMenuItemClick={handleMenuItemClick}
        onLogout={handleLogout}
        sidebarWidth={280}
        headerHeight={70}
      >
        {children}
      </DashboardLayout>
    </ModuleTitleContext.Provider>
  );
}
