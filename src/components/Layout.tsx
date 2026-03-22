import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { PeriodSelector } from '@/components/PeriodSelector';

export function Layout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 md:h-14 flex items-center gap-2 md:gap-3 border-b px-3 md:px-4 bg-card shrink-0">
            <SidebarTrigger />
            <PeriodSelector />
          </header>
          <main className="flex-1 overflow-auto p-3 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
