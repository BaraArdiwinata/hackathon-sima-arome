'use client';

import { useEffect, useContext } from 'react';
import { ModuleTitleContext } from '@/components/ModuleTitleContext';

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  const { setModuleTitle } = useContext(ModuleTitleContext);

  useEffect(() => {
    setModuleTitle('Productions Module');
  }, [setModuleTitle]);

  return <>{children}</>;
}
