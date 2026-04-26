import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/contexts/LanguageContext';

export default function Login() {
  const { t } = useLang();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('common.error'), t('login.errorEmpty'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (error) { Alert.alert(t('login.errorFailed'), error.message); return; }
    router.replace('/(tabs)/matches');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>{t('login.heading')}</Text>
          <Text style={styles.sub}>{t('login.sub')}</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>{t('login.emailLabel')}</Text>
              <TextInput
                style={styles.input} value={email} onChangeText={setEmail}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address" autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>{t('login.passwordLabel')}</Text>
              <TextInput
                style={styles.input} value={password} onChangeText={setPassword}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
              />
            </View>
            <TouchableOpacity style={styles.forgot}>
              <Text style={styles.forgotText}>{t('login.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleLogin} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>{t('login.loginBtn')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.linkText}>
              {t('login.noAccount')} <Text style={styles.linkBold}>{t('login.registerLink')}</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingBottom: 32, gap: 8 },
  back: { paddingVertical: 16 },
  backText: { color: COLORS.primary, fontSize: 16 },
  heading: { fontSize: 32, fontWeight: '700', color: COLORS.text, marginTop: 8, letterSpacing: -0.02 * 32 },
  sub: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 16 },
  form: { gap: 16, marginVertical: 8 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  forgot: { alignSelf: 'flex-end' },
  forgotText: { color: COLORS.primary, fontSize: 14 },
  primaryButton: {
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  linkText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 15, marginTop: 8 },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
});
