// Topar AI shopping assistant. Deploy:
//   npx supabase secrets set OPENAI_API_KEY=sk-... --project-ref <ref>
//   npx supabase functions deploy assistant --project-ref <ref>
// JWT verification is on by default at the gateway — anonymous calls are blocked.
import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const USD_TO_KZT = 512; // matches src/lib/currency.ts

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface Tier {
  min_qty: number;
  discount_pct: number;
}

function currentDiscount(tiers: Tier[], participants: number): number {
  let pct = 0;
  for (const t of [...tiers].sort((a, b) => a.min_qty - b.min_qty)) {
    if (participants >= t.min_qty) pct = t.discount_pct;
  }
  return pct;
}

const LOCALE_NAMES: Record<string, string> = {
  ru: 'русском',
  kk: 'казахском',
  en: 'английском',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const { query, locale } = await req.json().catch(() => ({}));
    if (typeof query !== 'string' || !query.trim() || query.length > 300) {
      return json({ error: 'bad_request' }, 400);
    }
    const lang = ['ru', 'kk', 'en'].includes(locale) ? locale : 'ru';

    const db = createClient(SUPABASE_URL, SERVICE_KEY);
    const [productsRes, groupsRes] = await Promise.all([
      db
        .from('products')
        .select('id, title, category, price_usd, rating, orders_count')
        .order('orders_count', { ascending: false })
        .limit(120),
      db
        .from('group_buys')
        .select('product_id, participants_count, tiers, status')
        .eq('status', 'active'),
    ]);
    if (productsRes.error) return json({ error: 'db_error' }, 500);
    const products = productsRes.data ?? [];

    const discountByProduct = new Map<string, number>();
    for (const g of groupsRes.data ?? []) {
      discountByProduct.set(
        g.product_id as string,
        currentDiscount((g.tiers ?? []) as Tier[], g.participants_count as number)
      );
    }

    const digest = products
      .map((p) => {
        const title = (p.title?.ru || p.title?.en || '').slice(0, 80);
        const kzt = Math.round(Number(p.price_usd) * USD_TO_KZT);
        const disc = discountByProduct.get(p.id as string);
        const groupNote = disc ? ` | группа −${disc}%` : '';
        return `${p.id} | ${title} | ${p.category} | ${kzt} ₸${groupNote} | ★${p.rating}`;
      })
      .join('\n');

    const system = [
      'Ты — Topar AI, шопинг-ассистент маркетплейса групповых покупок Topar (Казахстан, цены в тенге).',
      `Отвечай кратко (2–3 предложения) на ${LOCALE_NAMES[lang]} языке.`,
      'Выбери подходящие товары СТРОГО из каталога ниже (используй их id без изменений).',
      'ВАЖНО: включай товар ТОЛЬКО если он явно отвечает запросу. Лучше вернуть 2–3 точных товара, чем добивать список слабо связанными. Никогда не добавляй товары из несвязанных категорий (например, обувь на запрос о косметике). Максимум 6.',
      'Учитывай бюджет, получателя и категорию из запроса. Если есть группа со скидкой — упомяни это: вместе дешевле.',
      'Если ничего не подходит, верни пустой список product_ids и предложи уточнить запрос.',
      '',
      'КАТАЛОГ (id | название | категория | цена | скидка группы | рейтинг):',
      digest,
    ].join('\n');

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2, // default 1.0 caused run-to-run irrelevant picks
        max_tokens: 500,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: query.trim() },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'shopping_picks',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                reply: { type: 'string' },
                product_ids: { type: 'array', items: { type: 'string' } },
              },
              required: ['reply', 'product_ids'],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!aiRes.ok) {
      console.error('openai error', aiRes.status, await aiRes.text());
      return json({ error: 'ai_unavailable' }, 502);
    }
    const aiData = await aiRes.json();
    const content = aiData?.choices?.[0]?.message?.content;
    if (!content) return json({ error: 'ai_unavailable' }, 502);

    const parsed = JSON.parse(content) as { reply: string; product_ids: string[] };
    const validIds = new Set(products.map((p) => p.id as string));
    const product_ids = (parsed.product_ids ?? [])
      .filter((id) => validIds.has(id))
      .slice(0, 6);

    return json({ reply: parsed.reply ?? '', product_ids });
  } catch (e) {
    console.error('assistant error', e);
    return json({ error: 'internal' }, 500);
  }
});
