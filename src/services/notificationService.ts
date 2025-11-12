import { supabase } from '../lib/supabase';

export interface Notification {
  id: string;
  type: 'private_capsule' | 'friend_request' | 'capsule_unlocked' | 'system';
  sender_id: string | null;
  receiver_id: string;
  capsule_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationWithSender extends Notification {
  sender?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export class NotificationService {
  /**
   * Send notification when sharing a private capsule
   */
  static async notifyPrivateCapsuleShared(
    senderId: string,
    receiverIds: string[],
    capsuleId: string,
    senderUsername: string
  ): Promise<{ success: boolean; error: any }> {
    try {
      if (receiverIds.length === 0) {
        return { success: true, error: null };
      }

      const notifications = receiverIds.map(receiverId => ({
        type: 'private_capsule' as const,
        sender_id: senderId,
        receiver_id: receiverId,
        capsule_id: capsuleId,
        message: `${senderUsername} shared a private capsule with you.`,
        read: false,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        // Don't log as error - just return the error for caller to handle
        console.warn('⚠️ Notifications not sent (table may not exist):', error.code);
        return { success: false, error };
      }

      console.log(`✅ Sent ${receiverIds.length} notification(s) for private capsule`);
      return { success: true, error: null };
    } catch (error) {
      console.error('Error in notifyPrivateCapsuleShared:', error);
      return { success: false, error };
    }
  }

  /**
   * Get all notifications for current user
   */
  static async getUserNotifications(limit: number = 50): Promise<{ 
    data: NotificationWithSender[] | null; 
    error: any 
  }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:sender_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `)
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data: data as NotificationWithSender[], error: null };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { data: null, error };
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(): Promise<{ count: number; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      if (error) throw error;

      return { count: count || 0, error: null };
    } catch (error) {
      console.error('Error getting unread count:', error);
      return { count: 0, error };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { error };
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('receiver_id', user.id)
        .eq('read', false);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error marking all as read:', error);
      return { error };
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(notificationId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { error };
    }
  }

  /**
   * Delete all notifications
   */
  static async deleteAllNotifications(): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('receiver_id', user.id);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      return { error };
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  static subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ) {
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `receiver_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 New notification received:', payload.new);
          callback(payload.new as Notification);
        }
      )
      .subscribe();

    return channel;
  }
}

