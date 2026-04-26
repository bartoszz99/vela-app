import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { getPersonalityType } from '@/constants/personalityTypes';
import { useLang } from '@/contexts/LanguageContext';

export default function PersonalityResult() {
  const { t } = useLang();
  const { type } = useLocalSearchParams<{ type: string }>();
  const personality = getPersonalityType(type ?? 'INFP');

  const code    = personality.code;
  const name    = t(`personalityResult.types.${code}.name`);
  const desc    = t(`personalityResult.types.${code}.desc`);
  const traits  = t(`personalityResult.types.${code}.traits`) as string[];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.hero}>
          <View style={styles.emojiCircle}>
            <Text style={styles.emoji}>{personality.emoji}</Text>
          </View>
          <Text style={styles.typeCode}>{code}</Text>
          <Text style={styles.typeName}>{name}</Text>
        </View>

        <View style={styles.resultBadge}>
          <Text style={styles.resultBadgeText}>{t('personalityResult.badge')}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('personalityResult.whoLabel')}</Text>
          <Text style={styles.desc}>{desc}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('personalityResult.traitsLabel')}</Text>
          <View style={styles.traitsRow}>
            {(Array.isArray(traits) ? traits : []).map((trait) => (
              <View key={trait} style={styles.traitPill}>
                <Text style={styles.traitText}>{trait}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.ctaBtn}
          onPress={() => router.replace('/complete-profile')}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnText}>{t('personalityResult.ctaBtn')}</Text>
        </TouchableOpacity>

        <Text style={styles.hint}>{t('personalityResult.hint')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40, alignItems: 'center', gap: 16 },
  hero: { alignItems: 'center', gap: 10, marginBottom: 4 },
  emojiCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.primaryLight, borderWidth: 3, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  emoji: { fontSize: 46 },
  typeCode: { fontSize: 44, fontWeight: '900', color: COLORS.primary, letterSpacing: 4 },
  typeName: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  resultBadge: {
    backgroundColor: COLORS.primaryLight, borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 8,
  },
  resultBadgeText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  card: {
    width: '100%', backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  cardLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.7,
  },
  desc: { fontSize: 15, color: COLORS.text, lineHeight: 24 },
  traitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  traitPill: {
    backgroundColor: COLORS.primaryLight, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  traitText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  ctaBtn: {
    width: '100%', backgroundColor: COLORS.primary,
    paddingVertical: 17, borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  ctaBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  hint: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});
