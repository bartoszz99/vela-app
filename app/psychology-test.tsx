import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { QUESTIONS, BLOCKS, Answer } from '@/constants/psychologyQuestions';
import { calcTraitScores, derivePersonalityType } from '@/lib/compatibility';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/contexts/LanguageContext';

const BLOCK_COLORS = ['#c2622a', '#0EA5E9', '#b85c38', '#10B981'] as const;
const OPEN_COLOR   = '#c2622a';
const OPEN_QUESTIONS_COUNT = 4;
const TOTAL_STEPS = QUESTIONS.length + OPEN_QUESTIONS_COUNT;

async function analyzeOpenAnswers(answers: string[]): Promise<Record<string, unknown>> {
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('analyze-answers', {
    body: { answers },
    headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export default function PsychologyTest() {
  const { t } = useLang();
  const [step, setStep]               = useState(0);
  const [closedAnswers, setClosedAnswers] = useState<Record<number, Answer>>({});
  const [openAnswers, setOpenAnswers]  = useState(['', '', '', '']);
  const [saving, setSaving]           = useState(false);

  const isClosed = step < QUESTIONS.length;
  const openIdx  = step - QUESTIONS.length;
  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  const question   = isClosed ? QUESTIONS[step] : null;
  const block      = question ? BLOCKS.find((b) => b.id === question.blockId)! : null;
  const blockColor = block ? BLOCK_COLORS[block.id - 1] : OPEN_COLOR;

  const prevQuestion  = step > 0 && step < QUESTIONS.length ? QUESTIONS[step - 1] : null;
  const isFirstInBlock = isClosed && (step === 0 || prevQuestion?.blockId !== question!.blockId);
  const isFirstOpen    = step === QUESTIONS.length;

  // Translated question text / options
  const qKey  = question ? String(question.id) : '';
  const qText = question ? t(`test.questions.${qKey}.text`) : '';
  const qOpts = question
    ? question.options.map(o => ({ key: o.key, label: t(`test.questions.${qKey}.${o.key}`) }))
    : [];

  const blockData = block
    ? (t(`test.blocks`) as unknown as { title: string; subtitle: string }[])[block.id - 1]
    : null;

  const openQText = !isClosed
    ? (t('test.openQuestions') as unknown as string[])[openIdx] ?? ''
    : '';

  const handleFinish = async (finalOpen: string[]) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const traitScores    = calcTraitScores(closedAnswers);
      const personalityType = derivePersonalityType(traitScores);

      let openAnalysis: Record<string, unknown> = {};
      try { openAnalysis = await analyzeOpenAnswers(finalOpen); } catch {}

      const combinedScores = { ...traitScores, ...openAnalysis };

      const rows = Object.entries(closedAnswers).map(([qId, answer]) => ({
        user_id: user.id, question_id: parseInt(qId, 10), answer,
      }));
      await supabase.from('psychology_answers').upsert(rows, { onConflict: 'user_id,question_id' });
      await supabase.from('profiles').update({
        trait_scores: combinedScores, personality_type: personalityType, onboarding_done: true,
      }).eq('id', user.id);

      router.replace(`/personality-result?type=${personalityType}`);
    } catch {
      router.replace('/(tabs)/matches');
    }
    setSaving(false);
  };

  const selectClosed = (key: Answer) => {
    setClosedAnswers(prev => ({ ...prev, [QUESTIONS[step].id]: key }));
    setStep(s => s + 1);
  };

  const submitOpen = () => {
    if (step === TOTAL_STEPS - 1) handleFinish(openAnswers);
    else setStep(s => s + 1);
  };

  const updateOpenAnswer = (text: string) => {
    setOpenAnswers(prev => { const c = [...prev]; c[openIdx] = text; return c; });
  };

  if (saving) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.savingScreen}>
          <Text style={styles.savingEmoji}>{t('test.savingEmoji')}</Text>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          <Text style={styles.savingTitle}>{t('test.savingTitle')}</Text>
          <Text style={styles.savingSubtitle}>{t('test.savingSubtitle')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>Vela</Text>
        <Text style={styles.counter}>{t('test.counterLabel', { step: step + 1, total: TOTAL_STEPS })}</Text>
      </View>

      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: blockColor }]} />
      </View>

      {isClosed ? (
        <ScrollView contentContainerStyle={styles.content} bounces={false}>
          {isFirstInBlock && block && blockData && (
            <View style={[styles.blockBanner, { borderColor: blockColor + '40', backgroundColor: blockColor + '12' }]}>
              <Text style={[styles.blockTag, { color: blockColor }]}>
                {t('test.blockTag', { n: block.id, total: BLOCKS.length })}
              </Text>
              <Text style={styles.blockTitle}>{blockData.title}</Text>
              <Text style={styles.blockSubtitle}>{blockData.subtitle}</Text>
            </View>
          )}

          <Text style={styles.questionText}>{qText}</Text>

          <View style={styles.options}>
            {qOpts.map(opt => {
              const selected = closedAnswers[question!.id] === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.option, selected && { borderColor: blockColor, backgroundColor: blockColor + '12' }]}
                  onPress={() => selectClosed(opt.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.badge, selected && { backgroundColor: blockColor }]}>
                    <Text style={[styles.badgeText, selected && styles.badgeTextSelected]}>{opt.key}</Text>
                  </View>
                  <Text style={[styles.optionText, selected && { fontWeight: '600', color: blockColor }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={8}
        >
          <ScrollView contentContainerStyle={styles.content} bounces={false} keyboardShouldPersistTaps="handled">
            {isFirstOpen && (
              <View style={[styles.blockBanner, { borderColor: OPEN_COLOR + '40', backgroundColor: OPEN_COLOR + '12' }]}>
                <Text style={[styles.blockTag, { color: OPEN_COLOR }]}>{t('test.openTag')}</Text>
                <Text style={styles.blockTitle}>{t('test.openTitle')}</Text>
                <Text style={styles.blockSubtitle}>{t('test.openSubtitle')}</Text>
              </View>
            )}

            <Text style={[styles.openLabel, { color: OPEN_COLOR }]}>
              {t('test.openCounter', { n: openIdx + 1, total: OPEN_QUESTIONS_COUNT })}
            </Text>
            <Text style={styles.questionText}>{openQText}</Text>

            <TextInput
              style={styles.openInput}
              value={openAnswers[openIdx]}
              onChangeText={updateOpenAnswer}
              placeholder={t('test.openPlaceholder')}
              placeholderTextColor={COLORS.textMuted}
              multiline textAlignVertical="top" autoFocus={false}
            />

            <TouchableOpacity
              style={[styles.nextBtn, !openAnswers[openIdx].trim() && styles.nextBtnDisabled]}
              onPress={submitOpen}
              disabled={!openAnswers[openIdx].trim()}
            >
              <Text style={styles.nextBtnText}>
                {step === TOTAL_STEPS - 1 ? t('test.finishBtn') : t('test.nextBtn')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {step > 0 && (
        <TouchableOpacity style={styles.backBtn} onPress={() => setStep(s => s - 1)}>
          <Text style={styles.backBtnText}>{t('test.backBtn')}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 12,
  },
  logo: { fontSize: 24, fontWeight: '700', color: COLORS.primary },
  counter: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  progressBar: {
    height: 5, backgroundColor: COLORS.border,
    marginHorizontal: 24, borderRadius: 5, overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 5 },
  content: { padding: 24, gap: 16, flexGrow: 1 },
  blockBanner: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 4, marginBottom: 4 },
  blockTag: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  blockTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  blockSubtitle: { fontSize: 13, color: COLORS.textSecondary },
  questionText: { fontSize: 22, fontWeight: '700', color: COLORS.text, lineHeight: 30, marginBottom: 4 },
  options: { gap: 12 },
  option: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 16,
    borderWidth: 1.5, borderColor: COLORS.border, gap: 14,
  },
  badge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center',
  },
  badgeText: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary },
  badgeTextSelected: { color: '#fff' },
  optionText: { flex: 1, fontSize: 15, color: COLORS.text, lineHeight: 22 },
  openLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.7 },
  openInput: {
    backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1.5,
    borderColor: COLORS.border, padding: 16, fontSize: 15, color: COLORS.text,
    minHeight: 140, lineHeight: 22,
  },
  nextBtn: { backgroundColor: COLORS.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  backBtn: { paddingVertical: 16, alignItems: 'center' },
  backBtnText: { color: COLORS.textSecondary, fontSize: 15 },
  savingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  savingEmoji: { fontSize: 56 },
  savingTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  savingSubtitle: { fontSize: 15, color: COLORS.textSecondary },
});
