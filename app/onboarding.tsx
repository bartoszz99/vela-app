import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/lib/i18n';


export default function Onboarding() {
  const { t, lang, setLang } = useLang();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>

        {/* Language picker — top-right */}
        <View style={styles.topBar}>
          <Text style={styles.logo}>Vela</Text>
          <TouchableOpacity onPress={() => setLang(lang === 'pl' ? 'en' : 'pl')}>
            <Text style={styles.langSwitch}>{lang === 'pl' ? 'EN' : 'PL'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.slideContainer}>
          <Text style={styles.emoji}>{t('onboarding.slide1Emoji')}</Text>
          <Text style={styles.title}>{t('onboarding.slide1Title')}</Text>
          <Text style={styles.description}>{t('onboarding.slide1Desc')}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.primaryButtonText}>{t('onboarding.start')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.secondaryButtonText}>{t('onboarding.haveAccount')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: {
    flex: 1, alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 32, paddingVertical: 24,
  },

  // Top bar: logo left, lang switcher right
  topBar: {
    width: '100%', flexDirection: 'row',
    justifyContent: 'space-between', alignItems: 'center',
  },
  logo: { fontSize: 42, fontWeight: '700', color: COLORS.primary, letterSpacing: 2 },
  langSwitch: { fontSize: 14, fontWeight: '600', color: '#c2622a' },

  slideContainer: { alignItems: 'center', gap: 16 },
  emoji: { fontSize: 80 },
  title: {
    fontSize: 28, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', lineHeight: 36, letterSpacing: -0.02 * 28,
  },
  description: { fontSize: 16, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 24 },
  actions: { width: '100%', gap: 12 },
  primaryButton: {
    backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center',
  },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  secondaryButton: {
    paddingVertical: 16, borderRadius: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  secondaryButtonText: { color: COLORS.textSecondary, fontSize: 17, fontWeight: '600' },
});
