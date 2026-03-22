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
      // Check existing permission status - don't auto-request on app launch
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        // Don't auto-request on app launch - wait for user action
        // Permission will be requested contextually when the user creates
        // a capsule with a future date (see CreateCapsuleScreen)
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
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          };
        },
        handleSuccess: (notificationId) => {
        },
        handleError: (error) => {
          if (__DEV__) console.error('Notification error:', error);
        },
      });

      // Set up notification listener for when app is in foreground
      Notifications.addNotificationResponseReceivedListener((response) => {
        this.handleNotificationResponse(response);
      });

    } catch (error) {
      if (__DEV__) console.error('Error initializing notifications:', error);
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
      if (__DEV__) console.error('Error scheduling notification:', error);
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

  // Schedule streak reminder at 9pm daily
  static async scheduleStreakReminder(): Promise<string | null> {
    const now = new Date();
    const trigger = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 0, 0);
    // If 9pm has already passed today, schedule for tomorrow
    if (trigger <= now) {
      trigger.setDate(trigger.getDate() + 1);
    }

    const notificationData: NotificationData = {
      title: 'Streak Reminder',
      body: 'Your streaks reset at midnight! Create a capsule to keep them going \uD83D\uDD25',
      data: {
        type: 'streak_reminder',
      },
      sound: 'default',
    };

    const triggerInput: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: trigger,
    };

    return this.scheduleNotification(notificationData, triggerInput);
  }

  // Schedule "opening soon" notification 1 hour before capsule opens
  static async scheduleCapsulesOpeningSoon(
    capsuleTitle: string,
    openDate: Date
  ): Promise<string | null> {
    const oneHourBefore = new Date(openDate.getTime() - 60 * 60 * 1000);

    // Only schedule if the 1-hour-before time is still in the future
    if (oneHourBefore <= new Date()) {
      return null;
    }

    const notificationData: NotificationData = {
      title: 'Opening Soon!',
      body: `Your capsule '${capsuleTitle}' opens in 1 hour! \uD83C\uDF89`,
      data: {
        type: 'capsule_opening_soon',
      },
      sound: 'default',
    };

    const triggerInput: Notifications.DateTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: oneHourBefore,
    };

    return this.scheduleNotification(notificationData, triggerInput);
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
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.sound || 'default',
        },
        trigger: null,
      });
      return id;
    } catch (error) {
      if (__DEV__) console.error('Error sending notification:', error);
      return null;
    }
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
        break;

      case 'capsule_nearby':
        // Navigate to map or capsule details
        break;

      case 'capsule_shared':
        // Navigate to shared capsules
        break;

      default:
    }
  }

  // Cancel notification
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (error) {
      if (__DEV__) console.error('Error canceling notification:', error);
    }
  }

  // Get all scheduled notifications
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      return notifications;
    } catch (error) {
      if (__DEV__) console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Clear all notifications
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      if (__DEV__) console.error('Error clearing notifications:', error);
    }
  }

  // Get notification badge count
  static async getBadgeCount(): Promise<number> {
    try {
      const badgeCount = await Notifications.getBadgeCountAsync();
      return badgeCount;
    } catch (error) {
      if (__DEV__) console.error('Error getting badge count:', error);
      return 0;
    }
  }

  // Set notification badge count
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      if (__DEV__) console.error('Error setting badge count:', error);
    }
  }

  // Check notification permissions
  static async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      if (__DEV__) console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  // Open notification settings
  static openNotificationSettings(): void {
    // Linking to app settings can be done via expo-linking if needed
  }

  // Register device for push notifications
  static async registerForPushNotifications(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();

      if (token) {
      }

      return token.data;
    } catch (error) {
      if (__DEV__) console.error('Error registering for push notifications:', error);
      return null;
    }
  }

  // Unregister from push notifications
  static async unregisterFromPushNotifications(): Promise<void> {
    try {
    } catch (error) {
      if (__DEV__) console.error('Error unregistering from push notifications:', error);
    }
  }
}