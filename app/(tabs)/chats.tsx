import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { supabase } from '@/lib/supabase';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useLang } from '@/contexts/LanguageContext';
import { PhotoAvatar } from '@/components/PhotoAvatar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Conversation {
  matchId: string;
  otherId: string;
  otherName: string;
  otherPhoto: string | null;
  lastMessage: string | null;
  lastTime: string | null;
  isLastFromMe: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useFormatTime() {
  const { t, lang } = useLang();
  return (iso: string | null): string => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    const locale = lang === 'en' ? 'en-GB' : 'pl-PL';
    if (diffMin < 1)    return t('chats.timeNow');
    if (diffMin < 60)   return t('chats.timeMin', { n: diffMin });
    if (diffMin < 1440) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };
}

function useMsgTime() {
  const { lang } = useLang();
  return (iso: string): string => {
    const locale = lang === 'en' ? 'en-GB' : 'pl-PL';
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };
}

// ─── Avatar helper ────────────────────────────────────────────────────────────

function Avatar({ photo, name, size = 52 }: { photo: string | null; name?: string | null; size?: number }) {
  return <PhotoAvatar uri={photo} name={name} size={size} />;
}

// ─── Conversation panel (desktop + shared logic) ───────────────────────────────

function ConversationPanel({ otherId, onClose }: { otherId: string; onClose?: () => void }) {
  const { messages, partner, myUserId, loading, sending, sendMessage } = useChat(otherId);
  const { t } = useLang();
  const msgTime = useMsgTime();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await sendMessage(trimmed);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [text, sendMessage]);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  if (loading) {
    return (
      <View style={panel.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isFirstMessage = messages.length === 0;

  return (
    <View style={panel.container}>
      <View style={panel.topBar}>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={panel.back}>←</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={panel.chatHeader}
          onPress={() => router.push(`/profile/${otherId}`)}
        >
          <Avatar photo={partner?.photos?.[0] ?? null} name={partner?.name} size={40} />
          <Text style={panel.name}>{partner?.name ?? '…'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={panel.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={panel.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={panel.emptyChat}>
              <Text style={panel.emptyChatText}>{t('chat.emptyText')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const fromMe = item.sender_id === myUserId;
            return (
              <View style={[panel.bubble, fromMe ? panel.bubbleMe : panel.bubbleThem]}>
                <Text style={[panel.bubbleText, fromMe && panel.bubbleTextMe]}>{item.content}</Text>
                <Text style={[panel.ts, fromMe && panel.tsMe]}>{msgTime(item.created_at)}</Text>
              </View>
            );
          }}
        />

        <View style={panel.inputBar}>
          <TextInput
            style={panel.input}
            value={text}
            onChangeText={setText}
            placeholder={isFirstMessage ? t('chat.placeholderFirst') : t('chat.placeholder')}
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[panel.sendBtn, (!text.trim() || sending) && panel.sendBtnOff]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <Text style={panel.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Conversation list ────────────────────────────────────────────────────────

function ChatList({
  conversations,
  loading,
  selectedId,
  onSelect,
}: {
  conversations: Conversation[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (otherId: string) => void;
}) {
  const { t } = useLang();
  const formatTime = useFormatTime();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyEmoji}>{t('chats.emptyEmoji')}</Text>
        <Text style={styles.emptyTitle}>{t('chats.emptyTitle')}</Text>
        <Text style={styles.emptySub}>{t('chats.emptySub')}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={conversations}
      keyExtractor={(c) => c.matchId}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const active = item.otherId === selectedId;
        return (
          <TouchableOpacity
            style={[styles.chatRow, active && styles.chatRowActive]}
            onPress={() => onSelect(item.otherId)}
          >
            <Avatar photo={item.otherPhoto} name={item.otherName} size={52} />
            <View style={styles.chatInfo}>
              <View style={styles.chatTop}>
                <Text style={styles.chatName}>{item.otherName}</Text>
                <Text style={styles.chatTime}>{formatTime(item.lastTime)}</Text>
              </View>
              <Text style={styles.chatPreview} numberOfLines={1}>
                {item.lastMessage
                  ? (item.isLastFromMe ? `${t('chats.me')}: ${item.lastMessage}` : item.lastMessage)
                  : t('chats.startConversation')}
              </Text>
            </View>
            {item.lastMessage && !item.isLastFromMe && (
              <View style={styles.unreadDot} />
            )}
          </TouchableOpacity>
        );
      }}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Chats() {
  const isDesktop = useIsDesktop();
  const { t } = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(true);

  // Fetch conversations list
  useEffect(() => {
    (async () => {
      setLoadingConvs(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // All matches involving current user
        const { data: matches } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id, created_at')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order('created_at', { ascending: false });

        if (!matches?.length) { setLoadingConvs(false); return; }

        const matchIds  = matches.map((m) => m.id);
        const otherIds  = matches.map((m) =>
          m.user1_id === user.id ? m.user2_id : m.user1_id,
        );

        // Last message per match (one query, take first per match_id)
        const { data: msgs } = await supabase
          .from('messages')
          .select('match_id, content, sender_id, created_at')
          .in('match_id', matchIds)
          .order('created_at', { ascending: false });

        const lastMsgMap: Record<string, typeof msgs extends (infer T)[] | null ? T : never> = {};
        for (const m of msgs ?? []) {
          if (!lastMsgMap[m.match_id]) lastMsgMap[m.match_id] = m;
        }

        // Other users' profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, photos')
          .in('id', otherIds);

        const profileMap: Record<string, { name: string; photos: string[] }> = {};
        for (const p of profiles ?? []) {
          profileMap[p.id] = { name: p.name, photos: p.photos ?? [] };
        }

        const convs: Conversation[] = matches.map((m) => {
          const otherId  = m.user1_id === user.id ? m.user2_id : m.user1_id;
          const prof     = profileMap[otherId];
          const lastMsg  = lastMsgMap[m.id];
          return {
            matchId:       m.id,
            otherId,
            otherName:     prof?.name ?? t('common.user'),
            otherPhoto:    prof?.photos?.[0] ?? null,
            lastMessage:   lastMsg?.content ?? null,
            lastTime:      lastMsg?.created_at ?? m.created_at,
            isLastFromMe:  lastMsg?.sender_id === user.id,
          };
        });

        // Sort by last message time desc
        convs.sort((a, b) =>
          new Date(b.lastTime ?? 0).getTime() - new Date(a.lastTime ?? 0).getTime(),
        );

        setConversations(convs);
      } finally {
        setLoadingConvs(false);
      }
    })();
  }, []);

  const handleSelect = (otherId: string) => {
    if (isDesktop) {
      setSelectedId(otherId);
    } else {
      router.push(`/chat/${otherId}`);
    }
  };

  if (isDesktop) {
    return (
      <View style={styles.desktopRoot}>
        <SafeAreaView style={styles.desktopList}>
          <View style={styles.header}>
            <Text style={styles.heading}>{t('chats.heading')}</Text>
          </View>
          <ChatList
            conversations={conversations}
            loading={loadingConvs}
            selectedId={selectedId}
            onSelect={handleSelect}
          />
        </SafeAreaView>

        <View style={styles.desktopDivider} />

        <View style={styles.desktopConversation}>
          {selectedId ? (
            <ConversationPanel key={selectedId} otherId={selectedId} />
          ) : (
            <View style={styles.emptyStateCenter}>
              <Text style={styles.emptyEmoji}>{t('chats.emptyEmoji')}</Text>
              <Text style={styles.emptyTitle}>{t('chats.selectConversation')}</Text>
              <Text style={styles.emptySub}>{t('chats.selectConversationSub')}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>{t('chats.heading')}</Text>
      </View>
      <ChatList
        conversations={conversations}
        loading={loadingConvs}
        selectedId={null}
        onSelect={handleSelect}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 20, paddingVertical: 12 },
  heading: { fontSize: 28, fontWeight: '700', color: COLORS.text },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  list: { paddingHorizontal: 0 },
  chatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 14 },
  chatRowActive: { backgroundColor: COLORS.primaryLight },
  chatInfo: { flex: 1, gap: 3 },
  chatTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatName: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  chatTime: { fontSize: 12, color: COLORS.textSecondary },
  chatPreview: { fontSize: 14, color: COLORS.textSecondary },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  separator: { height: 1, backgroundColor: COLORS.border, marginLeft: 82 },

  emptyWrap: { flex: 1, paddingTop: 80, alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 21 },

  desktopRoot: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.background },
  desktopList: { width: '33%', backgroundColor: COLORS.surface },
  desktopDivider: { width: 1, backgroundColor: COLORS.border },
  desktopConversation: { flex: 1 },
  emptyStateCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
});

const panel = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    gap: 12, backgroundColor: COLORS.surface,
  },
  back: { fontSize: 22, color: COLORS.primary, paddingRight: 4 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  messageList: { padding: 16, gap: 8, flexGrow: 1 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 60 },
  emptyChatText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12, gap: 4 },
  bubbleThem: {
    backgroundColor: COLORS.surface, alignSelf: 'flex-start',
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  bubbleMe: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: COLORS.text, lineHeight: 21 },
  bubbleTextMe: { color: '#fff' },
  ts: { fontSize: 11, color: COLORS.textSecondary, alignSelf: 'flex-end' },
  tsMe: { color: 'rgba(255,255,255,0.7)' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    gap: 8, backgroundColor: COLORS.surface,
  },
  input: {
    flex: 1, backgroundColor: COLORS.background, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: COLORS.text,
    maxHeight: 100, borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnOff: { backgroundColor: COLORS.border },
  sendBtnText: { color: '#fff', fontSize: 18 },
});
