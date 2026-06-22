import { supabase } from '../lib/supabase';
import { NotificationAppService } from './notificationService';

// New tables (migration 0007) aren't in the generated Database type yet.
const db: any = supabase;

export type MessageKind = 'text' | 'cap' | 'location';

export interface Conversation {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  last_message_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  kind: MessageKind;
  body: string | null;
  cap_id: string | null;
  lat: number | null;
  lng: number | null;
  location_name: string | null;
  created_at: string;
  read_at: string | null;
}

export interface ConversationSummary {
  conversation: Conversation;
  other: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null;
  lastMessage: Message | null;
  unread: number;
}

export class MessagingService {
  /** The two-user ordered key (user_a < user_b) used by the unique constraint. */
  private static pair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  /** Find or create the 1:1 conversation between the current user and `otherUserId`. */
  static async getOrCreateConversation(otherUserId: string): Promise<Conversation | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !otherUserId || otherUserId === user.id) return null;
      const [user_a, user_b] = MessagingService.pair(user.id, otherUserId);

      const { data: existing } = await db
        .from('conversations')
        .select('*')
        .eq('user_a', user_a)
        .eq('user_b', user_b)
        .maybeSingle();
      if (existing) return existing as Conversation;

      const { data, error } = await db
        .from('conversations')
        .insert({ user_a, user_b } as any)
        .select()
        .single();
      if (error) {
        // Lost a race — fetch the row the other insert created.
        const { data: again } = await db
          .from('conversations').select('*').eq('user_a', user_a).eq('user_b', user_b).maybeSingle();
        return (again as Conversation) || null;
      }
      return data as Conversation;
    } catch (e) {
      if (__DEV__) console.error('getOrCreateConversation', e);
      return null;
    }
  }

  /** All of the current user's conversations, newest activity first, with the
   *  other participant's profile + last message + unread count attached. */
  static async listConversations(): Promise<ConversationSummary[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: convos } = await db
        .from('conversations')
        .select('*')
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order('last_message_at', { ascending: false });
      const list = (convos as Conversation[]) || [];
      if (list.length === 0) return [];

      // Batch the other participants' profiles.
      const otherIds = Array.from(new Set(list.map((c) => (c.user_a === user.id ? c.user_b : c.user_a))));
      const { data: profiles } = await supabase
        .from('profiles').select('id, username, display_name, avatar_url').in('id', otherIds);
      const byId = new Map((profiles as any[] || []).map((p) => [p.id, p]));

      // Last message + unread per conversation (bounded — friends-only, low volume).
      return await Promise.all(list.map(async (c) => {
        const otherId = c.user_a === user.id ? c.user_b : c.user_a;
        const { data: lastArr } = await db
          .from('messages').select('*').eq('conversation_id', c.id)
          .order('created_at', { ascending: false }).limit(1);
        const { count } = await db
          .from('messages').select('id', { count: 'exact', head: true })
          .eq('conversation_id', c.id).is('read_at', null).neq('sender_id', user.id);
        return {
          conversation: c,
          other: byId.get(otherId) || null,
          lastMessage: (lastArr as Message[])?.[0] || null,
          unread: count || 0,
        };
      }));
    } catch (e) {
      if (__DEV__) console.error('listConversations', e);
      return [];
    }
  }

  static async getMessages(conversationId: string): Promise<Message[]> {
    const { data } = await db
      .from('messages').select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    return (data as Message[]) || [];
  }

  static async sendMessage(
    conversationId: string,
    payload: { body?: string; cap_id?: string; location?: { lat: number; lng: number; name?: string } },
  ): Promise<{ error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: 'Not authenticated' };
      const kind: MessageKind = payload.cap_id ? 'cap' : payload.location ? 'location' : 'text';
      const row: any = {
        conversation_id: conversationId,
        sender_id: user.id,
        kind,
        body: payload.body || null,
        cap_id: payload.cap_id || null,
        lat: payload.location?.lat ?? null,
        lng: payload.location?.lng ?? null,
        location_name: payload.location?.name || null,
      };
      const { error } = await db.from('messages').insert(row);
      if (error) return { error };

      // Bump conversation activity + notify the other participant.
      await db.from('conversations').update({ last_message_at: new Date().toISOString() } as any).eq('id', conversationId);
      const { data: convo } = await db.from('conversations').select('user_a, user_b').eq('id', conversationId).maybeSingle();
      if (convo) {
        const other = convo.user_a === user.id ? convo.user_b : convo.user_a;
        const senderName = user.user_metadata?.display_name || user.user_metadata?.username || user.email?.split('@')[0] || 'Someone';
        await NotificationAppService.create({
          userId: other,
          fromUserId: user.id,
          type: 'message',
          message: `${senderName}: ${kind === 'text' ? (payload.body || '').slice(0, 80) : kind === 'cap' ? '📦' : '📍'}`,
        });
      }
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  /** Mark the other person's messages in this conversation as read. */
  static async markRead(conversationId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await db.from('messages')
        .update({ read_at: new Date().toISOString() } as any)
        .eq('conversation_id', conversationId)
        .is('read_at', null)
        .neq('sender_id', user.id);
    } catch (e) { if (__DEV__) console.error('markRead', e); }
  }

  /** Total unread messages across all of the current user's conversations. */
  static async getTotalUnread(): Promise<number> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      const { count } = await db
        .from('messages').select('id', { count: 'exact', head: true })
        .is('read_at', null).neq('sender_id', user.id);
      return count || 0;
    } catch {
      return 0;
    }
  }
}
