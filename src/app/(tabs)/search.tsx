import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { CategoryChip } from '@/components/CategoryChip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorBanner } from '@/components/ErrorBanner';
import { ProductCard } from '@/components/ProductCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { askAssistant, type AssistantAnswer } from '@/lib/api';
import { CATEGORIES } from '@/lib/constants';
import { isExpired } from '@/lib/groupBuy';
import { currentLang, lt } from '@/lib/i18n';
import { colors, radius, shadow, spacing } from '@/lib/theme';
import type { Category, GroupBuy } from '@/lib/types';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function Search() {
  const { t } = useTranslation();
  const { products, groups, loadAllProducts } = useCatalogStore();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);

  // Topar AI mode
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<AssistantAnswer | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Searching/filtering must see the whole catalog, not just the pages the
  // feed has scrolled through — pull the rest once a filter becomes active.
  useEffect(() => {
    if (query.trim() || category || aiMode) loadAllProducts();
  }, [query, category, aiMode, loadAllProducts]);

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

  const aiPicks = useMemo(() => {
    if (!aiAnswer) return [];
    const byId = new Map(products.map((p) => [p.id, p]));
    return aiAnswer.product_ids.map((id) => byId.get(id)).filter((p) => p !== undefined);
  }, [aiAnswer, products]);

  const ask = async () => {
    const q = query.trim();
    if (!q || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    setAiAnswer(null);
    await loadAllProducts();
    const result = await askAssistant(q, currentLang());
    setAiLoading(false);
    if (result.error || !result.data) {
      setAiError(t('errors.aiUnavailable'));
      return;
    }
    setAiAnswer(result.data);
  };

  const toggleAi = () => {
    setAiMode((m) => !m);
    setAiAnswer(null);
    setAiError(null);
  };

  return (
    <ScreenContainer padded={false}>
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBox, aiMode && styles.searchBoxAi]}>
            <Ionicons
              name={aiMode ? 'sparkles' : 'search'}
              size={18}
              color={aiMode ? colors.esim : colors.textMuted}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={aiMode ? t('ai.placeholder') : t('search.placeholder')}
              placeholderTextColor={colors.textMuted}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              onSubmitEditing={aiMode ? ask : undefined}
              returnKeyType={aiMode ? 'send' : 'search'}
            />
            {aiMode && (
              <Pressable
                style={[styles.askBtn, (!query.trim() || aiLoading) && styles.askBtnDisabled]}
                onPress={ask}
                disabled={!query.trim() || aiLoading}
                accessibilityLabel={t('ai.ask')}>
                <Ionicons name="arrow-up" size={16} color="#fff" />
              </Pressable>
            )}
          </View>
          <Pressable
            style={[styles.aiToggle, aiMode && styles.aiToggleActive]}
            onPress={toggleAi}
            accessibilityLabel="Topar AI">
            <Ionicons name="sparkles" size={20} color={aiMode ? '#fff' : colors.esim} />
          </Pressable>
        </View>

        {!aiMode && (
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
        )}
      </View>

      {aiMode ? (
        <FlatList
          data={aiPicks}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.column}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.aiHeader}>
              {aiLoading && (
                <View style={styles.aiThinking}>
                  <ActivityIndicator size="small" color={colors.esim} />
                  <Text style={styles.aiThinkingText}>{t('ai.thinking')}</Text>
                </View>
              )}
              {aiError && <ErrorBanner message={aiError} />}
              {aiAnswer && (
                <View style={styles.aiBubble}>
                  <Ionicons name="sparkles" size={16} color={colors.esim} />
                  <Text style={styles.aiReply}>{aiAnswer.reply || t('ai.mockReply')}</Text>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <ProductCard product={item} group={groupsByProduct.get(item.id)} />
            </View>
          )}
          ListEmptyComponent={
            !aiLoading && !aiAnswer && !aiError ? (
              <EmptyState emoji="✨" text={t('ai.empty')} />
            ) : null
          }
        />
      ) : (
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
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchBox: {
    flex: 1,
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
  searchBoxAi: { borderColor: colors.esim },
  searchInput: { flex: 1, fontSize: 15, color: colors.text },
  askBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.esim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askBtnDisabled: { opacity: 0.45 },
  aiToggle: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.esimSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiToggleActive: { backgroundColor: colors.esim },
  chips: { gap: spacing.sm, paddingBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  column: { gap: spacing.md },
  cell: { flex: 1 / 2, marginBottom: spacing.md },
  aiHeader: { gap: spacing.md, paddingBottom: spacing.md },
  aiThinking: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  aiThinkingText: { fontSize: 14, color: colors.textSecondary, fontStyle: 'italic' },
  aiBubble: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'flex-start',
    ...shadow.card,
  },
  aiReply: { flex: 1, fontSize: 14.5, color: colors.text, lineHeight: 21 },
});
