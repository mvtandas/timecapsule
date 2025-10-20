import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | 'none';
  vibrate?: boolean;
}

export class NotificationService {
  private static notificationChannel: Notifications.NotificationChannel | null = null;

  // Initialize notifications
  static async initialize(): Promise<void> {
    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
        return;
      }

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        this.notificationChannel = await Notifications.setNotificationChannelAsync('capsule-notifications', {
          name: 'Capsule Notifications',
          importance: Notifications.AndroidImportance.HIGH,
          sound: 'default',
          enableVibrate: true,
        });
      }

      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          console.log('Notification received:', notification);
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          };
        },
        handleSuccess: (notificationId) => {
          console.log('Notification shown:', notificationId);
        },
        handleError: (error) => {
          console.error('Notification error:', error);
        },
      });

      // Set up notification listener for when app is in foreground
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('Notification response:', response);
        this.handleNotificationResponse(response);
      });

      console.log('Notifications initialized');
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  // Schedule local notification
  static async scheduleNotification(
    notification: NotificationData,
    trigger: Notifications.NotificationTriggerInput
  ): Promise<string | null> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.sound || 'default',
        },
        trigger,
      });

      return notificationId;
    } catch (error) {
      console.error('Error scheduling notification:', error);
      return null;
    }
  }

  // Schedule capsule opening notification
  static async scheduleCapsuleOpeningNotification(
    capsuleId: string,
    capsuleTitle: string,
    openDate: Date
  ): Promise<string | null> {
    const notificationData: NotificationData = {
      title: 'Time Capsule Ready! 🎉',
      body: `Your capsule "${capsuleTitle}" is ready to open!`,
      data: {
        type: 'capsule_open',
        capsuleId,
      },
      sound: 'default',
      vibrate: true,
    };

    // Schedule notification for the opening time
    const trigger: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: openDate,
    };

    return this.scheduleNotification(notificationData, trigger);
  }

  // Schedule location-based notification
  static async scheduleLocationNotification(
    capsuleId: string,
    capsuleTitle: string,
    locationName: string
  ): Promise<string | null> {
    const notificationData: NotificationData = {
      title: 'Nearby Time Capsule! 📍',
      body: `You're near "${locationName}" where a capsule is waiting for you!`,
      data: {
        type: 'capsule_nearby',
        capsuleId,
      },
      sound: 'default',
      vibrate: true,
    };

    // This would be triggered by location services, not time
    // For now, we'll just return the notification data
    return null;
  }

  // Send immediate notification
  static async sendNotification(
    notification: NotificationData
  ): Promise<string | null> {
    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.IMMEDIATE,
    };

    return this.scheduleNotification(notificationData, trigger);
  }

  // Handle notification response
  private static handleNotificationResponse(response: Notifications.NotificationResponse): void {
    const { notification } = response;
    const data = notification.request.content.data;

    if (!data) return;

    switch (data.type) {
      case 'capsule_open':
        // Navigate to capsule details
        // This would be handled by navigation
        console.log('Opening capsule:', data.capsuleId);
        break;

      case 'capsule_nearby':
        // Navigate to map or capsule details
        console.log('Nearby capsule:', data.capsuleId);
        break;

      case 'capsule_shared':
        // Navigate to shared capsules
        console.log('Capsule shared:', data.capsuleId);
        break;

      default:
        console.log('Unknown notification type:', data.type);
    }
  }

  // Cancel notification
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      console.error('Error canceling notification:', error);
    }
  }

  // Get all scheduled notifications
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Clear all notifications
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  }

  // Get notification badge count
  static async getBadgeCount(): Promise<number> {
    try {
      const badgeCount = await Notifications.getBadgeCountAsync();
      return badgeCount;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Set notification badge count
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  // Check notification permissions
  static async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // Open notification settings
  static openNotificationSettings(): void {
    if (Platform.OS === 'ios') {
      Notifications.openAppSettings();
    } else {
      // Android doesn't have a direct way to open notification settings
      // You might need to use Linking to open app settings
      console.log('Please enable notifications in app settings');
    }
  }

  // Register device for push notifications
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      
      if (token) {
        // Save token to Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({ push_token: token.data })
            .eq('id', user.id);
        }
      }

      return token.data;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Unregister from push notifications
  static async unregisterFromPushNotifications(): Promise<void> {
    try {
      // Clear token from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ push_token: null })
          .eq('id', user.id);
      }
    } catch (error) {
      console.error('Error unregistering from push notifications:', error);
    }
  }
}