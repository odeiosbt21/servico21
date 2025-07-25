import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'review' | 'chat_request' | 'status_update';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

export const createNotification = async (
  userId: string,
  type: Notification['type'],
  title: string,
  message: string,
  data?: any
) => {
  try {
    const notificationData = {
      userId,
      type,
      title,
      message,
      data: data || {},
      read: false,
      createdAt: Timestamp.now(),
    };
    
    await addDoc(collection(db, 'notifications'), notificationData);
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

export const getUserNotifications = (
  userId: string,
  callback: (notifications: Notification[]) => void
) => {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (querySnapshot) => {
    const notifications: Notification[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        read: data.read,
        createdAt: data.createdAt.toDate(),
      });
    });
    callback(notifications);
  });
};

export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { read: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const getUnreadNotificationsCount = async (userId: string): Promise<number> => {
  try {
    const savedCount = await AsyncStorage.getItem(`unread_notifications_${userId}`);
    return savedCount ? parseInt(savedCount) : 0;
  } catch (error) {
    console.error('Error getting unread notifications count:', error);
    return 0;
  }
};

export const setUnreadNotificationsCount = async (userId: string, count: number) => {
  try {
    await AsyncStorage.setItem(`unread_notifications_${userId}`, count.toString());
  } catch (error) {
    console.error('Error setting unread notifications count:', error);
  }
};