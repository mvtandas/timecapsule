import { supabase } from '../lib/supabase';

export type FriendRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendshipStatus {
  status: 'none' | 'pending_sent' | 'pending_received' | 'friends';
  requestId?: string;
}

export class FriendService {
  /**
   * Send a friend request to another user
   */
  static async sendFriendRequest(receiverId: string): Promise<{ data: FriendRequest | null; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: { message: 'Not authenticated' } };
      }

      if (user.id === receiverId) {
        return { data: null, error: { message: 'Cannot send friend request to yourself' } };
      }

      // Check if request already exists
      const existingStatus = await this.getFriendshipStatus(receiverId);
      if (existingStatus.status !== 'none') {
        return { data: null, error: { message: 'Request already exists or already friends' } };
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .insert({
          sender_id: user.id,
          receiver_id: receiverId,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending friend request:', error);
        return { data: null, error };
      }

      console.log('✅ Friend request sent:', data);
      return { data, error: null };
    } catch (error: any) {
      console.error('Error in sendFriendRequest:', error);
      return { data: null, error };
    }
  }

  /**
   * Get friendship status between current user and another user
   */
  static async getFriendshipStatus(otherUserId: string): Promise<FriendshipStatus> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { status: 'none' };
      }

      if (user.id === otherUserId) {
        return { status: 'none' };
      }

      // Check for any existing request in either direction
      const { data, error } = await supabase
        .from('friend_requests')
        .select('id, sender_id, receiver_id, status')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (error) {
        console.error('Error checking friendship status:', error);
        return { status: 'none' };
      }

      if (!data) {
        return { status: 'none' };
      }

      // If accepted, they are friends
      if (data.status === 'accepted') {
        return { status: 'friends', requestId: data.id };
      }

      // If pending and current user is sender
      if (data.status === 'pending' && data.sender_id === user.id) {
        return { status: 'pending_sent', requestId: data.id };
      }

      // If pending and current user is receiver
      if (data.status === 'pending' && data.receiver_id === user.id) {
        return { status: 'pending_received', requestId: data.id };
      }

      return { status: 'none' };
    } catch (error: any) {
      console.error('Error in getFriendshipStatus:', error);
      return { status: 'none' };
    }
  }

  /**
   * Accept a friend request
   */
  static async acceptFriendRequest(requestId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (error) {
        console.error('Error accepting friend request:', error);
        return { error };
      }

      console.log('✅ Friend request accepted');
      return { error: null };
    } catch (error: any) {
      console.error('Error in acceptFriendRequest:', error);
      return { error };
    }
  }

  /**
   * Reject a friend request
   */
  static async rejectFriendRequest(requestId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting friend request:', error);
        return { error };
      }

      console.log('✅ Friend request rejected');
      return { error: null };
    } catch (error: any) {
      console.error('Error in rejectFriendRequest:', error);
      return { error };
    }
  }

  /**
   * Cancel a sent friend request
   */
  static async cancelFriendRequest(requestId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('friend_requests')
        .delete()
        .eq('id', requestId);

      if (error) {
        console.error('Error canceling friend request:', error);
        return { error };
      }

      console.log('✅ Friend request canceled');
      return { error: null };
    } catch (error: any) {
      console.error('Error in cancelFriendRequest:', error);
      return { error };
    }
  }

  /**
   * Get all pending friend requests received by current user
   */
  static async getPendingRequests(): Promise<{ data: FriendRequest[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: { message: 'Not authenticated' } };
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .eq('receiver_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching pending requests:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (error: any) {
      console.error('Error in getPendingRequests:', error);
      return { data: [], error };
    }
  }

  /**
   * Get all friends (accepted requests)
   */
  static async getFriends(): Promise<{ data: string[]; error: any }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: [], error: { message: 'Not authenticated' } };
      }

      const { data, error } = await supabase
        .from('friend_requests')
        .select('sender_id, receiver_id')
        .eq('status', 'accepted')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

      if (error) {
        console.error('Error fetching friends:', error);
        return { data: [], error };
      }

      // Extract friend IDs (the other user in each request)
      const friendIds = (data || []).map((request) => 
        request.sender_id === user.id ? request.receiver_id : request.sender_id
      );

      return { data: friendIds, error: null };
    } catch (error: any) {
      console.error('Error in getFriends:', error);
      return { data: [], error };
    }
  }
}

