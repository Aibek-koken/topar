import { useMemo, useRef } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { GroupBuyCard } from '@/components/GroupBuyCard';
import { ProductCard } from '@/components/ProductCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { isExpired, progress } from '@/lib/groupBuy';
import { rankFeed } from '@/lib/recommendations';
import { colors, spacing } from '@/lib/theme';
import type { GroupBuy } from '@/lib/types';
import { useAuthStore } from '@/store/useAuthStore';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function Home() {
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);
  const { products, groups, joinedIds, loading, load } = useCatalogStore();

  const groupsByProduct = useMemo(() => {
    const map = new Map<string, GroupBuy>();
    for (const g of groups) {
      if (!isExpired(g)) map.set(g.product_id, g);
    }
    return map;
  }, [groups]);

  // Rank only when products/profile change — realtime ticks must not reshuffle
  // the feed mid-scroll, so the latest groups are read through a ref
  const groupsRef = useRef(groupsByProduct);
  groupsRef.current = groupsByProduct;
  const ranked = useMemo(
    () => rankFeed(products, profile, groupsRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, profile?.interests, profile?.budget_tier]
  );

  const hotGroups = useMemo(
    () =>
      groups
        .filter((g) => !isExpired(g))
        .sort(
          (a, b) =>
            progress(b.participants_count, b.target_qty) - progress(a.participants_count, a.target_qty)
        )
        .slice(0, 3),
    [groups]
  );

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={ranked}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.greeting}>{t('home.greeting', { name: profile?.display_name ?? '' })}</Text>
            <Text style={styles.city}>📍 {t('home.deliveryTo', { city: profile?.city ?? 'Алматы' })}</Text>

            {hotGroups.length > 0 && (
              <>
                <Text style={styles.section}>{t('home.hotGroups')}</Text>
                <FlatList
                  horizontal
                  data={hotGroups}
                  keyExtractor={(item) => item.id}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hotRail}
                  renderItem={({ item }) => (
                    <View style={styles.hotCard}>
                      <GroupBuyCard group={item} joined={joinedIds.has(item.id)} />
                    </View>
                  )}
                />
              </>
            )}

            <Text style={styles.section}>{t('home.forYou')}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard product={item} group={groupsByProduct.get(item.id)} />
          </View>
        )}
        ListEmptyComponent={!loading ? <EmptyState emoji="🛍️" text={t('search.noResults')} /> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  header: { paddingTop: spacing.md, gap: spacing.xs },
  greeting: { fontSize: 24, fontWeight: '800', color: colors.text },
  city: { fontSize: 13.5, color: colors.textSecondary },
  section: { fontSize: 18, fontWeight: '800', color: colors.text, paddingTop: spacing.lg, paddingBottom: spacing.md },
  hotRail: { gap: spacing.md, paddingRight: spacing.lg },
  hotCard: { width: 320 },
  column: { gap: spacing.md },
  cell: { flex: 1 / 2, marginBottom: spacing.md },
});
