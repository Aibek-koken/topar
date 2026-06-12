import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CategoryChip } from '@/components/CategoryChip';
import { EmptyState } from '@/components/EmptyState';
import { ProductCard } from '@/components/ProductCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { CATEGORIES } from '@/lib/constants';
import { isExpired } from '@/lib/groupBuy';
import { lt } from '@/lib/i18n';
import { colors, radius, spacing } from '@/lib/theme';
import type { Category, GroupBuy } from '@/lib/types';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function Search() {
  const { t } = useTranslation();
  const { products, groups, loadAllProducts } = useCatalogStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);

  // Searching/filtering must see the whole catalog, not just the pages the
  // feed has scrolled through — pull the rest once a filter becomes active.
  useEffect(() => {
    if (query.trim() || category) loadAllProducts();
  }, [query, category, loadAllProducts]);

  const groupsByProduct = useMemo(() => {
    const map = new Map<string, GroupBuy>();
    for (const g of groups) if (!isExpired(g)) map.set(g.product_id, g);
    return map;
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return lt(p.title).toLowerCase().includes(q) || p.slug.includes(q);
    });
  }, [products, query, category]);

  return (
    <ScreenContainer padded={false}>
      <View style={styles.searchWrap}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          <CategoryChip
            label={t('search.all')}
            selected={category === null}
            onPress={() => setCategory(null)}
          />
          {CATEGORIES.map(({ key, emoji }) => (
            <CategoryChip
              key={key}
              emoji={emoji}
              label={t(`categories.${key}`)}
              selected={category === key}
              onPress={() => setCategory(category === key ? null : key)}
            />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <ProductCard product={item} group={groupsByProduct.get(item.id)} />
          </View>
        )}
        ListEmptyComponent={<EmptyState emoji="🔍" text={t('search.noResults')} />}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  chips: { gap: spacing.sm, paddingBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  column: { gap: spacing.md },
  cell: { flex: 1 / 2, marginBottom: spacing.md },
});
