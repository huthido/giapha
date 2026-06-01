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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-[100dvh] bg-gray-50 dark:bg-gray-950">
      {/* Desktop spacer — matches sidebar width, collapses when sidebar is hidden */}
      <div className={`hidden md:block flex-shrink-0 transition-all duration-200 ${sidebarCollapsed ? 'w-0' : 'w-64'}`} aria-hidden="true" />
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} collapsed={sidebarCollapsed} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar title={title} onToggleSidebar={() => setSidebarCollapsed(c => !c)} sidebarCollapsed={sidebarCollapsed} />
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
