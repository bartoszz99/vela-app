import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  useWindowDimensions, ActivityIndicator, Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import {
  calculateCompatibility,
  mapToCompatibilityProfile,
  CompatibilityResult,
} from '@/lib/compatibility';
import { useLang } from '@/contexts/LanguageContext';
import { PhotoAvatar } from '@/components/PhotoAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchCandidate {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  photos: string[];
  personalityType: string | null;
  compatibility: CompatibilityResult;
}

type FetchStatus = 'loading' | 'ok' | 'empty-db' | 'no-match';

// ─── Component ────────────────────────────────────────────────────────────────

export default function Matches() {
  const isDesktop = useIsDesktop();
  const { width } = useWindowDimensions();
  const { profile: myProfile, loading: profileLoading } = useProfile();
  const { t } = useLang();

  const [candidates, setCandidates] = useState<MatchCandidate[]>([]);
  const [status, setStatus] = useState<FetchStatus>('loading');

  const numColumns = width >= 1100 ? 4 : width >= 768 ? 3 : 2;
  const maxWidth = 1200;
  const horizontalPad = isDesktop ? 32 : 12;

  const greeting = myProfile?.name
    ? t('matches.greetingNamed', { name: myProfile.name })
    : t('matches.greeting');

  // ── Fetch & compute ──────────────────────────────────────────────────
  useEffect(() => {
    if (profileLoading) return;
    if (!myProfile?.trait_scores) { setStatus('ok'); return; }

    (async () => {
      setStatus('loading');
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // All completed profiles except current user
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, name, age, city, bio, photos, personality_type, trait_scores')
          .neq('id', user.id)
          .eq('onboarding_done', true);

        console.log('[Matches] profiles query error:', profilesError);
        console.log('[Matches] profiles pobrane z bazy:', profiles?.length ?? 0);
        console.log('[Matches] profiles raw:', JSON.stringify(profiles, null, 2));

        if (!profiles || profiles.length === 0) {
          setStatus('empty-db');
          return;
        }

        // Fetch psychology answers for all relevant users in one query
        const userIds = [user.id, ...profiles.map((p) => p.id)];
        const { data: allAnswers, error: answersError } = await supabase
          .from('psychology_answers')
          .select('user_id, question_id, answer')
          .in('user_id', userIds);

        console.log('[Matches] psychology_answers error:', answersError);
        console.log('[Matches] psychology_answers pobrane:', allAnswers?.length ?? 0);

        // Build map: userId → { questionId → answerLetter }
        const answersMap: Record<string, Record<number, string>> = {};
        for (const row of allAnswers ?? []) {
          if (!answersMap[row.user_id]) answersMap[row.user_id] = {};
          answersMap[row.user_id][row.question_id] = row.answer;
        }

        console.log('[Matches] mój trait_scores:', JSON.stringify(myProfile.trait_scores, null, 2));
        console.log('[Matches] moje odpowiedzi (pytania):', Object.keys(answersMap[user.id] ?? {}).join(', ') || 'brak');
        console.log('[Matches] min_compatibility z profilu:', myProfile.min_compatibility);

        const myCompatProfile = mapToCompatibilityProfile(
          myProfile.trait_scores!,
          answersMap[user.id] ?? {},
        );
        const minCompat = myProfile.min_compatibility ?? 0;

        console.log('[Matches] myCompatProfile:', JSON.stringify(myCompatProfile, null, 2));

        const results: MatchCandidate[] = [];

        for (const p of profiles) {
          console.log(`[Matches] → kandydat ${p.name} (${p.id}): trait_scores =`, p.trait_scores ? 'present' : 'NULL');

          if (!p.trait_scores) {
            console.log(`[Matches]   SKIP – brak trait_scores`);
            continue;
          }

          const theirCompatProfile = mapToCompatibilityProfile(
            p.trait_scores as Record<string, unknown>,
            answersMap[p.id] ?? {},
          );

          const compat = calculateCompatibility(myCompatProfile, theirCompatProfile);

          console.log(`[Matches]   wynik kompatybilności: ${compat.total}% (minCompat=${minCompat}) → ${compat.total >= minCompat ? 'PASS' : 'ODRZUCONY'}`);
          console.log(`[Matches]   breakdown:`, JSON.stringify(compat.breakdown));

          if (compat.total >= minCompat) {
            results.push({
              id: p.id,
              name: p.name,
              age: p.age,
              city: p.city,
              bio: p.bio,
              photos: (p.photos as string[]) ?? [],
              personalityType: p.personality_type,
              compatibility: compat,
            });
          }
        }

        results.sort((a, b) => b.compatibility.total - a.compatibility.total);

        console.log('[Matches] wyniki po filtrze:', results.length, 'kandydatów');

        if (results.length === 0) {
          setStatus('no-match');
        } else {
          setCandidates(results);
          setStatus('ok');
        }
      } catch (e) {
        console.error('Matches fetch error:', e);
        setStatus('ok');
      }
    })();
  }, [myProfile?.id, profileLoading]);

  // ── Empty / loading states ───────────────────────────────────────────
  const renderEmpty = () => {
    if (status === 'loading') {
      return (
        <View style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.emptyTitle}>{t('matches.loadingTitle')}</Text>
        </View>
      );
    }
    if (status === 'empty-db') {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>{t('matches.emptyDbEmoji')}</Text>
          <Text style={styles.emptyTitle}>{t('matches.emptyDbTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('matches.emptyDbSub')}</Text>
        </View>
      );
    }
    if (status === 'no-match') {
      return (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>{t('matches.noMatchEmoji')}</Text>
          <Text style={styles.emptyTitle}>{t('matches.noMatchTitle')}</Text>
          <Text style={styles.emptySubtitle}>{t('matches.noMatchSub')}</Text>
        </View>
      );
    }
    return null;
  };

  // ── Card render ──────────────────────────────────────────────────────
  const renderCard = ({ item }: { item: MatchCandidate }) => {
    const photoUri = item.photos?.[0] ?? null;
    const matchColor =
      item.compatibility.total >= 85 ? COLORS.success :
      item.compatibility.total >= 65 ? COLORS.primary : '#F59E0B';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/profile/${item.id}`)}
      >
        <View style={[styles.photoWrap, isDesktop && styles.photoWrapDesktop]}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photo} />
          ) : (
            <PhotoAvatar uri={null} name={item.name} size={72} />
          )}
          <View style={[styles.matchPill, { backgroundColor: matchColor }]}>
            <Text style={styles.matchPillText}>{item.compatibility.total}% {t('matches.compatLabel')}</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}{item.age ? `, ${item.age}` : ''}
          </Text>
          {item.city && (
            <Text style={styles.cardCity} numberOfLines={1}>📍 {item.city}</Text>
          )}
          {item.bio && (
            <Text style={styles.cardBio} numberOfLines={2}>{item.bio}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const showList = status === 'ok' && candidates.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.inner, isDesktop && { maxWidth, alignSelf: 'center', width: '100%' }]}>
        <View style={[styles.header, { paddingHorizontal: horizontalPad }]}>
          {!isDesktop && <Text style={styles.logo}>Vela</Text>}
          {isDesktop && <Text style={styles.pageTitle}>Odkryj</Text>}
          <TouchableOpacity style={styles.filterBtn} onPress={() => router.push('/settings')}>
            <Text style={styles.filterIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={showList ? candidates : []}
          keyExtractor={(item) => item.id}
          key={numColumns}
          numColumns={numColumns}
          contentContainerStyle={[styles.grid, { paddingHorizontal: horizontalPad }]}
          columnWrapperStyle={showList ? styles.row : undefined}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.banner}>
              <Text style={styles.bannerText}>{greeting}</Text>
            </View>
          }
          ListEmptyComponent={renderEmpty()}
          renderItem={renderCard}
        />
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  logo: { fontSize: 28, fontWeight: '700', color: COLORS.primary },
  pageTitle: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  filterBtn: { padding: 4 },
  filterIcon: { fontSize: 22 },

  banner: {
    backgroundColor: COLORS.primaryLight,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
  },
  bannerText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },

  grid: { paddingBottom: 24 },
  row: { gap: 12, marginBottom: 12 },

  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  photoWrap: {
    height: 220,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoWrapDesktop: { height: 250 },
  photo: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoEmoji: { fontSize: 56 },
  photoEmojiDesktop: { fontSize: 64 },

  matchPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  matchPillText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  cardInfo: { padding: 12, gap: 3 },
  cardName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  cardCity: { fontSize: 11, color: COLORS.textSecondary },
  cardBio: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginTop: 2 },

  emptyWrap: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },
});
