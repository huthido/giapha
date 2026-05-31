import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { useCall } from '../../contexts/CallContext';
import { IncomingCallModal } from '../video-call/IncomingCallModal';
import { CallWindow } from '../video-call/CallWindow';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { incomingCall, activeCall } = useCall();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-gray-50 dark:bg-gray-950">
      {/* Desktop spacer — giữ đúng 256px chỗ cho sidebar fixed */}
      <div className="hidden md:block w-64 flex-shrink-0" aria-hidden="true" />
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={title} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        <BottomNav onMenu={() => setNavOpen(true)} />
      </div>
      {incomingCall && <IncomingCallModal />}
      {activeCall && <CallWindow />}
    </div>
  );
}
