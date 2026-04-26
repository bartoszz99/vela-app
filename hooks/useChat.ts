import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export interface ChatPartner {
  id: string;
  name: string;
  photos: string[];
}

export function useChat(otherId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner]   = useState<ChatPartner | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);

  // Refs bypass stale-closure issues inside useCallback
  const matchIdRef  = useRef<string | null>(null);
  const myUserIdRef = useRef<string | null>(null);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!otherId) return;
    let cancelled = false;

    (async () => {
      // ── 1. Auth ──────────────────────────────────────────────────────
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('[useChat] getUser:', user?.id ?? null, 'error:', authError);
      if (!user || cancelled) { setLoading(false); return; }

      setMyUserId(user.id);
      myUserIdRef.current = user.id;

      // ── 2. Partner profile ────────────────────────────────────────────
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .eq('id', otherId)
        .single();
      console.log('[useChat] partner profile:', profile?.name ?? null, 'error:', profileError);
      if (!cancelled) setPartner(profile ?? null);

      // ── 3. Diagnose table structure ───────────────────────────────────
      const { data: sampleRow, error: sampleError } = await supabase
        .from('matches')
        .select('*')
        .limit(1)
        .maybeSingle();
      console.log('[useChat] matches table sample row:', sampleRow, 'error:', sampleError);
      console.log('[useChat] matches table columns:', sampleRow ? Object.keys(sampleRow) : 'no rows yet / error');

      // ── 4. Find or create match ───────────────────────────────────────
      // Try user1_id/user2_id first, then user_id_1/user_id_2 as fallback
      const col1 = sampleRow && 'user_id_1' in sampleRow ? 'user_id_1' : 'user1_id';
      const col2 = sampleRow && 'user_id_2' in sampleRow ? 'user_id_2' : 'user2_id';
      console.log('[useChat] using column names:', col1, col2);

      const { data: existingMatches, error: matchFindError } = await supabase
        .from('matches')
        .select('id')
        .or(
          `and(${col1}.eq.${user.id},${col2}.eq.${otherId}),` +
          `and(${col1}.eq.${otherId},${col2}.eq.${user.id})`,
        );
      console.log('[useChat] find match result:', existingMatches, 'error:', matchFindError);

      let mid: string | null = existingMatches?.[0]?.id ?? null;

      if (!mid) {
        console.log('[useChat] no existing match found, creating new one...');
        const insertPayload = { [col1]: user.id, [col2]: otherId };
        console.log('[useChat] insert payload:', insertPayload);

        const { data: created, error: matchCreateError } = await supabase
          .from('matches')
          .insert(insertPayload)
          .select('id')
          .single();
        console.log('[useChat] create match result:', created, 'error:', matchCreateError);
        if (matchCreateError) {
          console.error('[useChat] match create FAILED:', matchCreateError.code, matchCreateError.message, matchCreateError.details);
        }
        mid = created?.id ?? null;
      } else {
        console.log('[useChat] found existing match:', mid);
      }

      console.log('[useChat] matchId resolved:', mid);
      if (!mid || cancelled) { setLoading(false); return; }

      matchIdRef.current = mid;

      // ── 4. Fetch messages ─────────────────────────────────────────────
      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('id, content, sender_id, created_at')
        .eq('match_id', mid)
        .order('created_at', { ascending: true });
      console.log('[useChat] fetched messages:', msgs?.length ?? 0, 'error:', msgsError);

      if (!cancelled) {
        setMessages(msgs ?? []);
        setLoading(false);
      }

      // ── 5. Realtime subscription ──────────────────────────────────────
      const channel = supabase
        .channel(`chat-${mid}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${mid}` },
          (payload) => {
            console.log('[useChat] realtime INSERT:', payload.new);
            const msg = payload.new as ChatMessage;
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
            );
          },
        )
        .subscribe((status) => {
          console.log('[useChat] realtime status:', status);
        });

      channelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [otherId]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    const mid    = matchIdRef.current;
    const userId = myUserIdRef.current;

    console.log('[useChat] sendMessage called:', { mid, userId, content });

    if (!mid || !userId || !content.trim()) {
      console.warn('[useChat] sendMessage aborted – missing data:', { mid, userId, content });
      return false;
    }

    setSending(true);
    try {
      console.log('[useChat] inserting message...');
      const { data: msg, error } = await supabase
        .from('messages')
        .insert({ match_id: mid, sender_id: userId, content: content.trim() })
        .select('id, content, sender_id, created_at')
        .single();

      console.log('[useChat] insert result – data:', msg, 'error:', error);

      if (error) {
        console.error('[useChat] INSERT FAILED:', error.message, error.details, error.hint);
        return false;
      }

      if (msg) {
        // Optimistic update in case realtime is slow
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
        return true;
      }
      return false;
    } catch (e) {
      console.error('[useChat] sendMessage exception:', e);
      return false;
    } finally {
      setSending(false);
    }
  }, []); // no deps – reads from refs, not stale state

  return { messages, partner, myUserId, matchId: matchIdRef.current, loading, sending, sendMessage };
}
