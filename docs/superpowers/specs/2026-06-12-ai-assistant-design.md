# AI Shopping Assistant («Topar AI») — Design

**Date:** 2026-06-12
**Status:** Approved (user: "okay do it")
**Project:** Topar (hackathon MVP — group buying app)

## Goal

A jury-wow feature: natural-language shopping assistant in the Search tab —
«подарок маме до 10 000 ₸» → localized AI reply + real product cards (with live
group discounts and join buttons) picked from the real synced catalog.

## Decisions made during brainstorming

| Question | Decision |
|---|---|
| Direction | AI shopping assistant (over mission-control dashboard / chat bot / flash groups) |
| LLM provider | OpenAI `gpt-4o-mini` (user's choice; ~$0.001–0.002 per question with the catalog digest in prompt) |
| Key custody | `OPENAI_API_KEY` in Supabase Edge Function secrets — never in the app bundle |
| Grounding | Catalog-in-prompt: ~100 products + active group discounts rendered as a digest in the system prompt; strict JSON-schema output `{ reply, product_ids }` restricted to real ids (Approach A over direct-from-app B [key leak] and function-calling agent C [slow, YAGNI]) |
| Placement | Search tab AI mode (sparkle toggle), reusing existing ProductCard components |
| Memory | None — single-shot Q→A (YAGNI; stateless and cheap) |
| Mock mode | Canned localized reply + top popular products from local data; demo never dies offline |

## Architecture

`supabase/functions/assistant/index.ts` (Deno Edge Function):
1. CORS + JWT-verified (Supabase gateway default) — anonymous calls blocked.
2. Validates body `{ query: string ≤300 chars, locale: 'ru'|'kk'|'en' }`.
3. Service-role reads: top ~120 products (id, title, category, price) + active
   `group_buys` (participants, tiers) → computes each product's current group
   discount → renders one digest line per product (id | RU title | category |
   price ₸ at the app's fixed 512 ₸/USD | −N% group | ★rating).
4. Calls OpenAI `chat/completions`, model `gpt-4o-mini`,
   `response_format: json_schema (strict)` → `{ reply: string, product_ids: string[] }`.
   System prompt: Topar AI persona, answer in `locale`, pick max 6 products
   only from the digest, respect stated budget/recipient/category.
5. Filters returned ids against real catalog ids, slices to 6, returns JSON.

App side ([api.ts](../../src/lib/api.ts)): `askAssistant(query, locale)` →
`supabase.functions.invoke('assistant')`; mock mode returns top-popular mock
products with an empty reply (UI substitutes a localized canned line).

Search tab: sparkle toggle switches the search box into AI mode → send →
loading shimmer → assistant reply bubble + `ProductCard` grid resolved from
`product_ids` via the catalog store (`loadAllProducts()` ensures full catalog).
Errors render through the existing `ErrorBanner` + `errors.*` mapping.

## Error handling

- OpenAI non-200/timeout → function returns `{ error: 'ai_unavailable' }`, 502 → app shows localized "AI временно недоступен".
- Stale/hallucinated ids dropped server-side (filter against catalog).
- Strict schema: `additionalProperties: false`, both fields required; `maxItems`
  unsupported in strict mode → enforced by prompt + server-side slice.

## Testing (manual)

1. «подарок маме до 10 000 ₸» → relevant picks under budget, RU reply.
2. KK/EN locale → localized reply.
3. Mock mode → canned line + popular products.
4. Function unreachable / key invalid → localized error banner, app alive.

## Out of scope

Conversation memory/threading, streaming tokens, rate limiting beyond Supabase
defaults, assistant anywhere besides the Search tab.
