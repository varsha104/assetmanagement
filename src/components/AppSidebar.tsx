import { useState } from 'react';
import type { ComponentType } from 'react';
import { LayoutDashboard, Package, Layers3, LogOut, Users, X } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth, getRoleLabel } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface NavItem {
  title: string;
  url: string;
  icon: ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Employees', url: '/employees', icon: Users },
  { title: 'Tangible Assets', url: '/tangible-assets', icon: Package },
  { title: 'Intangible Assets', url: '/intangible-assets', icon: Layers3 },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (!user) return null;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 group-data-[collapsible=icon]:p-2">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
              <Package className="h-4 w-4 text-sidebar-primary-foreground" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-sidebar-foreground">AMS</h2>
              <p className="text-xs text-sidebar-foreground/60">Asset Management</p>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg bg-sidebar-primary">
            <Package className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/90 transition-colors hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
                      activeClassName="border-l-2 border-sidebar-primary bg-sidebar-accent pl-2 font-semibold text-sidebar-accent-foreground"
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        {!collapsed && (
          <>
            <Separator className="mb-2 bg-sidebar-border" />
            <div className="mb-2 px-1">
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</p>
              <p className="text-xs text-sidebar-foreground/60">{getRoleLabel(user.role)}</p>
            </div>
          </>
        )}
        <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size={collapsed ? 'icon' : 'sm'}
              className="w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Logout</span>}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent
            overlayClassName="bg-slate-900/20 backdrop-blur-sm"
            className="max-w-md rounded-2xl border border-slate-200/70 bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.1)]"
          >
            <AlertDialogCancel className="absolute right-4 top-4 mt-0 h-8 w-8 rounded-full border border-transparent bg-slate-100 p-0 text-slate-500 transition duration-150 hover:bg-slate-200 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-slate-300">
              <X className="h-4 w-4" />
            </AlertDialogCancel>
            <AlertDialogHeader className="gap-3 text-left">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <LogOut className="h-5 w-5" />
                </div>
                <AlertDialogTitle className="text-lg font-semibold text-slate-900">Logout?</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="text-sm leading-relaxed text-slate-600">
                You will be logged out of your account. You can sign back in anytime.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-3">
              <AlertDialogCancel className="rounded-full bg-slate-100 px-5 text-slate-700 transition duration-150 hover:bg-slate-200 focus-visible:ring-2 focus-visible:ring-slate-300 sm:mt-0">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  logout();
                  setLogoutOpen(false);
                }}
                className="rounded-full bg-red-500 px-5 text-white shadow-[0_6px_16px_rgba(239,68,68,0.35)] transition duration-150 hover:bg-red-600 focus-visible:ring-2 focus-visible:ring-red-300"
              >
                Log out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarFooter>
    </Sidebar>
  );
}
