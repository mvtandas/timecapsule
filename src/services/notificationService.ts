import { supabase } from '../lib/supabase';

export interface AppNotification {
  id: string;
  user_id: string;
  from_user_id: string | null;
  capsule_id: string | null;
  type: 'like' | 'comment' | 'friend_request' | 'friend_accepted' | 'capsule_opened' | 'message';
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
  /** Insert a notification for another user (e.g. a new message). The
   *  notifications RLS insert policy is permissive, so this works with the anon key. */
  static async create(params: {
    userId: string;
    fromUserId?: string | null;
    type: AppNotification['type'];
    message: string;
    capsuleId?: string | null;
  }): Promise<void> {
    try {
      await supabase.from('notifications').insert({
        user_id: params.userId,
        from_user_id: params.fromUserId ?? null,
        capsule_id: params.capsuleId ?? null,
        type: params.type,
        message: params.message,
      } as any);
    } catch (e) { if (__DEV__) console.error('notif create', e); }
  }

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
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true } as any)
        .eq('id', notificationId);
    } catch (e) { if (__DEV__) console.error(e); }
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
