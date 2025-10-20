import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types for type safety
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
      };
      capsules: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string | null;
          content_refs: any[] | null;
          open_at: string | null;
          lat: number | null;
          lng: number | null;
          is_public: boolean;
          allowed_users: any[] | null;
          blockchain_hash: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          title: string;
          description?: string | null;
          content_refs?: any[] | null;
          open_at?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_public?: boolean;
          allowed_users?: any[] | null;
          blockchain_hash?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string | null;
          content_refs?: any[] | null;
          open_at?: string | null;
          lat?: number | null;
          lng?: number | null;
          is_public?: boolean;
          allowed_users?: any[] | null;
          blockchain_hash?: string | null;
          created_at?: string;
        };
      };
      capsule_contents: {
        Row: {
          id: string;
          capsule_id: string;
          content_type: 'image' | 'video' | 'audio' | 'text';
          file_url: string;
          metadata: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          capsule_id: string;
          content_type: 'image' | 'video' | 'audio' | 'text';
          file_url: string;
          metadata?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          capsule_id?: string;
          content_type?: 'image' | 'video' | 'audio' | 'text';
          file_url?: string;
          metadata?: any;
          created_at?: string;
        };
      };
      shared_capsules: {
        Row: {
          id: string;
          capsule_id: string;
          user_id: string;
          permission: 'view' | 'edit';
          created_at: string;
        };
        Insert: {
          id?: string;
          capsule_id: string;
          user_id: string;
          permission: 'view' | 'edit';
          created_at?: string;
        };
        Update: {
          id?: string;
          capsule_id?: string;
          user_id?: string;
          permission?: 'view' | 'edit';
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
};