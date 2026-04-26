import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch,
  ActivityIndicator, TextInput, Modal, Alert, Platform, Linking,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/contexts/LanguageContext';
import type { Lang } from '@/lib/i18n';

const APP_VERSION = '1.0.0';

// ─── Slider ───────────────────────────────────────────────────────────────────

function Slider({
  value, min, max, onChange,
}: { value: number; min: number; max: number; onChange: (v: number) => void }) {
  const [tw, setTw] = useState(1);
  const ratio = max > min ? Math.max(0, Math.min(1, (value - min) / (max - min))) : 0;
  const move = useCallback((x: number) => {
    const r = Math.max(0, Math.min(1, x / Math.max(1, tw)));
    onChange(Math.round(min + r * (max - min)));
  }, [tw, min, max, onChange]);

  return (
    <View
      style={sl.wrap}
      onLayout={e => setTw(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={e => move(e.nativeEvent.locationX)}
      onResponderMove={e => move(e.nativeEvent.locationX)}
    >
      <View style={sl.track}>
        <View style={[sl.fill, { width: ratio * tw }]} />
      </View>
      <View style={[sl.thumb, { left: Math.max(0, Math.min(tw - 26, ratio * tw - 13)) }]} />
    </View>
  );
}

const sl = StyleSheet.create({
  wrap:  { height: 44, justifyContent: 'center' },
  track: { height: 5, backgroundColor: COLORS.border, borderRadius: 5, overflow: 'visible' },
  fill:  { height: '100%', borderRadius: 5, backgroundColor: COLORS.primary },
  thumb: {
    position: 'absolute', width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary, top: 9,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 4, elevation: 3,
  },
});

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

function RowItem({
  label, sub, onPress, danger, right,
}: {
  label: string; sub?: string; onPress?: () => void;
  danger?: boolean; right?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      style={s.rowItem}
      onPress={onPress}
      activeOpacity={onPress ? 0.65 : 1}
      disabled={!onPress && !right}
    >
      <View style={s.rowItemLeft}>
        <Text style={[s.rowItemLabel, danger && s.rowItemDanger]}>{label}</Text>
        {sub ? <Text style={s.rowItemSub}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Text style={s.rowArrow}>›</Text> : null)}
    </TouchableOpacity>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

// ─── Change password modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext]       = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  const reset = () => { setCurrent(''); setNext(''); setConfirm(''); setErr(''); };

  const handleClose = () => { reset(); onClose(); };

  const handleSave = async () => {
    setErr('');
    if (!current.trim()) { setErr('Wpisz aktualne hasło'); return; }
    if (next.length < 8)  { setErr('Nowe hasło musi mieć min. 8 znaków'); return; }
    if (next !== confirm)  { setErr('Hasła nie są identyczne'); return; }

    setLoading(true);
    // Re-authenticate with current password
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { setErr('Błąd autoryzacji'); setLoading(false); return; }

    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user.email, password: current,
    });
    if (signInErr) { setErr('Aktualne hasło jest nieprawidłowe'); setLoading(false); return; }

    const { error: updateErr } = await supabase.auth.updateUser({ password: next });
    setLoading(false);
    if (updateErr) { setErr(updateErr.message); return; }

    handleClose();
    if (Platform.OS === 'web') {
      window.alert('Hasło zostało zmienione.');
    } else {
      Alert.alert('Gotowe', 'Hasło zostało zmienione.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={handleClose}>
        <TouchableOpacity activeOpacity={1} style={s.modalSheet} onPress={() => {}}>
          <View style={s.modalHandle} />
          <Text style={s.modalTitle}>Zmień hasło</Text>

          {err ? <Text style={s.modalErr}>{err}</Text> : null}

          {[
            { label: 'Aktualne hasło', val: current, set: setCurrent },
            { label: 'Nowe hasło',     val: next,    set: setNext },
            { label: 'Powtórz nowe',   val: confirm, set: setConfirm },
          ].map(({ label, val, set }) => (
            <View key={label} style={s.modalField}>
              <Text style={s.modalFieldLabel}>{label}</Text>
              <TextInput
                style={s.modalInput}
                value={val}
                onChangeText={set}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          ))}

          <View style={s.modalActions}>
            <TouchableOpacity style={s.modalCancel} onPress={handleClose}>
              <Text style={s.modalCancelTxt}>Anuluj</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modalSave, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.modalSaveTxt}>Zapisz</Text>}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const ALGO_OPTIONS = [
  { key: 'similar',       label: 'Podobni do mnie' },
  { key: 'complementary', label: 'Komplementarni' },
  { key: 'balanced',      label: 'Balans' },
] as const;

type AlgoMode = typeof ALGO_OPTIONS[number]['key'];

const VOIVODESHIPS = [
  'dolnośląskie','kujawsko-pomorskie','lubelskie','lubuskie',
  'łódzkie','małopolskie','mazowieckie','opolskie',
  'podkarpackie','podlaskie','pomorskie','śląskie',
  'świętokrzyskie','warmińsko-mazurskie','wielkopolskie','zachodniopomorskie',
];

const KM_OPTIONS = [10, 25, 50, 100, 150, 200];

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function Settings() {
  const { width } = useWindowDimensions();
  const isDesktop  = width >= 768;
  const { lang, setLang } = useLang();

  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  // Matching
  const [ageMin,    setAgeMin]    = useState(18);
  const [ageMax,    setAgeMax]    = useState(50);
  const [minCompat, setMinCompat] = useState(60);
  const [algoMode,  setAlgoMode]  = useState<AlgoMode>('balanced');
  const [locMode,   setLocMode]   = useState<'range' | 'voivodeships'>('range');
  const [kmRange,   setKmRange]   = useState(50);
  const [voivs,     setVoivs]     = useState<string[]>([]);
  const [isPaused,  setIsPaused]  = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select(
          'partner_age_min, partner_age_max, min_compatibility, ' +
          'algorithm_mode, location_mode, location_range_km, ' +
          'location_voivodeships, is_paused',
        )
        .eq('id', user.id)
        .single();
      if (data) {
        setAgeMin(data.partner_age_min    ?? 18);
        setAgeMax(data.partner_age_max    ?? 50);
        setMinCompat(data.min_compatibility ?? 60);
        setAlgoMode((data.algorithm_mode  ?? 'balanced') as AlgoMode);
        setLocMode(data.location_mode     ?? 'range');
        setKmRange(data.location_range_km ?? 50);
        setVoivs(data.location_voivodeships ?? []);
        setIsPaused(data.is_paused        ?? false);
      }
      setLoading(false);
    })();
  }, []);

  const toggleVoiv = (v: string) =>
    setVoivs(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update({
        partner_age_min:       ageMin,
        partner_age_max:       ageMax,
        min_compatibility:     minCompat,
        algorithm_mode:        algoMode,
        location_mode:         locMode,
        location_range_km:     locMode === 'range' ? kmRange : null,
        location_voivodeships: locMode === 'voivodeships' ? voivs : [],
        is_paused:             isPaused,
      }).eq('id', user.id);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = () => {
    const doDelete = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Requires a Supabase RPC or Edge Function – sign out for now
      await supabase.auth.signOut();
      router.replace('/onboarding');
    };

    if (Platform.OS === 'web') {
      if (window.confirm(
        'Czy na pewno chcesz usunąć konto? Ta operacja jest nieodwracalna.',
      )) doDelete();
    } else {
      Alert.alert(
        'Usuń konto',
        'Czy na pewno chcesz trwale usunąć swoje konto? Tej operacji nie można cofnąć.',
        [
          { text: 'Anuluj', style: 'cancel' },
          { text: 'Usuń konto', style: 'destructive', onPress: doDelete },
        ],
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.centered}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </SafeAreaView>
    );
  }

  const content = (
    <ScrollView
      contentContainerStyle={[s.scroll, isDesktop && s.scrollDesktop]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >

      {/* ── 0. JĘZYK ────────────────────────────────────────────────── */}
      <SectionHeader label="JĘZYK / LANGUAGE" />
      <Card>
        <View style={s.sliderBlock}>
          <Text style={s.fieldLabel}>Język aplikacji</Text>
          <Text style={s.fieldHint}>App language</Text>
          <View style={s.langRow}>
            {(['pl', 'en'] as Lang[]).map((l) => (
              <TouchableOpacity
                key={l}
                style={[s.langBtn, lang === l && s.langBtnOn]}
                onPress={() => setLang(l)}
              >
                <Text style={[s.langFlag]}>
                  {l === 'pl' ? '🇵🇱' : '🇬🇧'}
                </Text>
                <Text style={[s.langTxt, lang === l && s.langTxtOn]}>
                  {l === 'pl' ? 'Polski' : 'English'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>

      {/* ── 1. PROFIL I MATCHING ────────────────────────────────────── */}
      <SectionHeader label="PROFIL I MATCHING" />
      <Card>

        {/* Min compatibility */}
        <View style={s.sliderBlock}>
          <View style={s.sliderRow}>
            <Text style={s.fieldLabel}>Minimalna kompatybilność</Text>
            <View style={s.valueTag}><Text style={s.valueText}>{minCompat}%</Text></View>
          </View>
          <Text style={s.fieldHint}>Pokazuj tylko osoby z wynikiem ≥ {minCompat}%</Text>
          <Slider value={minCompat} min={0} max={100} onChange={setMinCompat} />
        </View>

        <Divider />

        {/* Age range */}
        <View style={s.sliderBlock}>
          <View style={s.sliderRow}>
            <Text style={s.fieldLabel}>Przedział wiekowy</Text>
            <View style={s.valueTag}><Text style={s.valueText}>{ageMin}–{ageMax} lat</Text></View>
          </View>
          <Text style={s.sliderSublbl}>Od: <Text style={s.sliderVal}>{ageMin}</Text></Text>
          <Slider value={ageMin} min={18} max={ageMax - 1}
            onChange={v => setAgeMin(Math.min(v, ageMax - 1))} />
          <Text style={s.sliderSublbl}>Do: <Text style={s.sliderVal}>{ageMax}</Text></Text>
          <Slider value={ageMax} min={ageMin + 1} max={80}
            onChange={v => setAgeMax(Math.max(v, ageMin + 1))} />
        </View>

        <Divider />

        {/* Algorithm mode */}
        <View style={s.sliderBlock}>
          <Text style={s.fieldLabel}>Tryb algorytmu</Text>
          <Text style={s.fieldHint}>Jak dobieramy Twoje dopasowania</Text>
          <View style={s.chipRow}>
            {ALGO_OPTIONS.map(o => (
              <TouchableOpacity
                key={o.key}
                style={[s.chip, algoMode === o.key && s.chipOn]}
                onPress={() => setAlgoMode(o.key)}
              >
                <Text style={[s.chipTxt, algoMode === o.key && s.chipTxtOn]}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Divider />

        {/* Location */}
        <View style={s.sliderBlock}>
          <Text style={s.fieldLabel}>Lokalizacja</Text>
          <View style={s.modeRow}>
            {(['range', 'voivodeships'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[s.modeBtn, locMode === m && s.modeBtnOn]}
                onPress={() => setLocMode(m)}
              >
                <Text style={[s.modeTxt, locMode === m && s.modeTxtOn]}>
                  {m === 'range' ? '📍 Zasięg km' : '🗺 Województwa'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {locMode === 'range' ? (
            <View style={s.kmRow}>
              {KM_OPTIONS.map(km => (
                <TouchableOpacity
                  key={km}
                  style={[s.kmBtn, kmRange === km && s.kmBtnOn]}
                  onPress={() => setKmRange(km)}
                >
                  <Text style={[s.kmTxt, kmRange === km && s.kmTxtOn]}>
                    {km === 200 ? '200+' : km} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={{ marginTop: 8 }}>
              <TouchableOpacity
                style={[s.allVoivBtn, voivs.length === VOIVODESHIPS.length && s.allVoivBtnOn]}
                onPress={() => setVoivs(
                  voivs.length === VOIVODESHIPS.length ? [] : [...VOIVODESHIPS],
                )}
              >
                <Text style={[s.allVoivTxt, voivs.length === VOIVODESHIPS.length && s.allVoivTxtOn]}>
                  {voivs.length === VOIVODESHIPS.length ? '✓ Cała Polska' : 'Zaznacz całą Polskę'}
                </Text>
              </TouchableOpacity>
              <View style={s.voivGrid}>
                {VOIVODESHIPS.map(v => {
                  const on = voivs.includes(v);
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[s.voivChip, on && s.voivChipOn]}
                      onPress={() => toggleVoiv(v)}
                    >
                      <Text style={[s.voivTxt, on && s.voivTxtOn]}>{v}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        <Divider />

        {/* Pause */}
        <View style={s.toggleRow}>
          <View style={s.toggleLeft}>
            <Text style={s.fieldLabel}>Pauza profilu</Text>
            <Text style={s.fieldHint}>Ukrywa Twój profil przed innymi użytkownikami</Text>
          </View>
          <Switch
            value={isPaused}
            onValueChange={setIsPaused}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#fff"
          />
        </View>
      </Card>

      {/* ── 2. KONTO ────────────────────────────────────────────────── */}
      <SectionHeader label="KONTO" />
      <Card>
        <RowItem
          label="Zmień hasło"
          sub="Zaktualizuj hasło do konta"
          onPress={() => setShowPwd(true)}
        />
        <Divider />
        <RowItem
          label="Usuń konto"
          sub="Trwale usuwa Twój profil i dane"
          danger
          onPress={handleDeleteAccount}
        />
      </Card>

      {/* ── 3. PRYWATNOŚĆ I POMOC ───────────────────────────────────── */}
      <SectionHeader label="PRYWATNOŚĆ I POMOC" />
      <Card>
        <RowItem
          label="Polityka prywatności"
          onPress={() => Linking.openURL('https://vela.app/privacy')}
        />
        <Divider />
        <RowItem
          label="Regulamin"
          onPress={() => Linking.openURL('https://vela.app/terms')}
        />
        <Divider />
        <RowItem
          label="Wersja aplikacji"
          right={<Text style={s.versionText}>{APP_VERSION}</Text>}
        />
      </Card>

      {/* ── Zapisz ─────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={[s.saveBtn, saving && s.saveBtnOff]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.saveTxt}>Zapisz ustawienia</Text>}
      </TouchableOpacity>

    </ScrollView>
  );

  // ── Desktop wrapper (right panel) ──────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        {/* Backdrop */}
        <TouchableOpacity style={s.desktopBackdrop} activeOpacity={1} onPress={() => router.back()} />

        {/* Panel */}
        <View style={s.desktopPanel}>
          <SafeAreaView style={{ flex: 1 }} edges={['top', 'right', 'bottom']}>
            <View style={s.header}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={s.backText}>✕</Text>
              </TouchableOpacity>
              <Text style={s.title}>Ustawienia</Text>
            </View>
            {content}
          </SafeAreaView>
        </View>

        <ChangePasswordModal visible={showPwd} onClose={() => setShowPwd(false)} />
      </View>
    );
  }

  // ── Mobile full screen ─────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backText}>← Wróć</Text>
        </TouchableOpacity>
        <Text style={s.title}>Ustawienia</Text>
      </View>
      {content}
      <ChangePasswordModal visible={showPwd} onClose={() => setShowPwd(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Desktop layout
  desktopRoot: {
    flex: 1, flexDirection: 'row', backgroundColor: 'transparent',
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
  },
  desktopBackdrop: {
    flex: 1, backgroundColor: 'rgba(45,31,14,0.35)',
  },
  desktopPanel: {
    width: 460,
    backgroundColor: COLORS.background,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backText: { color: COLORS.primary, fontSize: 17, fontWeight: '600' },
  title:    { fontSize: 20, fontWeight: '700', color: COLORS.text, letterSpacing: -0.4 },

  scroll:        { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },
  scrollDesktop: { paddingHorizontal: 20, paddingBottom: 48 },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: '700', letterSpacing: 0.7,
    color: COLORS.textMuted, textTransform: 'uppercase',
    marginTop: 20, marginBottom: 6, paddingHorizontal: 4,
  },

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },

  divider: { height: 1, backgroundColor: COLORS.border },

  // Row item
  rowItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowItemLeft:   { flex: 1, gap: 2 },
  rowItemLabel:  { fontSize: 15, fontWeight: '500', color: COLORS.text },
  rowItemDanger: { color: '#c0392b' },
  rowItemSub:    { fontSize: 12, color: COLORS.textSecondary },
  rowArrow:      { fontSize: 20, color: COLORS.textMuted },
  versionText:   { fontSize: 14, color: COLORS.textMuted },

  // Slider block (inside card)
  sliderBlock: { padding: 16, gap: 6 },
  sliderRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fieldLabel:  { fontSize: 15, fontWeight: '600', color: COLORS.text },
  fieldHint:   { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  sliderSublbl:{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  sliderVal:   { color: COLORS.primary, fontWeight: '700' },
  valueTag:    { backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  valueText:   { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  // Toggle row
  toggleRow:  { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  toggleLeft: { flex: 1, gap: 3 },

  // Algo chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 20, borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipOn:    { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipTxt:   { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  chipTxtOn: { color: COLORS.primary, fontWeight: '700' },

  // Location mode
  modeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  modeBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background, alignItems: 'center',
  },
  modeBtnOn:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  modeTxt:    { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  modeTxtOn:  { color: COLORS.primary },

  // KM
  kmRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 },
  kmBtn: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  kmBtnOn:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  kmTxt:    { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  kmTxtOn:  { color: COLORS.primary },

  // Voivodeships
  allVoivBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center', marginBottom: 10,
    backgroundColor: COLORS.background,
  },
  allVoivBtnOn:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  allVoivTxt:    { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  allVoivTxtOn:  { color: COLORS.primary, fontWeight: '700' },
  voivGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  voivChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  voivChipOn:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  voivTxt:     { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary, textTransform: 'capitalize' },
  voivTxtOn:   { color: COLORS.primary, fontWeight: '700' },

  // Save button
  saveBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', marginTop: 24, marginHorizontal: 0,
  },
  saveBtnOff: { opacity: 0.5 },
  saveTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },

  // Language switcher
  langRow:   { flexDirection: 'row', gap: 10, marginTop: 10 },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.background,
  },
  langBtnOn:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  langFlag:   { fontSize: 22 },
  langTxt:    { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  langTxtOn:  { color: COLORS.primary },

  // Password modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(45,31,14,0.45)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, gap: 0,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 18,
  },
  modalTitle:  { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  modalErr:    { color: '#c0392b', fontSize: 13, marginBottom: 8 },
  modalField:  { marginBottom: 14 },
  modalFieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  modalInput: {
    backgroundColor: COLORS.background, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.background, alignItems: 'center',
  },
  modalCancelTxt: { color: COLORS.textSecondary, fontSize: 15, fontWeight: '600' },
  modalSave: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: COLORS.primary, alignItems: 'center',
  },
  modalSaveTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
