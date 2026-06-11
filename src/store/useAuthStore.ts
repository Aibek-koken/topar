import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

const MOCK_PROFILE_KEY = 'topar.mock.profile';

function defaultProfile(id: string, name: string): Profile {
  return {
    id,
    display_name: name,
    city: 'Алматы',
    budget_tier: null,
    interests: [],
    language: 'ru',
    esim_verified: false,
    onboarding_completed: false,
  };
}

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthState {
  status: AuthStatus;
  userId: string | null;
  profile: Profile | null;
  init: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
}

async function loadSupabaseProfile(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return (data as Profile) ?? null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'loading',
  userId: null,
  profile: null,

  init: async () => {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(MOCK_PROFILE_KEY);
      if (raw) {
        const profile = JSON.parse(raw) as Profile;
        set({ status: 'signedIn', userId: profile.id, profile });
      } else {
        set({ status: 'signedOut' });
      }
      return;
    }

    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (session) {
      const profile = await loadSupabaseProfile(session.user.id);
      set({ status: 'signedIn', userId: session.user.id, profile });
    } else {
      set({ status: 'signedOut' });
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!newSession) {
        set({ status: 'signedOut', userId: null, profile: null });
      }
    });
  },

  signUp: async (email, password, name) => {
    if (!isSupabaseConfigured) {
      const profile = defaultProfile('mock-user', name);
      await AsyncStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(profile));
      set({ status: 'signedIn', userId: profile.id, profile });
      return {};
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (!data.session || !data.user) {
      return { error: 'Email confirmation is enabled in Supabase — disable it in Auth settings for the demo.' };
    }
    const profile = defaultProfile(data.user.id, name);
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: profile.id,
      display_name: profile.display_name,
    });
    if (profileError) return { error: profileError.message };
    set({ status: 'signedIn', userId: data.user.id, profile });
    return {};
  },

  signIn: async (email, password) => {
    if (!isSupabaseConfigured) {
      const raw = await AsyncStorage.getItem(MOCK_PROFILE_KEY);
      const profile = raw
        ? (JSON.parse(raw) as Profile)
        : defaultProfile('mock-user', email.split('@')[0] || 'Гость');
      await AsyncStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(profile));
      set({ status: 'signedIn', userId: profile.id, profile });
      return {};
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    let profile = await loadSupabaseProfile(data.user.id);
    if (!profile) {
      profile = defaultProfile(data.user.id, email.split('@')[0] || '');
      await supabase.from('profiles').upsert({ id: profile.id, display_name: profile.display_name });
    }
    set({ status: 'signedIn', userId: data.user.id, profile });
    return {};
  },

  signOut: async () => {
    if (!isSupabaseConfigured) {
      await AsyncStorage.removeItem(MOCK_PROFILE_KEY);
    } else {
      await supabase.auth.signOut();
    }
    set({ status: 'signedOut', userId: null, profile: null });
  },

  updateProfile: async (patch) => {
    const { profile, userId } = get();
    if (!profile || !userId) return;
    const next = { ...profile, ...patch };
    set({ profile: next });
    if (!isSupabaseConfigured) {
      await AsyncStorage.setItem(MOCK_PROFILE_KEY, JSON.stringify(next));
      return;
    }
    await supabase.from('profiles').update(patch).eq('id', userId);
  },
}));
