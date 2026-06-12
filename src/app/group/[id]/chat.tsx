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
