'use client';

import React, { ReactNode, useState, use, useMemo } from 'react';
import {
  IconLayoutDashboard,
  IconPackageImport,
  IconBuildingFactory,
  IconAward,
  IconArrowLeft,
} from '@tabler/icons-react';
import {
  DashboardLayout,
  type DashboardMenuItem,
} from '@/components/ui/dashboard-layout';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/buildpad/hooks';
import { ModuleTitleContext } from '@/lib/context/ModuleTitleContext';

/**
 * Raw Materials Module Layout
 * Wraps all raw materials pages with the shared brand sidebar DashboardLayout
 */
export default function RawMaterialsLayout({
  children,
  params,
}: {
  children: ReactNode;
  params?: Promise<Record<string, string>>;
}) {
  // Unwrap params if provided (Next.js requirement)
  if (params) {
    use(params);
  }

  const router = useRouter();
  const pathname = usePathname();
  const { user: currentUser } = useAuth();
  const [moduleTitle, setModuleTitle] = useState('Raw Materials & Procurement');

  // Dynamic menu items with active state based on current pathname
  const menuItems = useMemo<DashboardMenuItem[]>(() => {
    const rawMaterialsMenuItems = [
      {
        id: 'back-to-modules',
        label: 'Kembali ke Modul',
        icon: <IconArrowLeft size={20} />,
        href: '/dashboard',
      },
      {
        id: 'dashboard',
        label: 'Dashboard Analitik',
        icon: <IconLayoutDashboard size={20} />,
        href: '/dashboard/raw-materials',
      },
      {
        id: 'intake',
        label: 'Penerimaan Bahan Baku',
        icon: <IconPackageImport size={20} />,
        href: '/dashboard/raw-materials/intake',
      },
      {
        id: 'supplier',
        label: 'Manajemen Pemasok',
        icon: <IconBuildingFactory size={20} />,
        href: '/dashboard/raw-materials/supplier',
      },
      {
        id: 'evaluation',
        label: 'Evaluasi Pemasok (AHP)',
        icon: <IconAward size={20} />,
        href: '/dashboard/raw-materials/evaluation',
      },
    ];

    return rawMaterialsMenuItems.map((item) => {
      // Active if exact match or if current path starts with this href (for detail sub-pages)
      // Except for dashboard and back-to-modules, which should match exactly to prevent highlight on sub-pages
      const isActive =
        item.id === 'dashboard' || item.id === 'back-to-modules'
          ? pathname === item.href
          : pathname.startsWith(item.href);

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
    router.push('/login');
  };

  // Dynamic User Profile calculations from useAuth hook
  const displayUserName = useMemo(() => {
    if (!currentUser) return 'Staf Procurement';
    return (
      [currentUser.first_name, currentUser.last_name]
        .filter(Boolean)
        .join(' ') || currentUser.email
    );
  }, [currentUser]);

  const displayUserRole = useMemo(() => {
    if (!currentUser) return 'Procurement Staff';
    return currentUser.role || (currentUser.admin_access ? 'Super Admin' : 'Procurement Staff');
  }, [currentUser]);

  const displayUserAvatar = useMemo(() => {
    return currentUser?.avatar || 'https://avatars.githubusercontent.com/u/1234?v=4';
  }, [currentUser]);

  return (
    <ModuleTitleContext.Provider value={{ moduleTitle, setModuleTitle }}>
      <DashboardLayout
        menuItems={menuItems}
        brandTitle="Sima Arôme"
        logoSrc="/image/logo-sima-arome.png"
        moduleTitle={moduleTitle}
        userInfo={{
          name: displayUserName,
          role: displayUserRole,
          avatar: displayUserAvatar,
        }}
        notificationCount={0}
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
