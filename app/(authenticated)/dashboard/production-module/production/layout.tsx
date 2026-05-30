'use client';

import { useEffect, useContext } from 'react';
import { ModuleTitleContext } from '@/components/ModuleTitleContext';

export default function ProductionLayout({ children }: { children: React.ReactNode }) {
  const { setModuleTitle } = useContext(ModuleTitleContext);

  useEffect(() => {
    setModuleTitle('Productions Module');
  }, [setModuleTitle]);

  return <>{children}</>;
}
