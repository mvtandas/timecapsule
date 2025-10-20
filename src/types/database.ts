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
          user_id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      capsules: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          message: string
          unlock_date: string
          latitude: number
          longitude: number
          location_name: string | null
          is_public: boolean
          media_urls: string[]
          created_at: string
          updated_at: string
          unlocked_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          message: string
          unlock_date: string
          latitude: number
          longitude: number
          location_name?: string | null
          is_public?: boolean
          media_urls?: string[]
          created_at?: string
          updated_at?: string
          unlocked_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string | null
          message?: string
          unlock_date?: string
          latitude?: number
          longitude?: number
          location_name?: string | null
          is_public?: boolean
          media_urls?: string[]
          created_at?: string
          updated_at?: string
          unlocked_at?: string | null
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          capsule_id: string | null
          type: string
          title: string
          message: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          capsule_id?: string | null
          type: string
          title: string
          message: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          capsule_id?: string | null
          type?: string
          title?: string
          message?: string
          is_read?: boolean
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

