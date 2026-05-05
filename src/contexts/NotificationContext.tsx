import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { intangibleApi, notificationApi, type IntangibleAsset, type RenewalNotification } from '@/services/api';

const READ_NOTIFICATIONS_KEY = 'src_23rasset_read_notifications';
const DELETED_INTANGIBLE_ASSET_IDS_KEY = 'src_23rasset_deleted_intangible_asset_ids';
const REMINDER_DAYS = [5, 1] as const;

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  assetName: string;
  renewalDate: string;
  daysBefore: number;
  isRead: boolean;
  createdAt: string;
};

type NotificationContextType = {
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

function loadStringList(key: string) {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function saveStringList(key: string, values: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(Array.from(new Set(values))));
}

function parseLocalDate(value?: string) {
  if (!value) return null;

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function formatDate(value: string) {
  const date = parseLocalDate(value);
  if (!date) return value;

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDaysUntil(date: Date) {
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((date.getTime() - startOfToday.getTime()) / 86_400_000);
}

function getAssetName(asset: IntangibleAsset) {
  return asset.name || asset.site_name || 'Intangible asset';
}

function getRenewalDate(asset: IntangibleAsset) {
  return asset.renewal_date || asset.subscription_renewal_date || asset.Subscription_renewal_date || '';
}

function normalizeIntangibleResponse(data: unknown): IntangibleAsset[] {
  if (Array.isArray(data)) return data as IntangibleAsset[];

  if (data && typeof data === 'object') {
    const items = (data as { intangible_assets?: unknown }).intangible_assets;
    return Array.isArray(items) ? (items as IntangibleAsset[]) : [];
  }

  return [];
}

function buildRenewalNotifications(assets: IntangibleAsset[], readIds: string[]) {
  const deletedIds = new Set(loadStringList(DELETED_INTANGIBLE_ASSET_IDS_KEY));

  return assets.flatMap((asset) => {
    const renewalDate = getRenewalDate(asset);
    const renewalDateValue = parseLocalDate(renewalDate);
    if (!renewalDateValue || deletedIds.has(`INT-${asset.id}`)) return [];

    const daysUntilRenewal = getDaysUntil(renewalDateValue);
    if (!REMINDER_DAYS.includes(daysUntilRenewal as (typeof REMINDER_DAYS)[number])) return [];

    const assetName = getAssetName(asset);
    const id = `intangible-renewal-${asset.id}-${daysUntilRenewal}`;

    return [
      {
        id,
        title: 'Renewal Reminder',
        message: `${assetName} renewal is due on ${formatDate(renewalDate)}.`,
        assetName,
        renewalDate,
        daysBefore: daysUntilRenewal,
        isRead: readIds.includes(id),
        createdAt: new Date().toISOString(),
      },
    ];
  });
}

function normalizeNotificationResponse(data: unknown): RenewalNotification[] {
  if (Array.isArray(data)) return data as RenewalNotification[];

  if (data && typeof data === 'object') {
    const items = (data as { notifications?: unknown }).notifications;
    return Array.isArray(items) ? (items as RenewalNotification[]) : [];
  }

  return [];
}

function buildBackendNotifications(items: RenewalNotification[], readIds: string[]) {
  return items
    .filter((item) => item.renewal_date)
    .map((item) => {
      const assetId = item.asset_id || item.id || item.asset_name || item.name || 'asset';
      const daysBefore = item.days_before ?? item.daysBefore ?? 0;
      const assetName = item.asset_name || item.name || 'Intangible asset';
      const renewalDate = item.renewal_date || '';
      const id = String(item.id || `intangible-renewal-${assetId}-${daysBefore}`);

      return {
        id,
        title: item.title || 'Renewal Reminder',
        message: item.message || `${assetName} renewal is due on ${formatDate(renewalDate)}.`,
        assetName,
        renewalDate,
        daysBefore,
        isRead: readIds.includes(id),
        createdAt: item.created_at || new Date().toISOString(),
      };
    });
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const toastedIds = useRef(new Set<string>());

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    setIsLoading(true);
    try {
      const readIds = loadStringList(READ_NOTIFICATIONS_KEY);
      const backendResult = await notificationApi.getRenewalNotifications();
      let nextNotifications = backendResult.ok
        ? buildBackendNotifications(normalizeNotificationResponse(backendResult.data), readIds)
        : [];

      if (!backendResult.ok) {
        const result = await intangibleApi.getAll();
        if (!result.ok) return;
        nextNotifications = buildRenewalNotifications(normalizeIntangibleResponse(result.data), readIds);
      }

      setNotifications(nextNotifications);
      nextNotifications
        .filter((notification) => !notification.isRead && !toastedIds.current.has(notification.id))
        .forEach((notification) => {
          toastedIds.current.add(notification.id);
          toast({
            title: notification.title,
            description: notification.message,
          });
        });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, toast]);

  useEffect(() => {
    void fetchNotifications();

    if (!isAuthenticated) return undefined;
    const timer = window.setInterval(() => void fetchNotifications(), 60_000);
    return () => window.clearInterval(timer);
  }, [fetchNotifications, isAuthenticated]);

  const markAsRead = useCallback((id: string) => {
    const readIds = Array.from(new Set([...loadStringList(READ_NOTIFICATIONS_KEY), id]));
    saveStringList(READ_NOTIFICATIONS_KEY, readIds);
    setNotifications((prev) =>
      prev.map((notification) => (notification.id === id ? { ...notification, isRead: true } : notification)),
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifications.map((notification) => notification.id);
    saveStringList(READ_NOTIFICATIONS_KEY, [...loadStringList(READ_NOTIFICATIONS_KEY), ...allIds]);
    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
  }, [notifications]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const value = useMemo(
    () => ({ notifications, unreadCount, isLoading, fetchNotifications, markAsRead, markAllAsRead }),
    [fetchNotifications, isLoading, markAllAsRead, markAsRead, notifications, unreadCount],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
