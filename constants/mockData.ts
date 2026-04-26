import { CompatibilityResult } from '@/lib/compatibility';

export interface Profile {
  id: string;
  name: string;
  age: number;
  city: string;
  emoji: string;
  bio: string;
  matchPercent: number;
  compatibility: CompatibilityResult;
  interests: string[];
  personalityType: string;
  personalityDesc: string;
}

export const MOCK_PROFILES: Profile[] = [
  {
    id: '1',
    name: 'Zofia',
    age: 26,
    city: 'Kraków',
    emoji: '👩‍🎨',
    bio: 'Graficzka z duszą podróżniczki. Uwielbiam weekendy w górach i wieczory przy dobrej książce. Szukam kogoś z pasją i poczuciem humoru.',
    matchPercent: 92,
    compatibility: {
      total: 92,
      breakdown: { wartości: 95, przywiązanie: 88, osobowość: 91, potrzeby: 86, wizja: 94 },
      insights: [
        'Macie bardzo podobny styl przywiązania – to fundament trwałego związku.',
        'Wasze wartości i styl życia są bardzo zbieżne.',
        'Macie podobną wizję idealnego związku.',
      ],
    },
    interests: ['🎨 Sztuka', '🏔️ Góry', '📚 Książki', '☕ Kawa'],
    personalityType: 'INFJ',
    personalityDesc: 'Adwokat – kreatywny idealista z silnymi przekonaniami',
  },
  {
    id: '2',
    name: 'Marta',
    age: 24,
    city: 'Wrocław',
    emoji: '👩‍💻',
    bio: 'Programistka i miłośniczka jogi. W wolnym czasie biegam i słucham podcastów. Cenię szczerość ponad wszystko.',
    matchPercent: 87,
    compatibility: {
      total: 87,
      breakdown: { wartości: 82, przywiązanie: 75, osobowość: 93, potrzeby: 90, wizja: 78 },
      insights: [
        'Podobne podejście do organizacji życia – to eliminuje wiele codziennych konfliktów.',
        'Podobny poziom emocjonalności – łatwiej wam się wzajemnie rozumieć.',
        'Macie podobną wizję idealnego związku.',
      ],
    },
    interests: ['💻 Tech', '🧘 Joga', '🏃 Bieganie', '🎵 Muzyka'],
    personalityType: 'INTP',
    personalityDesc: 'Logik – innowacyjny wynalazca z niezaspokojoną ciekawością',
  },
  {
    id: '3',
    name: 'Karolina',
    age: 29,
    city: 'Gdańsk',
    emoji: '👩‍🍳',
    bio: 'Szefowa kuchni i pasjonatka podróży kulinarnych. Wierzę, że najlepsze rozmowy toczą się przy stole.',
    matchPercent: 83,
    compatibility: {
      total: 83,
      breakdown: { wartości: 88, przywiązanie: 70, osobowość: 79, potrzeby: 75, wizja: 85 },
      insights: [
        'Macie bardzo podobny styl przywiązania – to fundament trwałego związku.',
        'Różnicie się w potrzebie bliskości – warto o tym porozmawiać na początku.',
        'Wasze wartości i styl życia są bardzo zbieżne.',
      ],
    },
    interests: ['🍜 Gotowanie', '✈️ Podróże', '🌊 Morze', '🍷 Wino'],
    personalityType: 'ENFP',
    personalityDesc: 'Kampania – entuzjastyczny, twórczy duch wolny jak ptak',
  },
  {
    id: '4',
    name: 'Anna',
    age: 27,
    city: 'Poznań',
    emoji: '👩‍🏫',
    bio: 'Nauczycielka języków obcych. Mówię w 4 językach i marszę w 3. Szukam kogoś kto lubi uczyć się nowych rzeczy.',
    matchPercent: 79,
    compatibility: {
      total: 79,
      breakdown: { wartości: 74, przywiązanie: 80, osobowość: 76, potrzeby: 82, wizja: 71 },
      insights: [
        'Podobne podejście do organizacji życia – to eliminuje wiele codziennych konfliktów.',
        'Różnicie się w stylu przywiązania – może to prowadzić do napięć emocjonalnych.',
        'Macie podobną wizję idealnego związku.',
      ],
    },
    interests: ['🌍 Języki', '📖 Czytanie', '🎭 Teatr', '🚴 Rowery'],
    personalityType: 'ENFJ',
    personalityDesc: 'Protagonista – charyzmatyczny lider inspirujący innych',
  },
];
