import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { getPersonalityType } from '@/constants/personalityTypes';
import { useLang } from '@/contexts/LanguageContext';
import { PhotoAvatar } from '@/components/PhotoAvatar';

export default function Profile() {
  const { profile, loading } = useProfile();
  const { t } = useLang();

  const personality = profile?.personality_type
    ? getPersonalityType(profile.personality_type)
    : null;

  const doLogout = () => {
    supabase.auth.signOut().finally(() => router.replace('/onboarding'));
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.logoutWebMsg'))) doLogout();
    } else {
      Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmMsg'), [
        { text: t('profile.logoutConfirmNo'),  style: 'cancel' },
        { text: t('profile.logoutConfirmYes'), style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const avatarPhoto = profile?.photos?.[0] ?? null;
  const displayName = profile?.name ?? t('common.user');
  const displayAge = profile?.age ? `, ${profile.age}` : '';
  const displayCity = profile?.city ?? null;
  const displayBio = profile?.bio ?? null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.heading}>{t('profile.heading')}</Text>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/complete-profile')}
          >
            <Text style={styles.editBtnText}>{t('profile.edit')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroSection}>
          <View style={styles.avatarLarge}>
            <PhotoAvatar uri={avatarPhoto} name={displayName} size={100} />
          </View>
          <Text style={styles.name}>{displayName}{displayAge}</Text>
          {displayCity && <Text style={styles.location}>📍 {displayCity}</Text>}
        </View>

        {displayBio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.bioTitle')}</Text>
            <Text style={styles.bio}>{displayBio}</Text>
          </View>
        )}

        {personality && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.typeTitle')}</Text>
            <View style={styles.personalityCard}>
              <Text style={styles.personalityEmoji}>{personality.emoji}</Text>
              <View style={styles.personalityInfo}>
                <Text style={styles.personalityType}>{personality.code}</Text>
                <Text style={styles.personalityDesc}>{t(`personalityResult.types.${personality.code}.name`)}</Text>
              </View>
            </View>
          </View>
        )}

        {personality && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('profile.traitsTitle')}</Text>
            <View style={styles.tags}>
              {(t(`personalityResult.types.${personality.code}.traits`) as string[]).map((trait) => (
                <View key={trait} style={styles.traitTag}>
                  <Text style={styles.traitText}>{trait}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {!profile?.personality_type && (
          <View style={styles.section}>
            <View style={styles.noTestCard}>
              <Text style={styles.noTestText}>{t('profile.noTestText')}</Text>
              <TouchableOpacity
                style={styles.startTestBtn}
                onPress={() => router.push('/psychology-test')}
              >
                <Text style={styles.startTestBtnText}>{t('profile.startTest')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {profile?.personality_type && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.retakeBtn}
              onPress={() => router.push('/psychology-test')}
            >
              <Text style={styles.retakeBtnText}>{t('profile.retakeTest')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  heading: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  editBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  editBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  heroSection: { alignItems: 'center', paddingVertical: 20, gap: 8 },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarEmoji: { fontSize: 50 },
  name: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  location: { fontSize: 15, color: COLORS.textSecondary },
  section: { paddingHorizontal: 20, marginBottom: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  bio: { fontSize: 15, color: COLORS.textSecondary, lineHeight: 23 },
  personalityCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.primary + '40',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  personalityEmoji: { fontSize: 36 },
  personalityInfo: { flex: 1, gap: 2 },
  personalityType: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  personalityDesc: { fontSize: 14, color: COLORS.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  traitTag: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  traitText: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  noTestCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
    alignItems: 'center',
  },
  noTestText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  startTestBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  startTestBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  retakeBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  retakeBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  logoutBtn: {
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutBtnText: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
});
