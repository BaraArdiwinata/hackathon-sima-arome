'use client';

import { useEffect, useContext } from 'react';
import { ModuleTitleContext } from '@/app/(authenticated)/dashboard/layout';

export default function PhaseLayout({ children }: { children: React.ReactNode }) {
  const { setModuleTitle } = useContext(ModuleTitleContext);

  useEffect(() => {
    setModuleTitle('Productions Module');
  }, [setModuleTitle]);

  return <>{children}</>;
}
