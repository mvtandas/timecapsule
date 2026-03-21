import { supabase } from '../lib/supabase';

export const REPORT_REASONS = [
  'Spam',
  'Inappropriate Content',
  'Harassment',
  'Hate Speech',
  'Other',
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number];

export class ReportService {
  /**
   * Report content (capsule, comment, or user)
   */
  static async reportContent(
    type: 'capsule' | 'comment' | 'user',
    targetId: string,
    reason: string,
    details?: string
  ): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const insertData: Record<string, any> = {
        reporter_id: user.id,
        reason,
        details: details || null,
      };

      if (type === 'capsule') {
        insertData.capsule_id = targetId;
      } else if (type === 'comment') {
        insertData.comment_id = targetId;
      } else if (type === 'user') {
        insertData.reported_user_id = targetId;
      }

      const { error } = await supabase.from('reports').insert(insertData as any);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Block a user
   */
  static async blockUser(userId: string): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('blocked_users').insert({
        blocker_id: user.id,
        blocked_id: userId,
      } as any);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Unblock a user
   */
  static async unblockUser(userId: string): Promise<{ error: any }> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId);

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  /**
   * Check if a user is blocked by the current user
   */
  static async isBlocked(userId: string): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data, error } = await supabase
        .from('blocked_users')
        .select('id')
        .eq('blocker_id', user.id)
        .eq('blocked_id', userId)
        .maybeSingle();

      if (error) return false;

      return !!data;
    } catch {
      return false;
    }
  }

  /**
   * Get all blocked users
   */
  static async getBlockedUsers(): Promise<any[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('blocked_users')
        .select('*')
        .eq('blocker_id', user.id)
        .order('created_at', { ascending: false });

      if (error) return [];

      return data || [];
    } catch {
      return [];
    }
  }
}
