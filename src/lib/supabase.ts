import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig, getSupabaseClient } from './supabaseService';

export const isSupabaseConfigured = getSupabaseConfig().isConfigured;

export const supabase: SupabaseClient | null = getSupabaseClient();

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  avatarUrl?: string;
  company?: string;
}

export const DEFAULT_ADMIN_PROFILE: UserProfile = {
  id: 'usr_admin_001',
  email: 'admin@smartai.enterprise',
  fullName: 'Director of Analytics',
  role: 'admin',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  company: 'PT Nusantara Enterprise Global'
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'usr_analyst_002',
  email: 'analyst@smartai.enterprise',
  fullName: 'Senior Data Scientist',
  role: 'user',
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  company: 'PT Nusantara Enterprise Global'
};
