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
  avatarUrl: '/src/assets/images/avatar_admin_1794548316205.jpg',
  company: 'PT Nusantara Enterprise Global'
};

export const DEFAULT_USER_PROFILE: UserProfile = {
  id: 'usr_analyst_002',
  email: 'analyst@smartai.enterprise',
  fullName: 'Senior Data Scientist',
  role: 'user',
  avatarUrl: '/src/assets/images/avatar_analyst_1794548317627.jpg',
  company: 'PT Nusantara Enterprise Global'
};
