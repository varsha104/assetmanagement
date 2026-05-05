import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/contexts/NotificationContext';

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead } = useNotifications();

  return (
    <Popover onOpenChange={(open) => (open ? void fetchNotifications() : undefined)}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="relative h-9 w-9 text-slate-700 hover:bg-slate-100">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Notifications</h2>
            <p className="text-xs text-slate-500">{unreadCount} unread</p>
          </div>
          <div className="flex items-center gap-1">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
            {notifications.length > 0 ? (
              <Button type="button" variant="ghost" size="sm" className="h-8 px-2" onClick={markAllAsRead}>
                <CheckCheck className="mr-1 h-4 w-4" />
                Read all
              </Button>
            ) : null}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No renewal reminders right now.</div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className="block w-full border-b px-4 py-3 text-left transition hover:bg-slate-50"
                onClick={() => markAsRead(notification.id)}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      notification.isRead ? 'bg-slate-300' : 'bg-red-500'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    {notification.category ? (
                      <p className="mt-1 text-xs font-medium text-slate-500">Category: {notification.category}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-slate-500">
                      {notification.daysBefore} day{notification.daysBefore === 1 ? '' : 's'} before renewal
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
