export type TraitKey =
  | 'extraversion'
  | 'openness'
  | 'conscientiousness'
  | 'agreeableness'
  | 'neuroticism'
  | 'secure'
  | 'anxious'
  | 'avoidant';

export type Answer = 'A' | 'B' | 'C' | 'D';
export type TraitScores = Record<TraitKey, number>;
export type Weights = Partial<TraitScores>;

export interface Option {
  key: Answer;
  label: string;
  weights?: Weights;
}

export interface Question {
  id: number;
  blockId: number;
  text: string;
  options: Option[];
  directMatch?: boolean;
}

export const BLOCKS = [
  { id: 1, title: 'Kim jesteś?',   subtitle: 'Osobowość',     firstQ: 3  },
  { id: 2, title: 'Co cenisz?',    subtitle: 'Wartości',      firstQ: 9  },
  { id: 3, title: 'Jak kochasz?',  subtitle: 'Styl związku',  firstQ: 16 },
  { id: 4, title: 'Twoje życie',   subtitle: 'Styl życia',    firstQ: 24 },
] as const;

// Kept questions: P3 P4 P5 P6 P7 P8 | P9 P10 | P16 P17 P19 P20 | P24 P26 P27 P30
export const QUESTIONS: Question[] = [
  // ─── Blok 1 – Kim jesteś? ───────────────────────────────────────────
  {
    id: 3, blockId: 1,
    text: 'W nowym miejscu pracy/grupie jesteś zazwyczaj:',
    options: [
      { key: 'A', label: 'Jednym z pierwszych którzy inicjują rozmowy', weights: { extraversion: 2 } },
      { key: 'B', label: 'Czekam aż ktoś podejdzie, ale chętnie rozmawiam', weights: { extraversion: 1 } },
      { key: 'C', label: 'Obserwuję zanim się otworzę', weights: { extraversion: -1 } },
      { key: 'D', label: 'Wolę pracować sam/a niż w grupie', weights: { extraversion: -2 } },
    ],
  },
  {
    id: 4, blockId: 1,
    text: 'Jak planujesz wakacje?',
    options: [
      { key: 'A', label: 'Wszystko zarezerwowane z wyprzedzeniem', weights: { conscientiousness: 2 } },
      { key: 'B', label: 'Ogólny plan, szczegóły na miejscu', weights: { conscientiousness: 1 } },
      { key: 'C', label: 'Bilet w jedną stronę i zobaczymy', weights: { openness: 2, extraversion: 1 } },
      { key: 'D', label: 'Najchętniej sprawdzone miejsce gdzie byłem/am', weights: { conscientiousness: 2, openness: -1 } },
    ],
  },
  {
    id: 5, blockId: 1,
    text: 'Kiedy masz dużo na głowie:',
    options: [
      { key: 'A', label: 'Tworzę listę i działam punkt po punkcie', weights: { conscientiousness: 2 } },
      { key: 'B', label: 'Rozmawiam z kimś bliskim', weights: { agreeableness: 1, extraversion: 1 } },
      { key: 'C', label: 'Potrzebuję czasu sam/a żeby poukładać myśli', weights: { extraversion: -2 } },
      { key: 'D', label: 'Działam intuicyjnie, jakoś wychodzi', weights: { openness: 1, conscientiousness: -1 } },
    ],
  },
  {
    id: 6, blockId: 1,
    text: 'Jak reagujesz na krytykę?',
    options: [
      { key: 'A', label: 'Analizuję czy jest słuszna i wyciągam wnioski', weights: { conscientiousness: 2, openness: 1 } },
      { key: 'B', label: 'Trochę boli, ale staram się zrozumieć', weights: { neuroticism: 1, agreeableness: 1 } },
      { key: 'C', label: 'Bronię swojego zdania jeśli jestem pewny/a racji', weights: { conscientiousness: 1 } },
      { key: 'D', label: 'Przeżywam to długo', weights: { neuroticism: 2 } },
    ],
  },
  {
    id: 7, blockId: 1,
    text: 'Twój styl podejmowania decyzji:',
    options: [
      { key: 'A', label: 'Analizuję wszystkie opcje przed wyborem', weights: { conscientiousness: 2 } },
      { key: 'B', label: 'Słucham intuicji', weights: { openness: 2 } },
      { key: 'C', label: 'Pytam innych o zdanie', weights: { agreeableness: 2 } },
      { key: 'D', label: 'Decyduję szybko i nie wracam do tematu', weights: { extraversion: 1 } },
    ],
  },
  {
    id: 8, blockId: 1,
    text: 'Jak opisałbyś/opisałabyś swoje podejście do życia?',
    options: [
      { key: 'A', label: 'Mam konkretne cele i dążę do nich', weights: { conscientiousness: 2 } },
      { key: 'B', label: 'Staram się być obecny/a tu i teraz', weights: { openness: 2 } },
      { key: 'C', label: 'Adaptuję się do sytuacji', weights: { agreeableness: 1 } },
      { key: 'D', label: 'Szukam sensu i głębszego znaczenia', weights: { openness: 2, extraversion: -1 } },
    ],
  },

  // ─── Blok 2 – Co cenisz? ────────────────────────────────────────────
  {
    id: 9, blockId: 2, directMatch: true,
    text: 'Czy chcesz mieć dzieci?',
    options: [
      { key: 'A', label: 'Tak, to dla mnie ważne' },
      { key: 'B', label: 'Nie, nie planuję' },
      { key: 'C', label: 'Jestem otwarty/a, zależy od partnera' },
      { key: 'D', label: 'Mam już dzieci' },
    ],
  },
  {
    id: 10, blockId: 2, directMatch: true,
    text: 'Rola religii lub duchowości w Twoim życiu:',
    options: [
      { key: 'A', label: 'Wiara jest ważną częścią mojego życia' },
      { key: 'B', label: 'Jestem osobą duchową ale niekoniecznie religijną' },
      { key: 'C', label: 'Szanuję religię ale sam/a nie praktykuję' },
      { key: 'D', label: 'Jestem ateistą/ateistką, religia mnie nie dotyczy' },
    ],
  },

  // ─── Blok 3 – Jak kochasz? ──────────────────────────────────────────
  {
    id: 16, blockId: 3,
    text: 'W związku najbardziej potrzebujesz:',
    options: [
      { key: 'A', label: 'Bliskości emocjonalnej i głębokich rozmów', weights: { secure: 1, anxious: 1 } },
      { key: 'B', label: 'Przestrzeni i wzajemnego szanowania niezależności', weights: { avoidant: 2 } },
      { key: 'C', label: 'Wspólnych przygód i aktywności', weights: { extraversion: 1, secure: 1 } },
      { key: 'D', label: 'Stabilności i poczucia bezpieczeństwa', weights: { secure: 2 } },
    ],
  },
  {
    id: 17, blockId: 3,
    text: 'Partner/ka nie odpisuje przez kilka godzin. Reagujesz:',
    options: [
      { key: 'A', label: 'Zakładam że jest zajęty/a, czekam spokojnie', weights: { secure: 2 } },
      { key: 'B', label: 'Trochę się zastanawiam ale nie przejmuję', weights: { secure: 1 } },
      { key: 'C', label: 'Zaczynam się martwić czy wszystko OK', weights: { anxious: 1 } },
      { key: 'D', label: 'Czuję się ignorowany/a i jest mi przykro', weights: { anxious: 2 } },
    ],
  },
  {
    id: 19, blockId: 3, directMatch: true,
    text: 'Jak okazujesz miłość najczęściej?',
    options: [
      { key: 'A', label: 'Słowami – mówię co czuję i doceniam' },
      { key: 'B', label: 'Czasem – jestem obecny/a i daję uwagę' },
      { key: 'C', label: 'Pomocą – robię rzeczy dla partnera/ki' },
      { key: 'D', label: 'Dotykiem – przytulam, trzymam za rękę' },
    ],
  },
  {
    id: 20, blockId: 3,
    text: 'Ile czasu chcesz spędzać razem vs osobno?',
    options: [
      { key: 'A', label: 'Większość czasu razem, lubimy być blisko', weights: { anxious: 1, secure: 1 } },
      { key: 'B', label: 'Balans – razem i osobno w równych proporcjach', weights: { secure: 2 } },
      { key: 'C', label: 'Dużo niezależności, ale jakościowy wspólny czas', weights: { avoidant: 2 } },
      { key: 'D', label: 'Zależy od okresu i nastroju, elastycznie', weights: { secure: 1 } },
    ],
  },

  // ─── Blok 4 – Twoje życie ────────────────────────────────────────────
  {
    id: 24, blockId: 4, directMatch: true,
    text: 'Twoja aktywność fizyczna:',
    options: [
      { key: 'A', label: 'Regularnie ćwiczę, sport to część mojego życia' },
      { key: 'B', label: 'Ruszam się gdy mam ochotę, bez presji' },
      { key: 'C', label: 'Preferuję spokojne aktywności – spacery, joga' },
      { key: 'D', label: 'Niespecjalnie – wolę inne formy relaksu' },
    ],
  },
  {
    id: 26, blockId: 4, directMatch: true,
    text: 'Twój rytm dnia:',
    options: [
      { key: 'A', label: 'Ranna ptaszka – wstaję wcześnie, wieczorem już opadam' },
      { key: 'B', label: 'Nocny marek – rozkręcam się wieczorem' },
      { key: 'C', label: 'Elastyczny – zależy od dnia' },
      { key: 'D', label: 'Stały rytm – lubię regularność' },
    ],
  },
  {
    id: 27, blockId: 4, directMatch: true,
    text: 'Alkohol i imprezy w Twoim życiu:',
    options: [
      { key: 'A', label: 'Lubię wychodzić i bawić się' },
      { key: 'B', label: 'Od czasu do czasu, bez przesady' },
      { key: 'C', label: 'Rzadko – wolę spokojniejsze formy spędzania czasu' },
      { key: 'D', label: 'Nie piję i unikam imprez' },
    ],
  },
  {
    id: 30, blockId: 4, directMatch: true,
    text: 'Gdzie najlepiej Ci się żyje:',
    options: [
      { key: 'A', label: 'W dużym mieście – lubię tempo i możliwości' },
      { key: 'B', label: 'W średnim mieście – balans między życiem a spokojem' },
      { key: 'C', label: 'Na przedmieściach lub małym mieście – cisza i natura' },
      { key: 'D', label: 'Marzę o życiu za granicą lub gdzieś zupełnie innym' },
    ],
  },
];
