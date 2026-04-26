import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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

interface OtherProfile {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  bio: string | null;
  photos: string[];
  personality_type: string | null;
  trait_scores: Record<string, unknown> | null;
}

// ─── Breakdown bar ────────────────────────────────────────────────────────────

const BREAKDOWN_LABELS: {
  key: 'wartości' | 'przywiązanie' | 'osobowość' | 'potrzeby' | 'wizja';
  emoji: string;
}[] = [
  { key: 'wartości',     emoji: '🧭' },
  { key: 'przywiązanie', emoji: '🤝' },
  { key: 'osobowość',    emoji: '🧠' },
  { key: 'potrzeby',     emoji: '💞' },
  { key: 'wizja',        emoji: '🌟' },
];

function barColor(v: number) {
  return v >= 85 ? COLORS.success : v >= 65 ? COLORS.primary : '#F59E0B';
}

function BreakdownBar({ label, emoji, value }: { label: string; emoji: string; value: number }) {
  const color = barColor(value);
  return (
    <View style={bar.row}>
      <View style={bar.labelRow}>
        <Text style={bar.emoji}>{emoji}</Text>
        <Text style={bar.label}>{label}</Text>
        <Text style={[bar.value, { color }]}>{value}%</Text>
      </View>
      <View style={bar.track}>
        <View style={[bar.fill, { width: `${value}%` as any, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function PersonProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isDesktop = useIsDesktop();
  const { t } = useLang();

  const { profile: myProfile, loading: myLoading } = useProfile();
  const [other, setOther]   = useState<OtherProfile | null>(null);
  const [compat, setCompat] = useState<CompatibilityResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || myLoading) return;

    (async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Fetch other person's profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, name, age, city, bio, photos, personality_type, trait_scores')
          .eq('id', id)
          .single();

        if (!profile) { setLoading(false); return; }

        setOther({
          ...profile,
          photos: (profile.photos as string[]) ?? [],
          trait_scores: profile.trait_scores as Record<string, unknown> | null,
        });

        // Calculate compatibility if both have trait_scores
        if (myProfile?.trait_scores && profile.trait_scores) {
          const { data: allAnswers } = await supabase
            .from('psychology_answers')
            .select('user_id, question_id, answer')
            .in('user_id', [user.id, id]);

          const answersMap: Record<string, Record<number, string>> = {};
          for (const row of allAnswers ?? []) {
            if (!answersMap[row.user_id]) answersMap[row.user_id] = {};
            answersMap[row.user_id][row.question_id] = row.answer;
          }

          const myCompatProfile = mapToCompatibilityProfile(
            myProfile.trait_scores as Record<string, unknown>,
            answersMap[user.id] ?? {},
          );
          const theirCompatProfile = mapToCompatibilityProfile(
            profile.trait_scores as Record<string, unknown>,
            answersMap[id] ?? {},
          );

          setCompat(calculateCompatibility(myCompatProfile, theirCompatProfile));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, myLoading, myProfile?.id]);

  if (loading || myLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!other) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{t('profileView.notFound')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const photoUri    = other.photos?.[0] ?? null;
  const totalColor  = compat ? barColor(compat.total) : COLORS.primary;

  const avatarNode = <PhotoAvatar uri={photoUri} name={other.name} size={120} />;

  const handleChat = () => router.push(`/chat/${other.id}`);

  if (isDesktop) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.desktopRoot}>
          {/* ── Left column ── */}
          <View style={styles.leftCol}>
            <View style={styles.leftInner}>
              <View style={styles.avatarLarge}>{avatarNode}</View>

              <Text style={styles.name}>
                {other.name}{other.age ? `, ${other.age}` : ''}
              </Text>
              {other.city && <Text style={styles.location}>📍 {other.city}</Text>}

              {compat && (
                <View style={[styles.totalBadge, { backgroundColor: totalColor }]}>
                  <Text style={styles.totalPercent}>{compat.total}%</Text>
                  <Text style={styles.totalLabel}>{t('profileView.compatLabel')}</Text>
                </View>
              )}

              {other.personality_type && (
                <View style={styles.personalityRow}>
                  <Text style={styles.personalityType}>{other.personality_type}</Text>
                </View>
              )}

              {other.bio && (
                <View style={styles.bioSection}>
                  <Text style={styles.sectionTitle}>{t('profileView.bioTitle')}</Text>
                  <Text style={styles.bio}>{other.bio}</Text>
                </View>
              )}
            </View>
          </View>

          {/* ── Right column ── */}
          <View style={styles.rightCol}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.rightScroll}>
              {compat && (
                <>
                  <Text style={styles.sectionTitle}>{t('profileView.analysisTitle')}</Text>
                  <View style={styles.card}>
                    {BREAKDOWN_LABELS.map(({ key, emoji }) => (
                      <BreakdownBar
                        key={key}
                        label={t(`profileView.breakdown.${key}.label`)}
                        emoji={emoji}
                        value={compat.breakdown[key]}
                      />
                    ))}
                  </View>

                  {compat.insights.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>{t('profileView.observationsTitle')}</Text>
                      <View style={[styles.card, styles.insightsCard]}>
                        {compat.insights.map((insight, i) => (
                          <View key={i} style={styles.insightRow}>
                            <View style={styles.insightDot} />
                            <Text style={styles.insightText}>{t(insight)}</Text>
                          </View>
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}

              {!compat && (
                <View style={styles.noCompatCard}>
                  <Text style={styles.noCompatText}>{t('profileView.noCompatText')}</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.stickyActions}>
              <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
                <Text style={styles.chatButtonText}>{t('profileView.messageBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Mobile layout ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Wróć</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.avatar}>{avatarNode}</View>
          <Text style={styles.name}>
            {other.name}{other.age ? `, ${other.age}` : ''}
          </Text>
          {other.city && <Text style={styles.location}>📍 {other.city}</Text>}
          {compat && (
            <View style={[styles.totalBadge, { backgroundColor: totalColor }]}>
              <Text style={styles.totalPercent}>{compat.total}%</Text>
              <Text style={styles.totalLabel}>{t('profileView.compatLabel')}</Text>
            </View>
          )}
        </View>

        {compat && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('profileView.analysisTitle')}</Text>
              <View style={styles.card}>
                {BREAKDOWN_LABELS.map(({ key, emoji }) => (
                  <BreakdownBar
                    key={key}
                    label={t(`profileView.breakdown.${key}.label`)}
                    emoji={emoji}
                    value={compat.breakdown[key]}
                  />
                ))}
              </View>
            </View>

            {compat.insights.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profileView.observationsTitle')}</Text>
                <View style={[styles.card, styles.insightsCard]}>
                  {compat.insights.map((insight, i) => (
                    <View key={i} style={styles.insightRow}>
                      <View style={styles.insightDot} />
                      <Text style={styles.insightText}>{insight}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}

        {other.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profileView.bioTitle')}</Text>
            <Text style={styles.bio}>{other.bio}</Text>
          </View>
        )}

        {other.personality_type && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profileView.typeTitle')}</Text>
            <View style={styles.personalityRow}>
              <Text style={styles.personalityType}>{other.personality_type}</Text>
            </View>
          </View>
        )}

        <View style={styles.mobileActions}>
          <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
            <Text style={styles.chatButtonText}>{t('profileView.messageBtn')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const bar = StyleSheet.create({
  row: { gap: 6, marginBottom: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  emoji: { fontSize: 14 },
  label: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text, textTransform: 'capitalize' },
  value: { fontSize: 13, fontWeight: '800' },
  track: { height: 7, backgroundColor: COLORS.border, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: COLORS.textSecondary },
  topBar: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  backText: { color: COLORS.primary, fontSize: 16 },

  desktopRoot: { flex: 1, flexDirection: 'row' },

  leftCol: {
    width: '40%',
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  leftInner: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 28,
    gap: 12,
  },
  avatarLarge: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    marginBottom: 4,
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarEmojiLarge: { fontSize: 68 },

  rightCol: { flex: 1, flexDirection: 'column' },
  rightScroll: { padding: 28, paddingBottom: 16 },

  stickyActions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },

  bioSection: { width: '100%', marginTop: 4 },

  hero: { alignItems: 'center', paddingVertical: 20, gap: 8, paddingHorizontal: 24 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },

  name: { fontSize: 24, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  location: { fontSize: 14, color: COLORS.textSecondary },

  totalBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    gap: 2,
  },
  totalPercent: { color: '#fff', fontWeight: '900', fontSize: 22, lineHeight: 26 },
  totalLabel:   { color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 12 },

  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 10 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  insightsCard: { gap: 12 },
  insightRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  insightDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6, flexShrink: 0,
  },
  insightText: { flex: 1, fontSize: 14, color: COLORS.text, lineHeight: 21 },

  noCompatCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  noCompatText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  bio: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },

  personalityRow: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    gap: 4,
    width: '100%',
  },
  personalityType: { fontSize: 22, fontWeight: '800', color: COLORS.primary },

  mobileActions: { paddingHorizontal: 20, gap: 12, paddingBottom: 36 },
  chatButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
  },
  chatButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
