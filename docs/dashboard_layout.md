# DashboardLayout — Component Documentation

> **AI Context**: This file is documentation intended for AI agents.
> When implementing or modifying dashboard pages, sidebar navigation, or top header behaviour,
> always read this document first before editing source files.

---

## Overview

`DashboardLayout` is the primary shell layout for all authenticated dashboard pages in this project.
It is a client-side React component built on top of **Mantine AppShell** and provides:

- A **left sidebar (Navbar)** with brand logo, scrollable menu items, and active-state highlighting
- A **sticky top header** with module title, notification bell (with badge), and user profile menu
- A **main content area** (`AppShell.Main`) where page children are rendered

**Source files:**
- Component: `components/ui/dashboard-layout.tsx`
- Styles (CSS Modules): `components/ui/dashboard-layout.module.css`
- Real-world usage wrapper: `app/(authenticated)/dashboard/layout.tsx`
- Module title helper: `components/ModuleProvider.tsx`

---

## Props Reference (`DashboardLayoutProps`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `ReactNode` | required | Main page content rendered in `AppShell.Main` |
| `menuItems` | `DashboardMenuItem[]` | required | Array of sidebar navigation items |
| `brandTitle` | `string` | `'Dashboard'` | Text fallback if no logo is provided |
| `brandIcon` | `ReactNode \| string` | — | React node or image path for the sidebar logo |
| `logoSrc` | `string` | — | Path to a `<next/image>` logo (preferred over `brandIcon` string) |
| `userInfo` | `{ name, role?, avatar? }` | — | Populates the top-right user profile section |
| `onMenuItemClick` | `(item) => void` | — | Called when any sidebar item is clicked |
| `onLogout` | `() => void` | — | Called when the user clicks Logout in the profile menu |
| `notificationCount` | `number` | `0` | Count shown as a red badge on the bell icon. Set to `0` to hide badge |
| `headerActions` | `ReactNode` | — | Extra elements rendered left of the notification bell |
| `moduleTitle` | `string` | — | Large title shown on the left side of the top header |
| `sidebarWidth` | `number` | `280` | Width in pixels of the sidebar |
| `headerHeight` | `number` | `70` | Height in pixels of the top header |

---

## `DashboardMenuItem` Shape

```ts
interface DashboardMenuItem {
  id: string;           // Unique key
  label: string;        // Display text in sidebar
  icon: React.ReactNode; // Tabler icon component (recommended size={20})
  href: string;         // Route path for router.push()
  badge?: string | number; // Optional badge shown on the right of the label (sidebar)
  active?: boolean;     // Highlights the item with active styles
  onClick?: () => void; // Optional extra callback (fires before onMenuItemClick)
}
```

---

## Usage Pattern

### 1. Standard Setup (Next.js Route Layout)

The canonical way to use `DashboardLayout` is as a Next.js route layout file.
This ensures all pages under the route group share the same shell.

```tsx
// app/(authenticated)/dashboard/layout.tsx
'use client';

import React, { ReactNode, createContext, useState, useMemo } from 'react';
import { IconLayoutDashboard, IconUsers } from '@tabler/icons-react';
import { DashboardLayout, type DashboardMenuItem } from '@/components/ui/dashboard-layout';
import { useRouter, usePathname } from 'next/navigation';

// 1. Export a context so child pages can update moduleTitle
export const ModuleTitleContext = createContext<{
  moduleTitle: string;
  setModuleTitle: (title: string) => void;
}>({ moduleTitle: 'Dashboard', setModuleTitle: () => {} });

export default function DashboardLayoutWrapper({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [moduleTitle, setModuleTitle] = useState('Dashboard');

  // 2. Build menu items; set active based on current path
  const menuItems = useMemo<DashboardMenuItem[]>(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <IconLayoutDashboard size={20} />,
      href: '/dashboard',
      active: pathname === '/dashboard',
    },
    {
      id: 'users',
      label: 'User Management',
      icon: <IconUsers size={20} />,
      href: '/dashboard/users',
      badge: '12',          // sidebar badge (optional)
      active: pathname === '/dashboard/users',
    },
  ], [pathname]);

  return (
    <ModuleTitleContext.Provider value={{ moduleTitle, setModuleTitle }}>
      <DashboardLayout
        menuItems={menuItems}
        logoSrc="/image/logo.png"          // sidebar logo
        moduleTitle={moduleTitle}           // top header title (dynamic)
        notificationCount={3}              // red badge on bell; 0 = hidden
        userInfo={{ name: 'John Smyth', role: 'Admin', avatar: 'https://...' }}
        onMenuItemClick={(item) => router.push(item.href)}
        onLogout={() => router.push('/login')}
        sidebarWidth={280}
        headerHeight={70}
      >
        {children}
      </DashboardLayout>
    </ModuleTitleContext.Provider>
  );
}
```

---

### 2. Updating `moduleTitle` from a Child Page

Child pages can dynamically change the top header title by consuming `ModuleTitleContext`.

```tsx
// app/(authenticated)/dashboard/users/page.tsx
'use client';

import { useContext, useEffect } from 'react';
import { ModuleTitleContext } from '@/app/(authenticated)/dashboard/layout';

export default function UsersPage() {
  const { setModuleTitle } = useContext(ModuleTitleContext);

  useEffect(() => {
    setModuleTitle('User Management');
  }, [setModuleTitle]);

  return <div>...</div>;
}
```

---

### 3. Using `ModuleProvider` (Alternative Context Wrapper)

`ModuleProvider` (`components/ModuleProvider.tsx`) is a standalone wrapper that provides
the same `ModuleTitleContext`. Use it when `DashboardLayoutWrapper` does not cover the subtree
that needs to set `moduleTitle`.

```tsx
import { ModuleProvider } from '@/components/ModuleProvider';

export default function SomeLayout({ children }) {
  return (
    <ModuleProvider initialModuleTitle="Production">
      {children}
    </ModuleProvider>
  );
}
```

`initialModuleTitle` is applied on mount and also re-applied whenever the value changes.
This makes it suitable for reading from `localStorage` or a query param.

---

## Notification Bell — Known Behaviour & Fix

The notification badge (red circle with count) is rendered as a Mantine `Badge` positioned
**absolutely outside** the `ActionIcon` bounds (`top: -8, right: -8`).

**Critical:** Mantine `ActionIcon` has `overflow: hidden` by default. Without an explicit override,
the badge is clipped and invisible. The component already applies the fix:

```tsx
// dashboard-layout.tsx — ActionIcon must have overflow: visible
<ActionIcon
  variant="light"
  size="lg"
  radius="md"
  pos="relative"
  style={{ overflow: 'visible' }}  // ← required, do NOT remove
>
  <IconBell size={20} />
  {notificationCount > 0 && (
    <Badge
      size="xs"
      variant="filled"
      color="red"
      pos="absolute"
      top={-8}
      right={-8}
      style={{ minWidth: '20px', display: 'flex', justifyContent: 'center', fontWeight: 600 }}
    >
      {notificationCount > 99 ? '99+' : notificationCount}
    </Badge>
  )}
</ActionIcon>
```

> ⚠️ If `overflow: 'visible'` is removed from `ActionIcon`, the badge will be clipped and hidden.
> Do not remove this style even if it looks redundant.

---

## CSS Module Key Classes

| Class | Purpose |
|---|---|
| `.navbar` | Sidebar container; has brand-green background + background image |
| `.header` | Top sticky header bar |
| `.notificationBell` | Wrapper for the bell icon; has `overflow: visible` and `z-index: 20` |
| `.menuItem` | Sidebar nav button; supports `data-active="true"` for active highlight |
| `.menuIcon` | 24×24px icon slot inside each menu item |
| `.menuLabel` | Text label inside each menu item (hidden on mobile) |
| `.moduleTitle` | Large bold title on the top-left of the header |
| `.brandSection` | Top brand/logo section of the sidebar |
| `.brandLogo` | Logo image wrapper with 15px padding |

---

## Layout Structure (Visual)

```
┌─────────────────────────────────────────────────────────┐
│  AppShell                                               │
│  ┌──────────────┐  ┌──────────────────────────────────┐ │
│  │ Navbar       │  │ AppShell.Main                    │ │
│  │              │  │  ┌────────────────────────────┐  │ │
│  │ [Logo]       │  │  │ Header (sticky, z-index 40)│  │ │
│  │              │  │  │ [moduleTitle]  [bell] [user]│  │ │
│  │ [Menu Items] │  │  └────────────────────────────┘  │ │
│  │  - Item 1    │  │                                  │ │
│  │  - Item 2    │  │  <Box p="md">                    │ │
│  │  - Item 3    │  │    {children}                    │ │
│  │              │  │  </Box>                          │ │
│  └──────────────┘  └──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## Common Mistakes to Avoid

1. **Do not remove `overflow: 'visible'` from `ActionIcon`** — the badge will be clipped.
2. **Do not use `AppShell.Header`** — the header is manually rendered inside `AppShell.Main`
   using a sticky `Box`. Do not move it to `AppShell.Header` as it will break the layout.
3. **`active` state must be computed, not hardcoded** — always derive `active` from `usePathname()`
   inside a `useMemo` so it updates on navigation.
4. **`notificationCount` must be a number** — passing a string will cause the badge to always show
   even when the count is `"0"` (truthy string). Use `notificationCount={0}` to hide.
5. **Logo image dimensions** — `logoSrc` uses `next/image` with `width={1200} height={420}`.
   The actual display is controlled by `style={{ width: '100%', height: 'auto' }}`.
   Always provide images with a ~3:1 aspect ratio for best results.

---

## Dependencies

- `@mantine/core` — AppShell, Group, Stack, Avatar, Menu, ActionIcon, Badge, ScrollArea, etc.
- `@tabler/icons-react` — IconBell, IconChevronDown, IconLogout, IconSettings
- `next/image` — for brand logo rendering
- `next/navigation` — `useRouter`, `usePathname` (used in the layout wrapper, not in the component itself)
