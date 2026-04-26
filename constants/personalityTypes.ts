export interface PersonalityType {
  code: string;
  name: string;
  emoji: string;
  desc: string;
  traits: [string, string, string];
}

export const PERSONALITY_TYPES: Record<string, PersonalityType> = {
  INTJ: {
    code: 'INTJ', name: 'Architekt', emoji: '🧭',
    desc: 'Widzisz wzorce tam, gdzie inni widzą chaos. Twoja niezależność myślenia i strategiczne podejście do życia sprawiają, że jesteś wyjątkowym partnerem dla kogoś, kto ceni głębię i intelektualną bliskość.',
    traits: ['Strategiczny', 'Niezależny', 'Zdecydowany'],
  },
  INTP: {
    code: 'INTP', name: 'Logik', emoji: '🔬',
    desc: 'Twój umysł nieustannie szuka odpowiedzi na pytania, które inni nawet nie zadają. Cenisz wolność myślenia i szukasz partnera, z którym możesz eksplorować idee bez końca.',
    traits: ['Analityczny', 'Kreatywny', 'Obiektywny'],
  },
  ENTJ: {
    code: 'ENTJ', name: 'Dowódca', emoji: '⚡',
    desc: 'Naturalny lider z wizją i energią do jej realizacji. W związku szukasz kogoś równie ambitnego, kto nie boi się wyzwań i podziela Twój pęd do rozwoju.',
    traits: ['Przywódczy', 'Ambitny', 'Pewny siebie'],
  },
  ENTP: {
    code: 'ENTP', name: 'Dyskutant', emoji: '💡',
    desc: 'Twój umysł działa jak generator idei – szybki, kreatywny, zawsze gotowy na nową perspektywę. Najlepiej czujesz się z kimś, kto nie boi się intelektualnych sparingów.',
    traits: ['Innowacyjny', 'Elokwentny', 'Ciekawski'],
  },
  INFJ: {
    code: 'INFJ', name: 'Adwokat', emoji: '🌙',
    desc: 'Rzadki typ – jednocześnie marzyciel i realista z wyjątkową głębią emocjonalną. Twoje relacje są zawsze autentyczne i znaczące, bo nie akceptujesz powierzchowności.',
    traits: ['Empatyczny', 'Idealistyczny', 'Wnikliwy'],
  },
  INFP: {
    code: 'INFP', name: 'Mediator', emoji: '🌿',
    desc: 'Idealista z bogatym wewnętrznym światem i ogromną empatią. Szukasz połączenia na poziomie wartości – kogoś, z kim możesz być w pełni sobą.',
    traits: ['Wrażliwy', 'Autentyczny', 'Twórczy'],
  },
  ENFJ: {
    code: 'ENFJ', name: 'Protagonista', emoji: '🌟',
    desc: 'Charyzmatyczny i empatyczny – inspirujesz innych samą swoją obecnością. Twoje relacje opierają się na wzajemnym wzroście i naprawdę głębokim zrozumieniu.',
    traits: ['Empatyczny', 'Charyzmatyczny', 'Altruistyczny'],
  },
  ENFP: {
    code: 'ENFP', name: 'Działacz', emoji: '🎨',
    desc: 'Entuzjastyczny wolny duch, który widzi potencjał w każdej osobie. Twoja autentyczność i energia przyciągają – w związku szukasz prawdziwej iskry i wzajemnego inspirowania.',
    traits: ['Entuzjastyczny', 'Spontaniczny', 'Empatyczny'],
  },
  ISTJ: {
    code: 'ISTJ', name: 'Logistyk', emoji: '🏛️',
    desc: 'Niezawodny i odpowiedzialny – gdy coś obiecujesz, dotrzymujesz słowa. W związku jesteś filarem stabilności i lojalności, na którym można zawsze polegać.',
    traits: ['Rzetelny', 'Lojalny', 'Systematyczny'],
  },
  ISFJ: {
    code: 'ISFJ', name: 'Opiekun', emoji: '🤍',
    desc: 'Ciepły i troskliwy, zawsze pamiętasz o tym, co ważne dla bliskich. Twoja miłość wyraża się w małych, codziennych gestach, które budują prawdziwe bezpieczeństwo.',
    traits: ['Opiekuńczy', 'Cierpliwy', 'Oddany'],
  },
  ESTJ: {
    code: 'ESTJ', name: 'Organizator', emoji: '📋',
    desc: 'Zorganizowany i bezpośredni – wiesz czego chcesz i jak to osiągnąć. W związku cenisz jasne zasady, wzajemny szacunek i wspólne budowanie stabilnej przyszłości.',
    traits: ['Zorganizowany', 'Bezpośredni', 'Odpowiedzialny'],
  },
  ESFJ: {
    code: 'ESFJ', name: 'Konsul', emoji: '🧡',
    desc: 'Twoje serce jest otwarte dla innych i czerpiesz energię z budowania harmonii wokół siebie. Relacje są dla Ciebie najważniejsze – dajesz z siebie wszystko tym, których kochasz.',
    traits: ['Towarzyski', 'Troskliwy', 'Lojalny'],
  },
  ISTP: {
    code: 'ISTP', name: 'Wirtuoz', emoji: '🔧',
    desc: 'Spokojny obserwator, który działa gdy trzeba – z precyzją i spokojem. Cenisz niezależność i szukasz partnera, który rozumie Twoją potrzebę przestrzeni.',
    traits: ['Praktyczny', 'Niezależny', 'Spokojny'],
  },
  ISFP: {
    code: 'ISFP', name: 'Poszukiwacz', emoji: '🎭',
    desc: 'Wrażliwy artysta żyjący chwilą, który zauważa piękno tam, gdzie inni go nie widzą. Twoja spontaniczność i autentyczność sprawiają, że każda chwila z Tobą jest wyjątkowa.',
    traits: ['Autentyczny', 'Wrażliwy', 'Kreatywny'],
  },
  ESTP: {
    code: 'ESTP', name: 'Przedsiębiorca', emoji: '🚀',
    desc: 'Energia, charyzma i zamiłowanie do działania – życie z Tobą to nieustanna przygoda. Szukasz kogoś, kto nadąży za Twoim tempem i podziela zamiłowanie do intensywnego życia.',
    traits: ['Energiczny', 'Charyzmatyczny', 'Odważny'],
  },
  ESFP: {
    code: 'ESFP', name: 'Showman', emoji: '🎉',
    desc: 'Spontaniczny i pełen życia – gdzie jesteś, tam zawsze coś się dzieje. Szukasz kogoś, kto podziela Twój entuzjazm do życia i nie boi się tańczyć w deszczu.',
    traits: ['Spontaniczny', 'Towarzyski', 'Zabawny'],
  },
};

export function getPersonalityType(code: string): PersonalityType {
  return PERSONALITY_TYPES[code] ?? PERSONALITY_TYPES['INFP'];
}
