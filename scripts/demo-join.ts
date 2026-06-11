import 'dotenv/config';
import { createAdminClient } from './sync-catalog/db';

/**
 * Stage trigger for the live demo: bumps a group's participants_count so the
 * realtime counter ticks on every connected phone (9/10 → 10/10 → confetti).
 *
 * It updates the denormalized counter directly — clients subscribe to UPDATE
 * events on group_buys, so this is exactly the event a real join produces,
 * without needing an auth.users row for a ghost participant.
 *
 * Usage:
 *   npx tsx scripts/demo-join.ts                  # bumps the most complete active group
 *   npx tsx scripts/demo-join.ts <group_buy_id>   # bumps a specific group
 */
async function main() {
  const db = createAdminClient();
  let groupId = process.argv[2];

  if (!groupId) {
    const { data, error } = await db
      .from('group_buys')
      .select('id, participants_count')
      .eq('status', 'active')
      .order('participants_count', { ascending: false })
      .limit(1);
    if (error) throw error;
    if (!data?.length) throw new Error('No active groups found');
    groupId = data[0].id;
    console.log(`Picked hottest group ${groupId} (${data[0].participants_count} participants)`);
  }

  const { data: current, error: readError } = await db
    .from('group_buys')
    .select('participants_count')
    .eq('id', groupId)
    .single();
  if (readError) throw readError;

  const next = (current?.participants_count ?? 0) + 1;
  const { error } = await db
    .from('group_buys')
    .update({ participants_count: next })
    .eq('id', groupId);
  if (error) throw error;

  console.log(`✅ Group is now at ${next} participants — watch the phones.`);
}

main().catch((e) => {
  console.error('❌', e.message ?? e);
  process.exit(1);
});
