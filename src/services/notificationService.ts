import { supabase } from '../lib/supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  from_user_id: string | null;
  capsule_id: string | null;
  type: 'like' | 'comment' | 'friend_request' | 'friend_accepted' | 'capsule_opened';
  message: string;
  is_read: boolean;
  created_at: string;
  from_profile?: {
    id: string;
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
  } | null;
}

export class NotificationAppService {
  static async getNotifications(): Promise<{ data: AppNotification[]; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('notifications')
      .select('*, from_profile:from_user_id(id, display_name, username, avatar_url)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    return { data: (data as any) || [], error };
  }

  static async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return count || 0;
  }

  static async markAsRead(notificationId: string): Promise<void> {
    await supabase
      .from('notifications')
      .update({ is_read: true } as any)
      .eq('id', notificationId);
  }

  static async markAllAsRead(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('notifications')
      .update({ is_read: true } as any)
      .eq('user_id', user.id)
      .eq('is_read', false);
  }

  static async deleteNotification(id: string): Promise<{ error: any }> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    return { error };
  }

  static async clearAllNotifications(): Promise<{ error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: { message: 'Not authenticated' } };

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);
    return { error };
  }
}
