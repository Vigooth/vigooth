import type { ReactNode } from 'react';

interface CpcLayoutProps {
  children: ReactNode;
}

export function CpcLayout({ children }: CpcLayoutProps) {
  return (
    <div className="h-full w-full bg-cpc-grey-900 box-border overflow-hidden text-cpc-green-500 font-cpc border-2 border-amber-400 cpc-screen">
      <div className="border-4 border-cpc-blue-900 h-full w-full cpc-text-shadow">{children}</div>
    </div>
  );
}
