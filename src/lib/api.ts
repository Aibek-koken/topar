import { MOCK_GROUP_BUYS, MOCK_PRODUCTS } from './mockData';
import { isSupabaseConfigured, supabase } from './supabase';
import type { GroupBuy, Product } from './types';

// ---------------------------------------------------------------------------
// Mock mode: in-memory DB with listeners so join/leave still feels live when
// Supabase credentials are not configured yet.
// ---------------------------------------------------------------------------

class MockDb {
  groups: GroupBuy[] = MOCK_GROUP_BUYS.map((g) => ({ ...g }));
  joined = new Set<string>();
  private listeners = new Set<() => void>();

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  join(groupId: string) {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group || this.joined.has(groupId)) return;
    group.participants_count += 1;
    this.joined.add(groupId);
    this.emit();
  }

  leave(groupId: string) {
    const group = this.groups.find((g) => g.id === groupId);
    if (!group || !this.joined.has(groupId)) return;
    group.participants_count = Math.max(0, group.participants_count - 1);
    this.joined.delete(groupId);
    this.emit();
  }
}

export const mockDb = new MockDb();

// ---------------------------------------------------------------------------
// Data access — every function works in both modes
// ---------------------------------------------------------------------------

export async function fetchProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured) return MOCK_PRODUCTS;
  const { data, error } = await supabase.from('products').select('*').order('orders_count', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function fetchGroupBuys(): Promise<GroupBuy[]> {
  if (!isSupabaseConfigured) return mockDb.groups.map((g) => ({ ...g }));
  const { data, error } = await supabase
    .from('group_buys')
    .select('*, product:products(*)')
    .order('deadline', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GroupBuy[];
}

export async function fetchGroupBuy(id: string): Promise<GroupBuy | null> {
  if (!isSupabaseConfigured) {
    const g = mockDb.groups.find((x) => x.id === id);
    return g ? { ...g } : null;
  }
  const { data, error } = await supabase
    .from('group_buys')
    .select('*, product:products(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as GroupBuy) ?? null;
}

export async function fetchMyGroupIds(userId: string): Promise<Set<string>> {
  if (!isSupabaseConfigured) return new Set(mockDb.joined);
  const { data, error } = await supabase
    .from('group_participants')
    .select('group_buy_id')
    .eq('user_id', userId);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.group_buy_id as string));
}

export async function joinGroup(groupId: string, userId: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    mockDb.join(groupId);
    return {};
  }
  const { error } = await supabase
    .from('group_participants')
    .insert({ group_buy_id: groupId, user_id: userId });
  if (error && error.code !== '23505') return { error: error.message }; // 23505 = already joined
  return {};
}

export async function leaveGroup(groupId: string, userId: string): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    mockDb.leave(groupId);
    return {};
  }
  const { error } = await supabase
    .from('group_participants')
    .delete()
    .eq('group_buy_id', groupId)
    .eq('user_id', userId);
  if (error) return { error: error.message };
  return {};
}
