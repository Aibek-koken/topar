import { create } from 'zustand';
import {
  fetchGroupBuy,
  fetchGroupBuys,
  fetchMyGroupIds,
  fetchProducts,
  joinGroup,
  leaveGroup,
  mockDb,
} from '@/lib/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { GroupBuy, Product } from '@/lib/types';

interface CatalogState {
  products: Product[];
  groups: GroupBuy[];
  joinedIds: Set<string>;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  refreshJoined: (userId: string) => Promise<void>;
  join: (groupId: string, userId: string) => Promise<{ error?: string }>;
  leave: (groupId: string, userId: string) => Promise<{ error?: string }>;
  /** Table-level live updates; returns unsubscribe. Call once from the tabs layout. */
  subscribeLive: () => () => void;
}

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  groups: [],
  joinedIds: new Set(),
  loading: true,
  error: null,

  load: async () => {
    set({ loading: get().products.length === 0, error: null });
    try {
      const [products, groups] = await Promise.all([fetchProducts(), fetchGroupBuys()]);
      set({ products, groups, loading: false });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  refreshJoined: async (userId) => {
    try {
      set({ joinedIds: await fetchMyGroupIds(userId) });
    } catch {
      // non-fatal: badges just won't show
    }
  },

  join: async (groupId, userId) => {
    const result = await joinGroup(groupId, userId);
    if (!result.error) {
      set({ joinedIds: new Set(get().joinedIds).add(groupId) });
      // Fallback refresh in case realtime is misconfigured; live demo still
      // gets its tick from the subscription on other devices
      const fresh = await fetchGroupBuy(groupId).catch(() => null);
      if (fresh) {
        set({ groups: get().groups.map((g) => (g.id === groupId ? { ...g, ...fresh } : g)) });
      }
    }
    return result;
  },

  leave: async (groupId, userId) => {
    const result = await leaveGroup(groupId, userId);
    if (!result.error) {
      const joinedIds = new Set(get().joinedIds);
      joinedIds.delete(groupId);
      set({ joinedIds });
      const fresh = await fetchGroupBuy(groupId).catch(() => null);
      if (fresh) {
        set({ groups: get().groups.map((g) => (g.id === groupId ? { ...g, ...fresh } : g)) });
      }
    }
    return result;
  },

  subscribeLive: () => {
    if (!isSupabaseConfigured) {
      return mockDb.subscribe(() => {
        set({
          groups: mockDb.groups.map((g) => ({ ...g })),
          joinedIds: new Set(mockDb.joined),
        });
      });
    }
    const channel = supabase
      .channel('group-buys-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_buys' },
        (payload) => {
          const row = payload.new as Partial<GroupBuy> & { id: string };
          set({
            groups: get().groups.map((g) => (g.id === row.id ? { ...g, ...row, product: g.product } : g)),
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
