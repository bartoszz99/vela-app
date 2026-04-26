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

export default function Register() {
  const { t } = useLang();
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge]           = useState('');
  const [loading, setLoading]   = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !age.trim()) {
      Alert.alert(t('common.error'), t('register.errorEmpty'));
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
      Alert.alert(t('common.error'), t('register.errorAge'));
      return;
    }
    if (password.length < 8) {
      Alert.alert(t('common.error'), t('register.errorPassword'));
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(), password,
      options: { data: { name: name.trim(), age: ageNum } },
    });
    setLoading(false);
    if (error) { Alert.alert(t('register.errorFailed'), error.message); return; }
    router.push('/psychology-test');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.back} onPress={() => router.back()}>
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>

          <Text style={styles.heading}>{t('register.heading')}</Text>
          <Text style={styles.sub}>{t('register.sub')}</Text>

          <View style={styles.form}>
            {[
              { label: t('register.nameLabel'),     val: name,     set: setName,     placeholder: t('register.namePlaceholder'),     opts: { autoCapitalize: 'words' as const } },
              { label: t('register.ageLabel'),      val: age,      set: setAge,      placeholder: t('register.agePlaceholder'),      opts: { keyboardType: 'number-pad' as const } },
              { label: t('register.emailLabel'),    val: email,    set: setEmail,    placeholder: t('register.emailPlaceholder'),    opts: { keyboardType: 'email-address' as const, autoCapitalize: 'none' as const } },
              { label: t('register.passwordLabel'), val: password, set: setPassword, placeholder: t('register.passwordPlaceholder'), opts: { secureTextEntry: true } },
            ].map(({ label, val, set, placeholder, opts }) => (
              <View key={label} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input} value={val} onChangeText={set}
                  placeholder={placeholder} placeholderTextColor={COLORS.textMuted}
                  {...opts}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
            onPress={handleRegister} disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryButtonText}>{t('register.submitBtn')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.linkText}>
              {t('register.hasAccount')} <Text style={styles.linkBold}>{t('register.loginLink')}</Text>
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
  primaryButton: {
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: 12, alignItems: 'center', marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  linkText: { textAlign: 'center', color: COLORS.textSecondary, fontSize: 15, marginTop: 8 },
  linkBold: { color: COLORS.primary, fontWeight: '600' },
});
