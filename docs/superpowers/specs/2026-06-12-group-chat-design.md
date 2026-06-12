# Group Chat — Design

**Date:** 2026-06-12
**Status:** Approved
**Project:** Topar (hackathon MVP — group buying app)

## Goal

A real-time chat inside each group buy, so participants coordinate and hype each
other — and a second live cross-device demo moment on top of the existing
Supabase Realtime wiring.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Placement | Separate full-screen chat at `/group/[id]/chat`, opened from a button on the group screen |
| Access | Read for everyone (social proof for lurkers), write only for joined participants — enforced by RLS |
| Content | User text messages + automatic `join` system events + seeded demo messages so chats never look dead on stage |
| System events | Produced by a Postgres trigger on `group_participants` (server-authoritative, same pattern as the `participants_count` trigger), not by clients |
| i18n of system events | DB stores only `kind: 'join'` + `display_name`; clients render the localized line — no language baked into the database |
| State management | Local state in the chat screen (fetch + Realtime subscription); no global store — only this screen displays messages |
| Mock mode | Preseeded local messages per demo group in `MockDb`, local-only sends, join event emitted by the existing mock `join()` |

## Architecture

### Schema (migration `supabase/migrations/0004_group_chat.sql`)

```sql
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_buy_id uuid not null references public.group_buys(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,  -- null for system rows
  display_name text not null default '',
  kind text not null default 'text' check (kind in ('text','join')),
  body text,                                                        -- null for 'join'
  created_at timestamptz not null default now()
);
```

- RLS: `select` for all; `insert` only when `auth.uid() = user_id` **and** a
  matching `group_participants` row exists.
- `security definer` trigger on `group_participants` INSERT writes the `join`
  row, reading `display_name` from `profiles`.
- Table added to the `supabase_realtime` publication.
- `display_name` is denormalized at write time: no join queries, Realtime
  payloads are self-contained.

### Components

| Unit | Kind | Responsibility |
|---|---|---|
| `src/app/group/[id]/index.tsx` | move | Current `group/[id].tsx` unchanged, plus a chat button (header) pushing `/group/{id}/chat` |
| `src/app/group/[id]/chat.tsx` | new | Inverted FlatList of bubbles; own messages right/primary, others left/card, `join` rows centered muted. Input bar with KeyboardAvoidingView; non-joined users see a "join the group to chat" hint instead of the input. Subscribes to `postgres_changes` INSERT on `group_messages` filtered by `group_buy_id`; local state only |
| `src/lib/api.ts` | extend | `fetchMessages(groupId)`, `sendMessage(groupId, userId, displayName, body)`; mock equivalents in `MockDb` (preseeded messages, local send, join event from mock `join()`) |
| `src/lib/types.ts` | extend | `GroupMessage` interface (`id`, `group_buy_id`, `user_id`, `display_name`, `kind: 'text' \| 'join'`, `body`, `created_at`) |
| `scripts/sync-catalog/seedGroups.ts` | extend | Insert 3–5 casual RU seed messages into demo groups; refreshed on re-run |
| `src/locales/{ru,kk,en}.json` | extend | `chat.*`: title, input placeholder, joined system line, join-to-chat hint, empty state |

## Error handling

- Send failure → existing `ErrorBanner` with the localized `authErrors`-style mapping (generic fallback).
- No optimistic append/rollback (YAGNI): the message renders when Realtime echoes it back.
- Subscription teardown on screen unmount (channel per group).

## Testing (manual matrix)

1. Two phones in one chat: messages appear live in both directions.
2. Join from phone B → `join` system line appears live on phone A's open chat.
3. Non-joined account: can read, sees the join hint instead of the input.
4. Mock mode: seeded messages render, local send works, mock join adds a system line.
5. RU/KK/EN strings render, including the localized join line.

## Out of scope

- Images, reactions, typing indicators, read receipts.
- Moderation/reporting, message editing or deletion.
- Push notifications for new messages (separate feature).
- Pagination of chat history (groups are short-lived; full fetch is fine at demo scale).
