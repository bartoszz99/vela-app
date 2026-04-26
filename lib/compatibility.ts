import { QUESTIONS, Answer, TraitKey, TraitScores } from '@/constants/psychologyQuestions';

// ─── Legacy exports (used by psychology-test.tsx) ─────────────────────────────

export function derivePersonalityType(scores: TraitScores): string {
  const e = scores.extraversion >= 0 ? 'E' : 'I';
  const n = scores.openness >= scores.conscientiousness ? 'N' : 'S';
  const f = scores.agreeableness >= scores.conscientiousness ? 'F' : 'T';
  const p = scores.conscientiousness < 2 ? 'P' : 'J';
  return `${e}${n}${f}${p}`;
}

export function calcTraitScores(answers: Record<number, Answer>): TraitScores {
  const scores: TraitScores = {
    extraversion: 0, openness: 0, conscientiousness: 0,
    agreeableness: 0, neuroticism: 0, secure: 0, anxious: 0, avoidant: 0,
  };
  for (const q of QUESTIONS) {
    if (q.directMatch) continue;
    const answer = answers[q.id];
    if (!answer) continue;
    const option = q.options.find((o) => o.key === answer);
    if (!option?.weights) continue;
    for (const [trait, weight] of Object.entries(option.weights) as [TraitKey, number][]) {
      scores[trait] += weight;
    }
  }
  return scores;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BigFive {
  extraversion: number;       // 0–10
  conscientiousness: number;  // 0–10
  openness: number;           // 0–10
  agreeableness: number;      // 0–10
  neuroticism: number;        // 0–10
}

export interface AttachmentScores {
  secure: number;   // 0–10
  anxious: number;  // 0–10
  avoidant: number; // 0–10
}

export interface UserCompatibilityProfile {
  bigFive: BigFive;
  attachment: AttachmentScores;
  values: {
    children: 'yes' | 'no' | 'open';
    religion: number;           // 1–4
    lifestyle_keywords: string[];
  };
  needs: {
    intimacy_need: number;     // 1–10
    independence_need: number; // 1–10
  };
  dealbreakers: string[];
  vision: string;
  lifestyle: {
    activity: number; // 1–4
    rhythm: number;   // 1–4  (early bird vs night owl)
    alcohol: number;  // 1–4
  };
}

export interface CompatibilityResult {
  total: number;
  breakdown: {
    wartości: number;
    przywiązanie: number;
    osobowość: number;
    potrzeby: number;
    wizja: number;
  };
  insights: string[];
}

// ─── DB → UserCompatibilityProfile mapper ────────────────────────────────────

export function mapToCompatibilityProfile(
  rawScores: Record<string, unknown>,
  answers: Record<number, string>,
): UserCompatibilityProfile {
  const num = (key: string, fallback = 0): number =>
    typeof rawScores[key] === 'number' ? (rawScores[key] as number) : fallback;
  const arr = (key: string): string[] =>
    Array.isArray(rawScores[key]) ? (rawScores[key] as string[]) : [];
  const str = (key: string): string =>
    typeof rawScores[key] === 'string' ? (rawScores[key] as string) : '';

  // Normalize raw cumulative sums (from calcTraitScores) to 0–10
  const norm = (val: number, min: number, max: number) =>
    Math.max(0, Math.min(10, ((val - min) / (max - min)) * 10));

  const bigFive: BigFive = {
    extraversion:      norm(num('extraversion'),       -5, 8),
    conscientiousness: norm(num('conscientiousness'),   0, 12),
    openness:          norm(num('openness'),            0, 8),
    agreeableness:     norm(num('agreeableness'),       0, 8),
    neuroticism:       norm(num('neuroticism'),         0, 6),
  };

  const attachment: AttachmentScores = {
    secure:   norm(num('secure'),   0, 8),
    anxious:  norm(num('anxious'),  0, 4),
    avoidant: norm(num('avoidant'), 0, 4),
  };

  // Q9: children
  const q9 = answers[9];
  const children: 'yes' | 'no' | 'open' =
    q9 === 'A' || q9 === 'D' ? 'yes' : q9 === 'B' ? 'no' : 'open';

  // Q10: religion 1-4 (A=most devout, D=atheist)
  const q10 = answers[10];
  const religion = q10 === 'A' ? 1 : q10 === 'B' ? 2 : q10 === 'C' ? 3 : 4;

  // Q24: physical activity 1-4 (A=most, D=least)
  const q24 = answers[24];
  const activity = q24 === 'A' ? 4 : q24 === 'B' ? 3 : q24 === 'C' ? 2 : 1;

  // Q26: day rhythm 1-4 (A=morning, B=night, C=flexible, D=regular)
  const q26 = answers[26];
  const rhythm = q26 === 'A' ? 1 : q26 === 'B' ? 4 : q26 === 'C' ? 2 : 3;

  // Q27: alcohol 1-4 (A=most, D=none)
  const q27 = answers[27];
  const alcohol = q27 === 'A' ? 4 : q27 === 'B' ? 3 : q27 === 'C' ? 2 : 1;

  return {
    bigFive,
    attachment,
    values: {
      children,
      religion,
      lifestyle_keywords: arr('lifestyle_keywords'),
    },
    needs: {
      intimacy_need:     Math.max(1, Math.min(10, num('intimacy_need', 5))),
      independence_need: Math.max(1, Math.min(10, num('independence_need', 5))),
    },
    dealbreakers: arr('dealbreakers'),
    vision:       str('vision'),
    lifestyle:    { activity, rhythm, alcohol },
  };
}

// ─── Layer 2: Dealbreaker check ───────────────────────────────────────────────

interface DealbreakerResult {
  blocking: boolean;
  softPenalty: number;
  hasDealbreaker: boolean;
}

function checkDealbreakers(a: UserCompatibilityProfile, b: UserCompatibilityProfile): DealbreakerResult {
  if (
    (a.values.children === 'yes' && b.values.children === 'no') ||
    (a.values.children === 'no' && b.values.children === 'yes')
  ) {
    return { blocking: true, softPenalty: 0, hasDealbreaker: true };
  }

  let softPenalty = 0;

  const religionDiff = Math.abs(a.values.religion - b.values.religion);
  if (religionDiff >= 3) softPenalty += 0.3;
  else if (religionDiff === 2) softPenalty += 0.15;

  const kwA = (a.values.lifestyle_keywords ?? []).map(k => k.toLowerCase());
  const kwB = (b.values.lifestyle_keywords ?? []).map(k => k.toLowerCase());
  const dbA = (a.dealbreakers ?? []).map(d => d.toLowerCase());
  const dbB = (b.dealbreakers ?? []).map(d => d.toLowerCase());

  let hits = 0;
  for (const db of dbA) {
    if (kwB.some(k => k.includes(db) || db.includes(k))) hits++;
  }
  for (const db of dbB) {
    if (kwA.some(k => k.includes(db) || db.includes(k))) hits++;
  }

  softPenalty += Math.min(0.3, hits * 0.1);
  return { blocking: false, softPenalty, hasDealbreaker: hits > 0 };
}

// ─── Layer 3: Attachment matrix (25%) ────────────────────────────────────────

type AttachmentType = 'secure' | 'anxious' | 'avoidant';

function dominantAttachment(a: AttachmentScores): AttachmentType {
  if (a.secure >= a.anxious && a.secure >= a.avoidant) return 'secure';
  if (a.anxious >= a.avoidant) return 'anxious';
  return 'avoidant';
}

const ATTACHMENT_MATRIX: Record<AttachmentType, Record<AttachmentType, number>> = {
  secure:   { secure: 1.00, anxious: 0.75, avoidant: 0.70 },
  anxious:  { secure: 0.75, anxious: 0.40, avoidant: 0.15 },
  avoidant: { secure: 0.70, anxious: 0.15, avoidant: 0.50 },
};

function calcAttachmentScore(a: UserCompatibilityProfile, b: UserCompatibilityProfile): number {
  return ATTACHMENT_MATRIX[dominantAttachment(a.attachment)][dominantAttachment(b.attachment)];
}

// ─── Layer 4: Values & lifestyle similarity (35%) ────────────────────────────

function calcValuesLifestyleScore(a: UserCompatibilityProfile, b: UserCompatibilityProfile): number {
  const sim = (vA: number, vB: number, maxDiff: number) =>
    1 - Math.abs(vA - vB) / maxDiff;

  const conscientiousness = sim(a.bigFive.conscientiousness, b.bigFive.conscientiousness, 10);
  const neuroticism       = sim(a.bigFive.neuroticism,       b.bigFive.neuroticism,       10);
  const activity          = sim(a.lifestyle.activity,        b.lifestyle.activity,        3);
  const rhythm            = sim(a.lifestyle.rhythm,          b.lifestyle.rhythm,          3);
  const alcohol           = sim(a.lifestyle.alcohol,         b.lifestyle.alcohol,         3);

  // Weighted: conscientiousness×2, neuroticism×1.5, rest×1 → total 6.5
  return (conscientiousness * 2 + neuroticism * 1.5 + activity + rhythm + alcohol) / 6.5;
}

// ─── Layer 5: Personality cosine similarity (15%) ────────────────────────────

function cosineSimilarity(a: number[], b: number[]): number {
  const dot  = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0.5;
  return (dot / (magA * magB) + 1) / 2; // [-1,1] → [0,1]
}

// Extraversion complementarity: slight difference (2-3 pts) is optimal
function extravertScore(a: number, b: number): number {
  const diff = Math.abs(a - b);
  if (diff <= 2.5) return 0.7 + (diff / 2.5) * 0.3;          // 0.7→1.0
  return Math.max(0.3, 1.0 - ((diff - 2.5) / 7.5) * 0.7);   // 1.0→0.3
}

function calcPersonalityScore(a: UserCompatibilityProfile, b: UserCompatibilityProfile): number {
  const extra = extravertScore(a.bigFive.extraversion, b.bigFive.extraversion);

  const restA = [a.bigFive.conscientiousness, a.bigFive.openness, a.bigFive.agreeableness, a.bigFive.neuroticism];
  const restB = [b.bigFive.conscientiousness, b.bigFive.openness, b.bigFive.agreeableness, b.bigFive.neuroticism];
  const cosine = cosineSimilarity(restA, restB);

  // Extraversion weight 0.5, rest (4 traits) weight 1.0 each → total 4.5
  return (extra * 0.5 + cosine * 4) / 4.5;
}

// ─── Layer 6: Needs compatibility (10%) ──────────────────────────────────────

function calcNeedsScore(a: UserCompatibilityProfile, b: UserCompatibilityProfile): number {
  const intimacyScore     = 1 - Math.abs(a.needs.intimacy_need - b.needs.intimacy_need) / 9;
  const independenceScore = 1 - Math.abs(a.needs.independence_need - b.needs.independence_need) / 9;

  let conflictPenalty = 0;
  if (a.needs.intimacy_need > 7 && b.needs.independence_need > 7) conflictPenalty = 0.2;
  if (b.needs.intimacy_need > 7 && a.needs.independence_need > 7) conflictPenalty = 0.2;

  return Math.max(0, (intimacyScore + independenceScore) / 2 - conflictPenalty);
}

// ─── Layer 7: Vision / semantic score (15%) ──────────────────────────────────

const SYNONYM_GROUPS: string[][] = [
  ['miłość', 'uczucie', 'zakochanie'],
  ['rodzina', 'dzieci', 'dom'],
  ['przygoda', 'podróże', 'eksploracja'],
  ['spokój', 'stabilność', 'bezpieczeństwo'],
  ['seks', 'intymność', 'bliskość fizyczna'],
  ['równość', 'partnerstwo', 'równoprawność'],
  ['sport', 'aktywność', 'fitness'],
];

const STOP_WORDS = new Set([
  'i', 'w', 'z', 'na', 'do', 'się', 'że', 'to', 'nie', 'jak',
  'co', 'ale', 'a', 'o', 'po', 'ze', 'też', 'jest', 'ja', 'ty',
  'my', 'ten', 'ta', 'te', 'już', 'by', 'czy', 'go', 'mu', 'jej',
]);

function synonymGroup(word: string): number {
  const lower = word.toLowerCase();
  return SYNONYM_GROUPS.findIndex(g => g.includes(lower));
}

function calcVisionScore(a: UserCompatibilityProfile, b: UserCompatibilityProfile): number {
  const kwA = (a.values.lifestyle_keywords ?? []).map(k => k.toLowerCase());
  const kwB = (b.values.lifestyle_keywords ?? []).map(k => k.toLowerCase());

  let kwScore = 0;
  const matchedB = new Set<number>();
  for (const kA of kwA) {
    for (let i = 0; i < kwB.length; i++) {
      if (matchedB.has(i)) continue;
      const kB = kwB[i];
      const exact = kA === kB;
      const gA = synonymGroup(kA);
      const sameSynonym = gA !== -1 && gA === synonymGroup(kB);
      if (exact || sameSynonym) {
        kwScore += 0.15;
        matchedB.add(i);
        break;
      }
    }
  }

  // Vision text overlap (stop-words removed)
  const tokenize = (text: string) =>
    text.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));

  const wordsA = tokenize(a.vision ?? '');
  const wordsB = tokenize(b.vision ?? '');
  const setB   = new Set(wordsB);
  const common = wordsA.filter(w => setB.has(w)).length;
  const visionOverlap = wordsA.length + wordsB.length > 0
    ? (common * 2) / (wordsA.length + wordsB.length)
    : 0;

  // Keywords 70% + vision text 30%
  return Math.min(1.0, Math.min(1.0, kwScore) * 0.7 + visionOverlap * 0.3);
}

// ─── Layer 9: Insights ────────────────────────────────────────────────────────

function generateInsights(
  a: UserCompatibilityProfile,
  b: UserCompatibilityProfile,
  s: {
    attachmentScore: number;
    valuesScore: number;
    visionScore: number;
    hasDealbreaker: boolean;
  },
): string[] {
  const out: string[] = [];

  if (s.attachmentScore >= 0.8) {
    out.push('compatibility.insights.attachmentGood');
  } else if (s.attachmentScore <= 0.3) {
    out.push('compatibility.insights.attachmentBad');
  }

  const intimacyDiff = Math.abs(a.needs.intimacy_need - b.needs.intimacy_need);
  if (intimacyDiff > 4) {
    out.push('compatibility.insights.intimacyDiff');
  }

  const conscientiousnessDiff = Math.abs(a.bigFive.conscientiousness - b.bigFive.conscientiousness);
  if (conscientiousnessDiff < 1) {
    out.push('compatibility.insights.orgSimilar');
  }

  if (s.hasDealbreaker) {
    out.push('compatibility.insights.dealbreaker');
  }

  if (s.visionScore > 0.6) {
    out.push('compatibility.insights.visionGood');
  }

  if (s.valuesScore > 0.8) {
    out.push('compatibility.insights.valuesGood');
  }

  const neuroDiff = Math.abs(a.bigFive.neuroticism - b.bigFive.neuroticism);
  if (neuroDiff < 1.5) {
    out.push('compatibility.insights.neuroSimilar');
  }

  return out.slice(0, 3);
}

// ─── Layer 8: Final aggregation ──────────────────────────────────────────────

export function calculateCompatibility(
  a: UserCompatibilityProfile,
  b: UserCompatibilityProfile,
): CompatibilityResult {
  const { blocking, softPenalty, hasDealbreaker } = checkDealbreakers(a, b);

  if (blocking) {
    return {
      total: 0,
      breakdown: { wartości: 0, przywiązanie: 0, osobowość: 0, potrzeby: 0, wizja: 0 },
      insights: ['compatibility.insights.childrenBlock'],
    };
  }

  const attachmentScore  = calcAttachmentScore(a, b);
  const valuesScore      = calcValuesLifestyleScore(a, b);
  const personalityScore = calcPersonalityScore(a, b);
  const needsScore       = calcNeedsScore(a, b);
  const visionScore      = calcVisionScore(a, b);

  const raw =
    attachmentScore  * 0.25 +
    valuesScore      * 0.35 +
    personalityScore * 0.15 +
    needsScore       * 0.10 +
    visionScore      * 0.15;

  const total = Math.round(Math.max(0, Math.min(100, (raw - softPenalty) * 100)));

  const insights = generateInsights(a, b, { attachmentScore, valuesScore, visionScore, hasDealbreaker });

  return {
    total,
    breakdown: {
      wartości:     Math.round(valuesScore      * 100),
      przywiązanie: Math.round(attachmentScore  * 100),
      osobowość:    Math.round(personalityScore * 100),
      potrzeby:     Math.round(needsScore       * 100),
      wizja:        Math.round(visionScore      * 100),
    },
    insights,
  };
}
