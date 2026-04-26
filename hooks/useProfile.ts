import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  id: string;
  name: string;
  age: number | null;
  city: string | null;
  job: string | null;
  bio: string | null;
  photos: string[];
  personality_type: string | null;
  trait_scores: Record<string, unknown> | null;
  min_compatibility: number | null;
}

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const { data } = await supabase
          .from('profiles')
          .select('id, name, age, city, job, bio, photos, personality_type, trait_scores, min_compatibility')
          .eq('id', user.id)
          .single();

        setProfile(data ?? null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { profile, loading, setProfile };
}
