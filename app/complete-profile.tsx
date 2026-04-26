import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Alert, ActivityIndicator, Image, Modal, Dimensions, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

const { width: SW } = Dimensions.get('window');
const PHOTO_COL = 3;
const PHOTO_GAP = 8;
const PHOTO_W = (SW - 48 - PHOTO_GAP * (PHOTO_COL - 1)) / PHOTO_COL;
const PHOTO_H = PHOTO_W * 1.28;

// ─── Data constants ────────────────────────────────────────────────────────────

const POLISH_CITIES = [
  'Warszawa','Kraków','Łódź','Wrocław','Poznań','Gdańsk','Szczecin',
  'Bydgoszcz','Lublin','Białystok','Katowice','Gdynia','Częstochowa',
  'Radom','Toruń','Sosnowiec','Kielce','Rzeszów','Gliwice','Zabrze',
  'Olsztyn','Zielona Góra','Rybnik','Tychy','Opole','Elbląg','Płock',
  'Wałbrzych','Włocławek','Tarnów','Chorzów','Koszalin','Kalisz',
  'Legnica','Grudziądz','Jaworzno','Słupsk','Nowy Sącz','Siedlce',
  'Bytom','Inowrocław','Ostrów Wielkopolski','Suwałki','Gniezno','Konin',
  'Stargard','Piotrków Trybunalski','Jastrzębie-Zdrój','Mysłowice','Lubin',
].sort();

const PROFILE_QUESTIONS = [
  { id: 1, text: 'Co byś zrobił/a w idealną sobotę?' },
  { id: 2, text: 'Moja największa pasja to...' },
  { id: 3, text: 'W podróżach cenię...' },
  { id: 4, text: 'Typowy wieczór w domu wygląda u mnie...' },
  { id: 5, text: 'Coś co mnie wyróżnia...' },
  { id: 6, text: 'Śmieszy mnie...' },
  { id: 7, text: 'Mój ulubiony sposób na relaks...' },
  { id: 8, text: 'Bez czego nie wyobrażam sobie dnia...' },
  { id: 9, text: 'Moje guilty pleasure to...' },
  { id: 10, text: 'Ostatnia rzecz, która mnie zaskoczyła...' },
];

const VOIVODESHIPS = [
  'dolnośląskie','kujawsko-pomorskie','lubelskie','lubuskie',
  'łódzkie','małopolskie','mazowieckie','opolskie',
  'podkarpackie','podlaskie','pomorskie','śląskie',
  'świętokrzyskie','warmińsko-mazurskie','wielkopolskie','zachodniopomorskie',
];

const KM_OPTIONS = [10, 25, 50, 100, 150, 200];

// ─── Custom Slider ─────────────────────────────────────────────────────────────

function Slider({
  value, min, max, onChange, color = COLORS.primary,
}: {
  value: number; min: number; max: number;
  onChange: (v: number) => void; color?: string;
}) {
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
        <View style={[sl.fill, { width: ratio * tw, backgroundColor: color }]} />
      </View>
      <View style={[sl.thumb, {
        left: Math.max(0, Math.min(tw - 28, ratio * tw - 14)),
        backgroundColor: color,
      }]} />
    </View>
  );
}

const sl = StyleSheet.create({
  wrap: { height: 44, justifyContent: 'center' },
  track: { height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: 'visible' },
  fill: { height: '100%', borderRadius: 2 },
  thumb: {
    position: 'absolute', width: 28, height: 28, borderRadius: 14,
    top: 8, elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 4,
  },
});

// ─── Section card ──────────────────────────────────────────────────────────────

function Section({ title, required, children }: {
  title: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>{title}</Text>
        {required && <View style={s.reqBadge}><Text style={s.reqText}>wymagane</Text></View>}
      </View>
      {children}
    </View>
  );
}

// ─── Read-only field ───────────────────────────────────────────────────────────

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.field}>
      <Text style={s.label}>{label}</Text>
      <View style={s.roInput}>
        <Text style={s.roText}>{value || '—'}</Text>
        <Text style={s.roHint}>z rejestracji</Text>
      </View>
    </View>
  );
}

// ─── Chip group ────────────────────────────────────────────────────────────────

function ChipGroup({ options, selected, onSelect, multi = false }: {
  options: string[]; selected: string | string[];
  onSelect: (v: string) => void; multi?: boolean;
}) {
  const isSelected = (v: string) =>
    multi ? (selected as string[]).includes(v) : selected === v;

  return (
    <View style={s.chipRow}>
      {options.map(o => (
        <TouchableOpacity
          key={o}
          style={[s.chip, isSelected(o) && s.chipOn]}
          onPress={() => onSelect(o)}
        >
          <Text style={[s.chipTxt, isSelected(o) && s.chipTxtOn]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function CompleteProfile() {
  const [name, setName]     = useState('');
  const [age, setAge]       = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const [city, setCity]             = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [job, setJob]               = useState('');
  const [bio, setBio]               = useState('');

  const [q1Id, setQ1Id]           = useState<number | null>(null);
  const [q1Ans, setQ1Ans]         = useState('');
  const [q2Id, setQ2Id]           = useState<number | null>(null);
  const [q2Ans, setQ2Ans]         = useState('');
  const [customQ, setCustomQ]     = useState('');
  const [customAns, setCustomAns] = useState('');
  const [qModal, setQModal]       = useState<1 | 2 | null>(null);

  const [marital, setMarital]           = useState('');
  const [children, setChildren]         = useState('');
  const [lookingFor, setLookingFor]     = useState('');
  const [pace, setPace]                 = useState('');

  const [ageMin, setAgeMin]   = useState(22);
  const [ageMax, setAgeMax]   = useState(38);
  const [minCompat, setMinCompat] = useState(60);
  const [locMode, setLocMode] = useState<'range' | 'voivodeships'>('range');
  const [kmRange, setKmRange] = useState(50);
  const [voivs, setVoivs]     = useState<string[]>([]);

  const [saving, setSaving] = useState(false);

  // ── Load existing profile data ─────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('name, age, city, job, bio, photos')
        .eq('id', user.id)
        .single();
      if (!data) return;
      setName(data.name ?? '');
      setAge(String(data.age ?? ''));
      if (data.city) { setCity(data.city); setCitySearch(data.city); }
      setJob(data.job ?? '');
      setBio(data.bio ?? '');
      if (Array.isArray(data.photos) && data.photos.length) {
        setPhotos(data.photos as string[]);
      }
    })();
  }, []);

  // ── Photos ─────────────────────────────────────────────────────────────
  const openPicker = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Brak dostępu', 'Potrzebujemy dostępu do galerii zdjęć.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return null;

    let uri = result.assets[0].uri;

    // Compress to max 800px wide, quality 80 (native only)
    if (Platform.OS !== 'web') {
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
        );
        uri = compressed.uri;
      } catch {}
    }
    return uri;
  };

  const handleSlotPress = (index: number) => {
    const existing = photos[index];
    if (existing) {
      // Filled slot → change or remove
      if (Platform.OS === 'web') {
        // Web doesn't support Alert with 3 buttons — use two steps
        const action = window.confirm('Usuń to zdjęcie?\n\nOK = Usuń   Anuluj = Zmień');
        if (action) {
          setPhotos(p => p.filter((_, i) => i !== index));
        } else {
          openPicker().then(uri => {
            if (!uri) return;
            setPhotos(p => { const n = [...p]; n[index] = uri; return n; });
          });
        }
      } else {
        Alert.alert('Zdjęcie', undefined, [
          {
            text: 'Zmień zdjęcie',
            onPress: () => openPicker().then(uri => {
              if (!uri) return;
              setPhotos(p => { const n = [...p]; n[index] = uri; return n; });
            }),
          },
          {
            text: 'Usuń',
            style: 'destructive',
            onPress: () => setPhotos(p => p.filter((_, i) => i !== index)),
          },
          { text: 'Anuluj', style: 'cancel' },
        ]);
      }
    } else if (index === photos.length) {
      // Next empty slot → pick new
      openPicker().then(uri => {
        if (!uri) return;
        setPhotos(p => [...p, uri]);
      });
    }
  };

  // ── City search ────────────────────────────────────────────────────────
  const cityMatches = POLISH_CITIES
    .filter(c => c.toLowerCase().includes(citySearch.toLowerCase()))
    .slice(0, 6);

  // ── Voivodeships ───────────────────────────────────────────────────────
  const toggleVoiv = (v: string) =>
    setVoivs(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  // ── Photo upload ───────────────────────────────────────────────────────
  const uploadPhoto = async (uri: string, userId: string): Promise<string> => {
    if (uri.startsWith('http')) return uri; // already uploaded
    try {
      const res  = await fetch(uri);
      const blob = await res.blob();
      const path = `${userId}/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('photos').upload(path, blob, { contentType: 'image/jpeg' });
      if (error) return uri;
      return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl;
    } catch { return uri; }
  };

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!photos.length) { Alert.alert('Brakuje zdjęcia', 'Dodaj przynajmniej jedno zdjęcie.'); return; }
    if (!city.trim())   { Alert.alert('Brakuje miasta', 'Wpisz swoje miasto.'); return; }
    if (!bio.trim())    { Alert.alert('Brakuje opisu', 'Napisz coś o sobie.'); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('not authenticated');

      const urls = await Promise.all(photos.map(u => uploadPhoto(u, user.id)));

      const profileQs = [
        q1Id && q1Ans.trim()  ? { questionId: q1Id, answer: q1Ans.trim() } : null,
        q2Id && q2Ans.trim()  ? { questionId: q2Id, answer: q2Ans.trim() } : null,
        customQ.trim() && customAns.trim()
          ? { question: customQ.trim(), answer: customAns.trim(), custom: true } : null,
      ].filter(Boolean);

      await supabase.from('profiles').update({
        city: city.trim(),
        job: job.trim() || null,
        bio: bio.trim(),
        photos: urls,
        profile_questions: profileQs,
        marital_status: marital || null,
        has_children: children || null,
        looking_for: lookingFor || null,
        meeting_pace: pace || null,
        partner_age_min: ageMin,
        partner_age_max: ageMax,
        min_compatibility: minCompat,
        location_mode: locMode,
        location_range_km: locMode === 'range' ? kmRange : null,
        location_voivodeships: locMode === 'voivodeships' ? voivs : [],
      }).eq('id', user.id);

      router.replace('/(tabs)/matches');
    } catch (e) {
      console.error(e);
      Alert.alert('Błąd', 'Nie udało się zapisać profilu. Spróbuj ponownie.');
    }
    setSaving(false);
  };

  const canSave = photos.length > 0 && city.trim().length > 0 && bio.trim().length > 0;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.container}>

      {/* ── Question picker modal ── */}
      <Modal visible={qModal !== null} animationType="slide" transparent onRequestClose={() => setQModal(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setQModal(null)}>
          <View style={s.sheet}>
            <View style={s.sheetHandle} />
            <Text style={s.sheetTitle}>Wybierz pytanie</Text>
            {PROFILE_QUESTIONS
              .filter(q => (qModal === 1 ? q.id !== q2Id : q.id !== q1Id))
              .map(q => (
                <TouchableOpacity
                  key={q.id} style={s.sheetOpt}
                  onPress={() => { qModal === 1 ? setQ1Id(q.id) : setQ2Id(q.id); setQModal(null); }}
                >
                  <Text style={s.sheetOptTxt}>{q.text}</Text>
                </TouchableOpacity>
              ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page header */}
        <View style={s.pageHead}>
          <Text style={s.pageTitle}>Uzupełnij profil</Text>
          <Text style={s.pageSub}>Ostatni krok zanim znajdziemy Twoje dopasowania ✨</Text>
        </View>

        {/* ── 1. ZDJĘCIA ─────────────────────────────────────────────── */}
        <Section title="Zdjęcia" required>
          <Text style={s.hint}>Pierwsze zdjęcie będzie Twoim avatarem. Możesz dodać do 3.</Text>
          <View style={s.photoGrid}>
            {Array.from({ length: 3 }).map((_, i) => {
              const photo  = photos[i];
              const isNext = !photo && i === photos.length && photos.length < 3;
              return (
                <TouchableOpacity
                  key={i}
                  style={[s.photoSlot, { width: PHOTO_W, height: PHOTO_H }]}
                  onPress={() => handleSlotPress(i)}
                  activeOpacity={0.85}
                  disabled={!photo && !isNext}
                >
                  {photo ? (
                    <>
                      <Image source={{ uri: photo }} style={s.photoImg} />
                      {i === 0 && <View style={s.mainBadge}><Text style={s.mainBadgeTxt}>Główne</Text></View>}
                      <View style={s.rmBtn}><Text style={s.rmBtnTxt}>✕</Text></View>
                    </>
                  ) : isNext ? (
                    <View style={s.addSlot}>
                      <Text style={s.addSlotIcon}>+</Text>
                      {i === 0 && <Text style={s.addSlotLbl}>Dodaj zdjęcie</Text>}
                    </View>
                  ) : (
                    <View style={s.emptySlot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* ── 2. PODSTAWOWE INFO ───────────────────────────────────────── */}
        <Section title="Podstawowe informacje">
          <View style={s.row}>
            <View style={s.flex1}><ReadOnly label="Imię" value={name} /></View>
            <View style={{ width: 12 }} />
            <View style={s.flex1}><ReadOnly label="Wiek" value={age ? `${age} lat` : ''} /></View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Miasto <Text style={s.star}>*</Text></Text>
            <TextInput
              style={s.input}
              value={citySearch}
              onChangeText={t => { setCitySearch(t); setCity(t); setShowDropdown(t.length > 0); }}
              onFocus={() => setShowDropdown(citySearch.length > 0)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Wpisz miasto..."
              placeholderTextColor={COLORS.textSecondary}
            />
            {showDropdown && cityMatches.length > 0 && (
              <View style={s.dropdown}>
                {cityMatches.map(c => (
                  <TouchableOpacity key={c} style={s.ddItem}
                    onPress={() => { setCity(c); setCitySearch(c); setShowDropdown(false); }}>
                    <Text style={s.ddTxt}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={s.field}>
            <Text style={s.label}>Zawód / uczelnia / branża <Text style={s.opt}>(opcjonalne)</Text></Text>
            <TextInput
              style={s.input}
              value={job}
              onChangeText={setJob}
              placeholder="np. Grafik, AGH, Marketing..."
              placeholderTextColor={COLORS.textSecondary}
            />
          </View>
        </Section>

        {/* ── 3. O MNIE ────────────────────────────────────────────────── */}
        <Section title="O mnie" required>
          <TextInput
            style={[s.input, s.textarea]}
            value={bio}
            onChangeText={t => t.length <= 300 && setBio(t)}
            placeholder="Napisz kilka słów o sobie – co Cię napędza, czego szukasz, co Cię wyróżnia..."
            placeholderTextColor={COLORS.textSecondary}
            multiline
            textAlignVertical="top"
          />
          <Text style={[s.counter, bio.length >= 280 && s.counterWarn]}>{bio.length} / 300</Text>
        </Section>

        {/* ── 4. PYTANIA PROFILOWE ─────────────────────────────────────── */}
        <Section title="Pytania profilowe">
          <Text style={s.hint}>Wybierz 2 pytania z listy i odpowiedz na nie. Dodaj też własne pytanie.</Text>

          {/* Q1 */}
          <TouchableOpacity style={s.qPicker} onPress={() => setQModal(1)}>
            <Text style={q1Id ? s.qPickerOn : s.qPickerOff}>
              {q1Id ? PROFILE_QUESTIONS.find(q => q.id === q1Id)!.text : 'Wybierz pytanie 1 →'}
            </Text>
          </TouchableOpacity>
          {q1Id !== null && (
            <TextInput style={[s.input, s.qAns]} value={q1Ans} onChangeText={setQ1Ans}
              placeholder="Twoja odpowiedź..." placeholderTextColor={COLORS.textSecondary}
              multiline textAlignVertical="top" />
          )}

          {/* Q2 */}
          <TouchableOpacity style={s.qPicker} onPress={() => setQModal(2)}>
            <Text style={q2Id ? s.qPickerOn : s.qPickerOff}>
              {q2Id ? PROFILE_QUESTIONS.find(q => q.id === q2Id)!.text : 'Wybierz pytanie 2 →'}
            </Text>
          </TouchableOpacity>
          {q2Id !== null && (
            <TextInput style={[s.input, s.qAns]} value={q2Ans} onChangeText={setQ2Ans}
              placeholder="Twoja odpowiedź..." placeholderTextColor={COLORS.textSecondary}
              multiline textAlignVertical="top" />
          )}

          {/* Custom question */}
          <View style={s.field}>
            <Text style={s.label}>Własne pytanie <Text style={s.opt}>(opcjonalne)</Text></Text>
            <TextInput style={s.input} value={customQ} onChangeText={setCustomQ}
              placeholder="Wpisz swoje pytanie..." placeholderTextColor={COLORS.textSecondary} />
            {customQ.trim().length > 0 && (
              <TextInput style={[s.input, s.qAns, { marginTop: 8 }]} value={customAns}
                onChangeText={setCustomAns} placeholder="Twoja odpowiedź..."
                placeholderTextColor={COLORS.textSecondary} multiline textAlignVertical="top" />
            )}
          </View>
        </Section>

        {/* ── 5. STATUS ────────────────────────────────────────────────── */}
        <Section title="Status">
          <Text style={s.label}>Stan cywilny</Text>
          <ChipGroup
            options={['Singiel/a', 'Rozwiedziony/a', 'Wdowiec/Wdowa', 'W separacji']}
            selected={marital}
            onSelect={v => setMarital(marital === v ? '' : v)}
          />
          <Text style={[s.label, { marginTop: 14 }]}>Czy masz dzieci?</Text>
          <ChipGroup
            options={['Nie', 'Tak – mieszkają ze mną', 'Tak – nie mieszkają ze mną']}
            selected={children}
            onSelect={v => setChildren(children === v ? '' : v)}
          />
        </Section>

        {/* ── 6. CZEGO SZUKAM ──────────────────────────────────────────── */}
        <Section title="Czego szukam">
          <Text style={s.label}>Zależy mi na</Text>
          <ChipGroup
            options={['Poważnego związku od razu', 'Otwarty/a na poznawanie się']}
            selected={lookingFor}
            onSelect={v => setLookingFor(lookingFor === v ? '' : v)}
          />
          <Text style={[s.label, { marginTop: 14 }]}>Moje tempo</Text>
          <ChipGroup
            options={['Wolę długo pisać zanim się spotkam', 'Wolę szybko umówić się na kawę']}
            selected={pace}
            onSelect={v => setPace(pace === v ? '' : v)}
          />
        </Section>

        {/* ── 7. PREFERENCJE PARTNERA ──────────────────────────────────── */}
        <Section title="Preferencje partnera">

          {/* Age range */}
          <View style={s.prefRow}>
            <Text style={s.label}>Przedział wiekowy</Text>
            <View style={s.ageTag}>
              <Text style={s.ageTxt}>{ageMin} – {ageMax} lat</Text>
            </View>
          </View>
          <Text style={s.sliderLbl}>Od: <Text style={s.sliderVal}>{ageMin}</Text></Text>
          <Slider value={ageMin} min={18} max={ageMax - 1}
            onChange={v => setAgeMin(Math.min(v, ageMax - 1))} />
          <Text style={s.sliderLbl}>Do: <Text style={s.sliderVal}>{ageMax}</Text></Text>
          <Slider value={ageMax} min={ageMin + 1} max={80}
            onChange={v => setAgeMax(Math.max(v, ageMin + 1))} />

          {/* Min compatibility */}
          <View style={[s.prefRow, { marginTop: 18 }]}>
            <Text style={s.label}>Minimalna kompatybilność</Text>
            <View style={s.ageTag}>
              <Text style={s.ageTxt}>{minCompat}%</Text>
            </View>
          </View>
          <Slider value={minCompat} min={0} max={100} onChange={setMinCompat} />

          {/* Location mode */}
          <Text style={[s.label, { marginTop: 18 }]}>Lokalizacja</Text>
          <View style={s.modeRow}>
            {(['range', 'voivodeships'] as const).map(m => (
              <TouchableOpacity
                key={m}
                style={[s.modeBtn, locMode === m && s.modeBtnOn]}
                onPress={() => setLocMode(m)}
              >
                <Text style={[s.modeTxt, locMode === m && s.modeTxtOn]}>
                  {m === 'range' ? 'Zasięg km' : 'Województwa'}
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
                    {km === 200 ? '200+' : `${km}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View>
              <TouchableOpacity
                style={[s.allVoivBtn, voivs.length === VOIVODESHIPS.length && s.allVoivBtnOn]}
                onPress={() => setVoivs(voivs.length === VOIVODESHIPS.length ? [] : [...VOIVODESHIPS])}
              >
                <Text style={[s.allVoivTxt, voivs.length === VOIVODESHIPS.length && s.allVoivTxtOn]}>
                  {voivs.length === VOIVODESHIPS.length ? '✓ Cała Polska zaznaczona' : 'Cała Polska'}
                </Text>
              </TouchableOpacity>
              <View style={s.voivGrid}>
                {VOIVODESHIPS.map(v => {
                  const on = voivs.includes(v);
                  return (
                    <TouchableOpacity key={v} style={[s.voivChip, on && s.voivChipOn]} onPress={() => toggleVoiv(v)}>
                      <Text style={[s.voivTxt, on && s.voivTxtOn]}>{v}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </Section>

        {/* ── SAVE ─────────────────────────────────────────────────────── */}
        <View style={s.saveWrap}>
          <TouchableOpacity
            style={[s.saveBtn, (!canSave || saving) && s.saveBtnOff]}
            onPress={handleSave}
            disabled={!canSave || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.saveTxt}>Zapisz i przejdź do matchów →</Text>
            }
          </TouchableOpacity>
          {!canSave && (
            <Text style={s.saveHint}>
              Aby kontynuować, dodaj zdjęcie, miasto i opis
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  scroll:     { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 48, gap: 0 },

  // Page header
  pageHead:  { marginBottom: 24, gap: 6 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: COLORS.text },
  pageSub:   { fontSize: 15, color: COLORS.textSecondary, lineHeight: 22 },

  // Section
  section:     { marginBottom: 28 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle:{ fontSize: 18, fontWeight: '800', color: COLORS.text },
  reqBadge:    { backgroundColor: COLORS.primaryLight, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  reqText:     { fontSize: 11, fontWeight: '700', color: COLORS.primary, textTransform: 'uppercase', letterSpacing: 0.5 },

  hint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 12, lineHeight: 19 },

  // Photos
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: PHOTO_GAP },
  photoSlot: { borderRadius: 12, overflow: 'hidden' },
  photoImg:  { width: '100%', height: '100%', resizeMode: 'cover' },
  mainBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: COLORS.primary, borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  mainBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '700' },
  rmBtn: {
    position: 'absolute', top: 5, right: 5, width: 24, height: 24,
    borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
  },
  rmBtnTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addSlot: {
    flex: 1, backgroundColor: COLORS.primaryLight,
    justifyContent: 'center', alignItems: 'center', gap: 4,
    borderWidth: 1.5, borderColor: COLORS.primary + '50', borderStyle: 'dashed',
    borderRadius: 12,
  },
  addSlotIcon: { fontSize: 28, color: COLORS.primary, fontWeight: '300' },
  addSlotLbl:  { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  emptySlot: {
    flex: 1, backgroundColor: COLORS.border + '40',
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, borderStyle: 'dashed',
  },

  // Fields
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 6 },
  star:  { color: COLORS.primary },
  opt:   { color: COLORS.textSecondary, fontWeight: '400' },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textarea: { minHeight: 110, paddingTop: 13, lineHeight: 22 },
  counter:  { fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginTop: 5 },
  counterWarn: { color: COLORS.primary },

  // Read-only
  roInput: {
    backgroundColor: COLORS.border + '30', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  roText: { fontSize: 15, color: COLORS.text, fontWeight: '500' },
  roHint: { fontSize: 11, color: COLORS.textSecondary },

  row:   { flexDirection: 'row', marginBottom: 14 },
  flex1: { flex: 1 },

  // Dropdown
  dropdown: {
    backgroundColor: COLORS.surface, borderRadius: 12, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 4, zIndex: 99,
  },
  ddItem: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  ddTxt:  { fontSize: 15, color: COLORS.text },

  // Profile questions
  qPicker: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, borderWidth: 1.5, borderColor: COLORS.primary + '60',
    borderStyle: 'dashed', marginBottom: 8,
  },
  qPickerOn:  { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  qPickerOff: { fontSize: 14, color: COLORS.primary },
  qAns: { minHeight: 72, paddingTop: 12, lineHeight: 21, marginBottom: 14 },

  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  chipOn:    { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipTxt:   { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  chipTxtOn: { color: COLORS.primary, fontWeight: '700' },

  // Sliders
  prefRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ageTag:    { backgroundColor: COLORS.primaryLight, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5 },
  ageTxt:    { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  sliderLbl: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 2 },
  sliderVal: { color: COLORS.primary, fontWeight: '700' },

  // Location mode
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 14, marginTop: 6 },
  modeBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: 'center',
  },
  modeBtnOn:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  modeTxt:    { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modeTxtOn:  { color: COLORS.primary },

  // KM buttons
  kmRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  kmBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  kmBtnOn:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  kmTxt:    { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  kmTxtOn:  { color: COLORS.primary },

  // Voivodeships
  allVoivBtn: {
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 12, backgroundColor: COLORS.surface,
  },
  allVoivBtnOn: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  allVoivTxt:   { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  allVoivTxtOn: { color: COLORS.primary },
  voivGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  voivChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1.5, borderColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  voivChipOn:  { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  voivTxt:    { fontSize: 12, fontWeight: '500', color: COLORS.textSecondary, textTransform: 'capitalize' },
  voivTxtOn:  { color: COLORS.primary, fontWeight: '700' },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingBottom: 36, paddingTop: 12, gap: 0,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border,
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  sheetOpt: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  sheetOptTxt: { fontSize: 15, color: COLORS.text },

  // Save
  saveWrap: { marginTop: 8, gap: 12 },
  saveBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 17,
    borderRadius: 14, alignItems: 'center',
  },
  saveBtnOff: { opacity: 0.45 },
  saveTxt:    { color: '#fff', fontSize: 17, fontWeight: '700' },
  saveHint:   { textAlign: 'center', fontSize: 13, color: COLORS.textSecondary },
});
