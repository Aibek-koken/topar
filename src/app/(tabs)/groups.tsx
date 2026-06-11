import { useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/components/EmptyState';
import { GroupBuyCard } from '@/components/GroupBuyCard';
import { ScreenContainer } from '@/components/ScreenContainer';
import { isExpired } from '@/lib/groupBuy';
import { colors, spacing } from '@/lib/theme';
import { useCatalogStore } from '@/store/useCatalogStore';

export default function Groups() {
  const { t } = useTranslation();
  const { groups, joinedIds, loading, load } = useCatalogStore();

  // Active groups by nearest deadline first, expired ones at the bottom
  const sorted = useMemo(
    () =>
      [...groups].sort((a, b) => {
        const aExp = isExpired(a) ? 1 : 0;
        const bExp = isExpired(b) ? 1 : 0;
        if (aExp !== bExp) return aExp - bExp;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }),
    [groups]
  );

  return (
    <ScreenContainer padded={false}>
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListHeaderComponent={<Text style={styles.title}>{t('tabs.groups')}</Text>}
        renderItem={({ item }) => <GroupBuyCard group={item} joined={joinedIds.has(item.id)} />}
        ItemSeparatorComponent={() => <Text style={styles.sep} />}
        ListEmptyComponent={!loading ? <EmptyState emoji="👥" text={t('profile.noGroups')} /> : null}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, paddingVertical: spacing.md },
  sep: { height: spacing.md },
});
