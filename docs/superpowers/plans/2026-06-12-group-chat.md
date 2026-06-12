# Group Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Real-time chat per group buy — full-screen at `/group/[id]/chat`, read-for-all / write-for-participants, with trigger-driven join events and seeded demo messages.

**Architecture:** New `group_messages` table (kind `text`|`join`) with RLS and a `security definer` trigger on `group_participants` announcing joins. The chat screen holds local state: initial fetch + Realtime INSERT subscription filtered by group. Mock mode mirrors everything inside `MockDb`. System messages store no language — clients render the localized join line from `display_name`.

**Tech Stack:** Expo SDK 54 / expo-router, Supabase (Postgres trigger, RLS, Realtime), i18next RU/KK/EN.

**Spec:** `docs/superpowers/specs/2026-06-12-group-chat-design.md`

**Conventions:** gate every task with `npx tsc --noEmit` (must stay clean). Run commands from repo root.

---

### Task 1: Data layer — migration, types, mock messages, api functions

**Files:**
- Create: `supabase/migrations/0004_group_chat.sql`
- Modify: `src/lib/types.ts` (append)
- Modify: `src/lib/mockData.ts` (append)
- Modify: `src/lib/api.ts` (MockDb + two functions)

- [ ] **Step 1: Create the migration**

Create `supabase/migrations/0004_group_chat.sql`:

```sql
-- Group chat. Paste into Supabase Dashboard -> SQL Editor and run once
-- (after 0001_schema.sql).

create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null, -- null for system/seed rows
  display_name text not null default '',
  kind text not null default 'text' check (kind in ('text','join')),
  body text, -- null for 'join'
  created_at timestamptz not null default now()
);

create index group_messages_group_idx on public.group_messages (group_buy_id, created_at);

alter table public.group_messages enable row level security;

-- Read for everyone (lurkers see the hype); write only for participants.
create policy "read messages" on public.group_messages for select using (true);
create policy "send messages" on public.group_messages for insert with check (
  auth.uid() = user_id
  and exists (
    select 1 from public.group_participants gp
    where gp.group_buy_id = group_messages.group_buy_id
      and gp.user_id = auth.uid()
  )
);

-- Server-authoritative join announcements (same pattern as sync_participants_count).
create or replace function public.announce_join() returns trigger as $$
begin
  insert into public.group_messages (group_buy_id, user_id, display_name, kind)
  select new.group_buy_id, null, coalesce(p.display_name, ''), 'join'
  from public.profiles p where p.id = new.user_id;
  return null;
end;
$$ language plpgsql security definer;

create trigger trg_announce_join
after insert on public.group_participants
for each row execute function public.announce_join();

alter publication supabase_realtime add table public.group_messages;
```

- [ ] **Step 2: Append the message type**

In `src/lib/types.ts`, append at the end:

```ts
export type GroupMessageKind = 'text' | 'join';

export interface GroupMessage {
  id: string;
  group_buy_id: string;
  user_id: string | null;
  display_name: string;
  kind: GroupMessageKind;
  body: string | null;
  created_at: string;
}
```

- [ ] **Step 3: Add mock seed messages**

In `src/lib/mockData.ts`: add `GroupMessage` to the type import from `./types`, and append at the end of the file:

```ts
// Chat looks alive in demo groups even without Supabase
export const MOCK_MESSAGES: GroupMessage[] = [
  {
    id: 'mock-msg-1',
    group_buy_id: 'gb-wireless-earbuds',
    user_id: null,
    display_name: 'Айжан',
    kind: 'text',
    body: 'Берём! Осталась пара мест 🔥',
    created_at: new Date(now - 30 * 60_000).toISOString(),
  },
  {
    id: 'mock-msg-2',
    group_buy_id: 'gb-wireless-earbuds',
    user_id: null,
    display_name: 'Дамир',
    kind: 'text',
    body: 'Цена огонь, в магазине вдвое дороже',
    created_at: new Date(now - 12 * 60_000).toISOString(),
  },
  {
    id: 'mock-msg-3',
    group_buy_id: 'gb-smart-watch',
    user_id: null,
    display_name: 'Алия',
    kind: 'text',
    body: 'Жду эту цену месяц 😍',
    created_at: new Date(now - 45 * 60_000).toISOString(),
  },
];
```

(`now` already exists in that file: `const now = Date.now();`.)

- [ ] **Step 4: Extend MockDb and add api functions**

In `src/lib/api.ts`:

Change the mockData import to include messages, and the types import to include `GroupMessage`:

```ts
import { MOCK_GROUP_BUYS, MOCK_MESSAGES, MOCK_PRODUCTS } from './mockData';
import { isSupabaseConfigured, supabase } from './supabase';
import type { GroupBuy, GroupMessage, Product } from './types';
```

Inside `class MockDb`, add fields after `joined = new Set<string>();`:

```ts
  private messages: GroupMessage[] = MOCK_MESSAGES.map((m) => ({ ...m }));
  private msgSeq = 0;
```

Add methods after `leave(...)`:

```ts
  getMessages(groupId: string): GroupMessage[] {
    return this.messages.filter((m) => m.group_buy_id === groupId).map((m) => ({ ...m }));
  }

  sendMessage(groupId: string, displayName: string, body: string) {
    this.messages.push({
      id: `local-${++this.msgSeq}`,
      group_buy_id: groupId,
      user_id: 'mock-user',
      display_name: displayName,
      kind: 'text',
      body,
      created_at: new Date().toISOString(),
    });
    this.emit();
  }
```

In the existing `join(groupId)` method, right before `this.emit();`, add the join announcement:

```ts
    this.messages.push({
      id: `local-${++this.msgSeq}`,
      group_buy_id: groupId,
      user_id: null,
      display_name: '',
      kind: 'join',
      body: null,
      created_at: new Date().toISOString(),
    });
```

Append at the end of the file:

```ts
export async function fetchMessages(groupId: string): Promise<GroupMessage[]> {
  if (!isSupabaseConfigured) return mockDb.getMessages(groupId);
  const { data, error } = await supabase
    .from('group_messages')
    .select('*')
    .eq('group_buy_id', groupId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as GroupMessage[];
}

export async function sendMessage(
  groupId: string,
  userId: string,
  displayName: string,
  body: string
): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) {
    mockDb.sendMessage(groupId, displayName, body);
    return {};
  }
  const { error } = await supabase.from('group_messages').insert({
    group_buy_id: groupId,
    user_id: userId,
    display_name: displayName,
    kind: 'text',
    body,
  });
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add supabase/migrations/0004_group_chat.sql src/lib/types.ts src/lib/mockData.ts src/lib/api.ts
git commit -m "feat: group chat data layer (table, trigger, mock, api)"
```

---

### Task 2: Route restructure + chat button

**Files:**
- Move: `src/app/group/[id].tsx` → `src/app/group/[id]/index.tsx`
- Modify: `src/app/group/[id]/index.tsx` (header)

- [ ] **Step 1: Move the file (preserve git history)**

```powershell
New-Item -ItemType Directory "src/app/group/[id]"
git mv "src/app/group/[id].tsx" "src/app/group/[id]/index.tsx"
```

- [ ] **Step 2: Add the chat button**

In `src/app/group/[id]/index.tsx`, replace the header spacer:

```tsx
          <Text style={styles.headerTitle}>{t('group.title')}</Text>
          <View style={{ width: 40 }} />
```

with:

```tsx
          <Text style={styles.headerTitle}>{t('group.title')}</Text>
          <Pressable style={styles.back} onPress={() => router.push(`/group/${group.id}/chat`)}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.text} />
          </Pressable>
```

(`styles.back` is reused for the round icon button; `Pressable` and `Ionicons` are already imported.)

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit` → clean (the chat route file doesn't exist yet; expo-router string routes are not type-checked here, but if typed routes complain, finish Task 3 first and re-run).

```bash
git add -A "src/app/group"
git commit -m "feat: move group screen into folder route, add chat button"
```

---

### Task 3: Chat screen + locale strings

**Files:**
- Create: `src/app/group/[id]/chat.tsx`
- Modify: `src/locales/ru.json`, `src/locales/kk.json`, `src/locales/en.json`

- [ ] **Step 1: Create the chat screen**

Create `src/app/group/[id]/chat.tsx`:

```tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ScreenContainer } from '@/components/ScreenContainer';
import { fetchMessages, mockDb, sendMessage } from '@/lib/api';
import { authErrorKey } from '@/lib/authErrors';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import type { GroupMessage } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const profile = useAuthStore((s) => s.profile);
  const joined = useCatalogStore((s) => (id ? s.joinedIds.has(id) : false));

  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial history
  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetchMessages(id)
      .then((msgs) => {
        if (alive) setMessages(msgs);
      })
      .catch(() => {
        if (alive) setError(t('common.error'));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, t]);

  // Live inserts for this group only
  useEffect(() => {
    if (!id) return;
    if (!isSupabaseConfigured) {
      return mockDb.subscribe(() => setMessages(mockDb.getMessages(id)));
    }
    const channel = supabase
      .channel(`chat-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_buy_id=eq.${id}` },
        (payload) => {
          const msg = payload.new as GroupMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || !id || !userId || sending) return;
    setSending(true);
    setError(null);
    const result = await sendMessage(id, userId, profile?.display_name ?? '', body);
    setSending(false);
    if (result.error) {
      setError(t(authErrorKey(result.error)));
      return;
    }
    setDraft(''); // message arrives via the realtime echo
  }, [draft, id, userId, sending, profile?.display_name, t]);

  const newestFirst = [...messages].reverse();

  return (
    <ScreenContainer padded={false}>
      <View style={styles.headerRow}>
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('chat.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {loading ? (
          <ActivityIndicator style={styles.flex} color={colors.primary} />
        ) : (
          <FlatList
            inverted
            data={newestFirst}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) =>
              item.kind === 'join' ? (
                <Text style={styles.joinLine}>
                  👋 {t('chat.joined', { name: item.display_name || t('chat.someone') })}
                </Text>
              ) : (
                <View
                  style={[styles.bubble, item.user_id === userId ? styles.bubbleMine : styles.bubbleOther]}>
                  {item.user_id !== userId && !!item.display_name && (
                    <Text style={styles.author}>{item.display_name}</Text>
                  )}
                  <Text style={[styles.body, item.user_id === userId && styles.bodyMine]}>
                    {item.body}
                  </Text>
                </View>
              )
            }
            ListEmptyComponent={
              // inverted lists render the empty component flipped — flip it back
              <Text style={[styles.empty, styles.unflip]}>{t('chat.empty')}</Text>
            }
          />
        )}

        {error && (
          <View style={styles.errorWrap}>
            <ErrorBanner message={error} />
          </View>
        )}

        {joined ? (
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.textMuted}
              multiline
              maxLength={500}
            />
            <Pressable
              style={[styles.sendBtn, (!draft.trim() || sending) && styles.sendBtnDisabled]}
              onPress={send}
              disabled={!draft.trim() || sending}
              accessibilityLabel={t('chat.placeholder')}>
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="arrow-up" size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        ) : (
          <Text style={styles.joinHint}>{t('chat.joinToChat')}</Text>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.card,
  },
  headerTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  list: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  bubble: {
    maxWidth: '80%',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bubbleOther: { alignSelf: 'flex-start', backgroundColor: colors.card, ...shadow.card },
  author: { fontSize: 12, fontWeight: '700', color: colors.esim, marginBottom: 2 },
  body: { fontSize: 15, color: colors.text, lineHeight: 20 },
  bodyMine: { color: '#fff' },
  joinLine: {
    alignSelf: 'center',
    fontSize: 12.5,
    color: colors.textSecondary,
    paddingVertical: spacing.xs,
  },
  empty: { textAlign: 'center', color: colors.textMuted, fontSize: 14, paddingTop: spacing.xl },
  unflip: { transform: [{ scaleY: -1 }] },
  errorWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.text,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
  joinHint: {
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 13.5,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
});
```

- [ ] **Step 2: Add locale strings**

In `src/locales/ru.json`, after the `"search": { ... }` section's closing `},` add:

```json
  "chat": {
    "title": "Чат группы",
    "placeholder": "Сообщение…",
    "joined": "{{name}} присоединился(ась) к группе",
    "someone": "Кто-то",
    "joinToChat": "Присоединитесь к группе, чтобы писать в чат",
    "empty": "Пока тихо — будьте первым!"
  },
```

In `src/locales/kk.json`, same position:

```json
  "chat": {
    "title": "Топ чаты",
    "placeholder": "Хабарлама…",
    "joined": "{{name}} топқа қосылды",
    "someone": "Біреу",
    "joinToChat": "Чатқа жазу үшін топқа қосылыңыз",
    "empty": "Әзірге тыныш — бірінші болыңыз!"
  },
```

In `src/locales/en.json`, same position:

```json
  "chat": {
    "title": "Group chat",
    "placeholder": "Message…",
    "joined": "{{name}} joined the group",
    "someone": "Someone",
    "joinToChat": "Join the group to chat",
    "empty": "Quiet so far — be the first!"
  },
```

- [ ] **Step 3: Validate and commit**

Run: `npx tsx -e "for (const l of ['ru','kk','en']) { require('./src/locales/' + l + '.json'); console.log(l, 'ok'); }"` → `ru ok / kk ok / en ok`
Run: `npx tsc --noEmit` → clean.

```bash
git add "src/app/group/[id]/chat.tsx" src/locales/ru.json src/locales/kk.json src/locales/en.json
git commit -m "feat: group chat screen with realtime messages"
```

---

### Task 4: Seed demo chat messages

**Files:**
- Modify: `scripts/sync-catalog/seedGroups.ts`

- [ ] **Step 1: Capture inserted group ids and seed messages**

In `scripts/sync-catalog/seedGroups.ts`, replace:

```ts
  const ins = await db.from('group_buys').insert(rows);
  if (ins.error) throw new Error(`inserting group_buys failed: ${ins.error.message}`);
```

with:

```ts
  const ins = await db.from('group_buys').insert(rows).select('id');
  if (ins.error) throw new Error(`inserting group_buys failed: ${ins.error.message}`);

  await seedChat(db, (ins.data ?? []).map((g) => g.id as string));
```

Append at the end of the file:

```ts
// A couple of demo groups get casual seed messages so chats never look dead
// on stage. group_buys deletion cascades to group_messages, so re-running
// the seeder refreshes chats too. Requires migration 0004_group_chat.sql.
const SEED_CHAT: { name: string; body: string }[][] = [
  [
    { name: 'Айжан', body: 'Берём! Осталась пара мест 🔥' },
    { name: 'Дамир', body: 'Кто из Алматы — заберу на всех с ПВЗ' },
    { name: 'Алия', body: 'Цена огонь, в магазине вдвое дороже' },
  ],
  [
    { name: 'Тимур', body: 'Жду эту цену месяц 😍' },
    { name: 'Айжан', body: 'Зовите друзей, чуть-чуть до скидки!' },
  ],
];

async function seedChat(db: SupabaseClient, groupIds: string[]) {
  const rows = groupIds.slice(0, SEED_CHAT.length).flatMap((groupId, gi) =>
    SEED_CHAT[gi].map((msg, mi) => ({
      group_buy_id: groupId,
      user_id: null,
      display_name: msg.name,
      kind: 'text',
      body: msg.body,
      created_at: new Date(Date.now() - (SEED_CHAT[gi].length - mi) * 600_000).toISOString(),
    }))
  );
  if (rows.length === 0) return;
  const { error } = await db.from('group_messages').insert(rows);
  if (error) {
    throw new Error(
      `seeding chat failed: ${error.message} — did you run supabase/migrations/0004_group_chat.sql?`
    );
  }
  console.log(`Seeded ${rows.length} chat messages`);
}
```

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit` → clean.

```bash
git add scripts/sync-catalog/seedGroups.ts
git commit -m "feat: seed demo chat messages with group seeding"
```

---

### Task 5: Live verification (needs user)

- [ ] **Step 1 (user): Run the migration** — Supabase SQL Editor → `supabase/migrations/0004_group_chat.sql`.

- [ ] **Step 2: Re-seed groups with chat** — `npm run sync-catalog -- --seed-groups-only`
Expected: `Seeded 12 group buys`, `Seeded 5 chat messages`.

- [ ] **Step 3: Smoke matrix** (two phones, `npx expo start -c`):

1. Open the most popular group's chat → seeded RU messages visible.
2. Phone A and B in the same chat: sends appear live both ways; own bubbles right/orange, others left/white with author name.
3. Phone B joins the group → "👋 X присоединился(ась)" appears live in phone A's open chat.
4. Account that hasn't joined: messages readable, input replaced by the join hint.
5. Mock mode (no env): seeded mock messages render; local send works; mock join adds a system line.
6. Switch language to KK/EN → chat strings localized.
