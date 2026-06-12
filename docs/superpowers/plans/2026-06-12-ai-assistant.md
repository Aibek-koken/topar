# AI Shopping Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Natural-language shopping assistant in the Search tab, backed by a Supabase Edge Function calling OpenAI `gpt-4o-mini` with the real catalog in-prompt and strict JSON output.

**Architecture:** Edge Function `assistant` (Deno) = auth gateway + catalog digest + OpenAI call + id validation. App adds `askAssistant` to the api layer (mock fallback included) and an AI mode to the Search tab rendering the reply + real ProductCards.

**Tech Stack:** Supabase Edge Functions (Deno), OpenAI Chat Completions (strict json_schema), Expo/React Native, i18next.

**Spec:** `docs/superpowers/specs/2026-06-12-ai-assistant-design.md`

**Gate per task:** `npx tsc --noEmit` clean (Edge Function excluded from app tsconfig — verified by tsc ignoring `supabase/functions`).

---

### Task 1: Edge Function

**Files:** Create `supabase/functions/assistant/index.ts`

Deno function: CORS preflight; validate `{query, locale}`; service-role read of products + active groups; compute current discount per product from tiers/participants; digest lines `id | title | category | ₸price | −N% | ★rating`; OpenAI call with strict schema `{reply, product_ids}`; filter ids to real catalog; slice 6; JSON responses with CORS headers. (Full code written during execution — single self-contained file.)

Verify: file exists; not picked up by app tsc. Commit `feat: add assistant edge function`.

### Task 2: api layer

**Files:** Modify `src/lib/api.ts`

```ts
export interface AssistantAnswer { reply: string; product_ids: string[] }

export async function askAssistant(query: string, locale: string): Promise<{ data?: AssistantAnswer; error?: string }> {
  if (!isSupabaseConfigured) {
    const ids = [...MOCK_PRODUCTS].sort((a, b) => b.orders_count - a.orders_count).slice(0, 4).map((p) => p.id);
    return { data: { reply: '', product_ids: ids } }; // UI substitutes localized canned line
  }
  const { data, error } = await supabase.functions.invoke('assistant', { body: { query, locale } });
  if (error) return { error: error.message };
  if (data?.error) return { error: String(data.error) };
  return { data: data as AssistantAnswer };
}
```

Verify: tsc clean. Commit `feat: add askAssistant api`.

### Task 3: Search tab AI mode + locales

**Files:** Modify `src/app/(tabs)/search.tsx`, `src/locales/{ru,kk,en}.json`

- Sparkle toggle (`Ionicons name="sparkles"`) beside the search box switches `aiMode`.
- AI mode: input placeholder `ai.placeholder`, send button; submit → `loadAllProducts()` + `askAssistant(query, currentLang())`; loading row `ai.thinking`; result = reply bubble (or `ai.mockReply` when reply empty) + 2-col grid of ProductCards resolved from store products by id; errors via `ErrorBanner` + `errors.aiUnavailable`.
- Locale keys (`ai.*`: placeholder, send-label, thinking, mockReply, empty; `errors.aiUnavailable`) in RU/KK/EN.

Verify: tsc + JSON parse. Commit `feat: AI assistant mode in search tab`.

### Task 4: Deploy (user-assisted)

1. User: `npx supabase login` (one-time browser auth).
2. `npx supabase secrets set OPENAI_API_KEY=<key> --project-ref hpmblsyrurpxcggwjxnv`
3. `npx supabase functions deploy assistant --project-ref hpmblsyrurpxcggwjxnv`

### Task 5: Live verification

curl the function with a user JWT (or smoke via app): RU query returns reply + valid ids; KK/EN localized; invalid key path returns `ai_unavailable`; app renders cards; mock mode canned path.
