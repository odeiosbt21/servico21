import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { 
  getUserNotifications, 
  Notification, 
  getUnreadNotificationsCount,
  setUnreadNotificationsCount 
} from '@/services/notifications';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  refreshNotifications: () => void;
  markAllAsRead: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  refreshNotifications: () => {},
  markAllAsRead: () => {},
});

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    loadUnreadCount();
    
    const unsubscribe = getUserNotifications(user.uid, (newNotifications) => {
      setNotifications(newNotifications);
      const unread = newNotifications.filter(n => !n.read).length;
      setUnreadCount(unread);
      setUnreadNotificationsCount(user.uid, unread);
    });

    return unsubscribe;
  }, [user]);

  const loadUnreadCount = async () => {
    if (user) {
      const count = await getUnreadNotificationsCount(user.uid);
      setUnreadCount(count);
    }
  };

  const refreshNotifications = () => {
    // Notifications are automatically updated via onSnapshot
  };

  const markAllAsRead = async () => {
    if (user) {
      setUnreadCount(0);
      await setUnreadNotificationsCount(user.uid, 0);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      refreshNotifications,
      markAllAsRead
    }}>
      {children}
    </NotificationContext.Provider>
  );
};