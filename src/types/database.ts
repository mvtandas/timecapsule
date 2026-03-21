export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          username: string | null
          email: string | null
          avatar_url: string | null
          phone_number: string | null
          created_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          phone_number?: string | null
          created_at?: string
        }
        Relationships: []
      }
      capsules: {
        Row: {
          id: string
          owner_id: string
          title: string
          description: string | null
          content_refs: Json[] | null
          open_at: string | null
          lat: number | null
          lng: number | null
          is_public: boolean
          allowed_users: Json[] | null
          blockchain_hash: string | null
          created_at: string
          media_url: string | null
          media_type: 'image' | 'video' | 'none' | null
          is_locked: boolean
          view_count: number
        }
        Insert: {
          id?: string
          owner_id: string
          title: string
          description?: string | null
          content_refs?: Json[] | null
          open_at?: string | null
          lat?: number | null
          lng?: number | null
          is_public?: boolean
          allowed_users?: Json[] | null
          blockchain_hash?: string | null
          created_at?: string
          media_url?: string | null
          media_type?: 'image' | 'video' | 'none' | null
          is_locked?: boolean
          view_count?: number
        }
        Update: {
          id?: string
          owner_id?: string
          title?: string
          description?: string | null
          content_refs?: Json[] | null
          open_at?: string | null
          lat?: number | null
          lng?: number | null
          is_public?: boolean
          allowed_users?: Json[] | null
          blockchain_hash?: string | null
          created_at?: string
          media_url?: string | null
          media_type?: 'image' | 'video' | 'none' | null
          is_locked?: boolean
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: 'capsules_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      capsule_contents: {
        Row: {
          id: string
          capsule_id: string
          content_type: 'image' | 'video' | 'audio' | 'text'
          file_url: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          capsule_id: string
          content_type: 'image' | 'video' | 'audio' | 'text'
          file_url: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          capsule_id?: string
          content_type?: 'image' | 'video' | 'audio' | 'text'
          file_url?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'capsule_contents_capsule_id_fkey'
            columns: ['capsule_id']
            isOneToOne: false
            referencedRelation: 'capsules'
            referencedColumns: ['id']
          }
        ]
      }
      shared_capsules: {
        Row: {
          id: string
          capsule_id: string
          user_id: string
          permission: 'view' | 'edit'
          created_at: string
        }
        Insert: {
          id?: string
          capsule_id: string
          user_id: string
          permission: 'view' | 'edit'
          created_at?: string
        }
        Update: {
          id?: string
          capsule_id?: string
          user_id?: string
          permission?: 'view' | 'edit'
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'shared_capsules_capsule_id_fkey'
            columns: ['capsule_id']
            isOneToOne: false
            referencedRelation: 'capsules'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'shared_capsules_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      friend_requests: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          status: 'pending' | 'accepted' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sender_id: string
          receiver_id: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sender_id?: string
          receiver_id?: string
          status?: 'pending' | 'accepted' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          id: string
          capsule_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          capsule_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          capsule_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'comments_capsule_id_fkey'
            columns: ['capsule_id']
            isOneToOne: false
            referencedRelation: 'capsules'
            referencedColumns: ['id']
          }
        ]
      }
      likes: {
        Row: {
          id: string
          capsule_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          capsule_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          capsule_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'likes_capsule_id_fkey'
            columns: ['capsule_id']
            isOneToOne: false
            referencedRelation: 'capsules'
            referencedColumns: ['id']
          }
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          from_user_id: string | null
          capsule_id: string | null
          type: 'like' | 'comment' | 'friend_request' | 'friend_accepted' | 'capsule_opened'
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          from_user_id?: string | null
          capsule_id?: string | null
          type: 'like' | 'comment' | 'friend_request' | 'friend_accepted' | 'capsule_opened'
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          from_user_id?: string | null
          capsule_id?: string | null
          type?: 'like' | 'comment' | 'friend_request' | 'friend_accepted' | 'capsule_opened'
          message?: string
          is_read?: boolean
          created_at?: string
        }
        Relationships: []
      }
      streaks: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          current_streak: number
          longest_streak: number
          last_capsule_at: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          current_streak?: number
          longest_streak?: number
          last_capsule_at?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          current_streak?: number
          longest_streak?: number
          last_capsule_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      capsule_collaborators: {
        Row: {
          id: string
          capsule_id: string
          user_id: string
          added_at: string
        }
        Insert: {
          id?: string
          capsule_id: string
          user_id: string
          added_at?: string
        }
        Update: {
          id?: string
          capsule_id?: string
          user_id?: string
          added_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_user_id: string | null
          capsule_id: string | null
          comment_id: string | null
          reason: string
          details: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          reported_user_id?: string | null
          capsule_id?: string | null
          comment_id?: string | null
          reason: string
          details?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          reported_user_id?: string | null
          capsule_id?: string | null
          comment_id?: string | null
          reason?: string
          details?: string | null
          created_at?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          id: string
          blocker_id: string
          blocked_id: string
          created_at: string
        }
        Insert: {
          id?: string
          blocker_id: string
          blocked_id: string
          created_at?: string
        }
        Update: {
          id?: string
          blocker_id?: string
          blocked_id?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_capsule_view_count: {
        Args: { capsule_uuid: string }
        Returns: void
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
