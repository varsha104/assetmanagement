import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth, getRoleLabel } from '@/contexts/AuthContext';
import { Outlet } from 'react-router-dom';
import headerLogo from '@/assets/headerlogo.png';
import { NotificationBell } from '@/components/NotificationBell';

export default function AppLayout() {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex h-svh w-full overflow-hidden">
        <AppSidebar />
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="absolute inset-x-0 top-0 z-40 h-16 border-b border-slate-200 bg-[#f7f9fa]">
            <div className="grid h-full w-full grid-cols-[minmax(220px,auto)_1fr_minmax(180px,auto)] items-center gap-3 px-4">
              <div className="flex min-w-[220px] items-center gap-3">
                <SidebarTrigger className="text-slate-700 hover:bg-slate-100 hover:text-slate-900" />
                <img
                  src={headerLogo}
                  alt="Company logo"
                  className="h-12 w-auto object-contain"
                />
              </div>
              <div className="min-w-0 text-center">
                <span className="block truncate text-lg font-semibold text-[#0b2a59]">Asset Management System</span>
              </div>
              {user && (
                <div className="flex min-w-[180px] items-center justify-end gap-3">
                  <NotificationBell />
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md font-medium">
                    {getRoleLabel(user.role)}
                  </span>
                  <span className="max-w-[120px] truncate text-sm text-slate-600">{user.name}</span>
                </div>
              )}
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-hidden bg-[#e6eef5] pt-16">
            <div className="mx-auto w-full max-w-[1400px] px-8 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
