import { create } from 'zustand';
import {
  fetchGroupBuy,
  fetchGroupBuys,
  fetchMyGroupIds,
  fetchProducts,
  joinGroup,
  leaveGroup,
  mockDb,
  PRODUCTS_PAGE_SIZE,
} from '@/lib/api';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { GroupBuy, Product } from '@/lib/types';
import { detectTierCross, useCelebrationStore } from './useCelebrationStore';

interface CatalogState {
  products: Product[];
  groups: GroupBuy[];
  joinedIds: Set<string>;
  loading: boolean;
  loadingMore: boolean;
  hasMoreProducts: boolean;
  error: string | null;
  load: () => Promise<void>;
  /** Appends the next page of products (feed infinite scroll). */
  loadMore: () => Promise<void>;
  /** Loads the entire remaining catalog (search/filter needs the full set). */
  loadAllProducts: () => Promise<void>;
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
  loadingMore: false,
  hasMoreProducts: true,
  error: null,

  load: async () => {
    set({ loading: get().products.length === 0, error: null });
    try {
      const [products, groups] = await Promise.all([fetchProducts(0), fetchGroupBuys()]);
      set({
        products,
        groups,
        loading: false,
        hasMoreProducts: products.length === PRODUCTS_PAGE_SIZE,
      });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e), loading: false });
    }
  },

  loadMore: async () => {
    const { loading, loadingMore, hasMoreProducts, products } = get();
    if (loading || loadingMore || !hasMoreProducts) return;
    set({ loadingMore: true });
    try {
      const page = await fetchProducts(products.length);
      const seen = new Set(products.map((p) => p.id));
      set({
        products: [...products, ...page.filter((p) => !seen.has(p.id))],
        hasMoreProducts: page.length === PRODUCTS_PAGE_SIZE,
        loadingMore: false,
      });
    } catch {
      set({ loadingMore: false }); // non-fatal: next scroll retries
    }
  },

  loadAllProducts: async () => {
    while (get().hasMoreProducts && !get().loadingMore) {
      await get().loadMore();
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
        const prev = get().groups;
        const next = prev.map((g) => (g.id === groupId ? { ...g, ...fresh } : g));
        const cross = detectTierCross(prev, next, get().products);
        set({ groups: next });
        if (cross) useCelebrationStore.getState().fire(cross);
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
        const prev = get().groups;
        const next = mockDb.groups.map((g) => ({ ...g }));
        const cross = detectTierCross(prev, next, get().products);
        set({ groups: next, joinedIds: new Set(mockDb.joined) });
        if (cross) useCelebrationStore.getState().fire(cross);
      });
    }
    const channel = supabase
      .channel('group-buys-live')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'group_buys' },
        (payload) => {
          const row = payload.new as Partial<GroupBuy> & { id: string };
          const prev = get().groups;
          const next = prev.map((g) => (g.id === row.id ? { ...g, ...row, product: g.product } : g));
          const cross = detectTierCross(prev, next, get().products);
          set({ groups: next });
          if (cross) useCelebrationStore.getState().fire(cross);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
