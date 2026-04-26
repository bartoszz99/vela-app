import { useRef, useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  FlatList, KeyboardAvoidingView, Platform, Image, ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useChat, ChatMessage } from '@/hooks/useChat';
import { useLang } from '@/contexts/LanguageContext';

function useMsgTime() {
  const { lang } = useLang();
  return (iso: string): string => {
    const locale = lang === 'en' ? 'en-GB' : 'pl-PL';
    return new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };
}

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { messages, partner, myUserId, loading, sending, sendMessage } = useChat(id);
  const { t } = useLang();
  const msgTime = useMsgTime();
  const [text, setText] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    if (messages.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [messages.length]);

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    await sendMessage(trimmed);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [text, sendMessage]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.back}>←</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const avatarPhoto = partner?.photos?.[0] ?? null;
  const isFirstMessage = messages.length === 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatHeader}
          onPress={() => router.push(`/profile/${id}`)}
        >
          <View style={styles.miniAvatar}>
            {avatarPhoto
              ? <Image source={{ uri: avatarPhoto }} style={styles.avatarImg} />
              : <Text style={styles.avatarEmoji}>👤</Text>}
          </View>
          <Text style={styles.chatName}>{partner?.name ?? '…'}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={[styles.messageList, { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>
                Zacznij rozmowę – napisz coś o sobie lub o tym, co was łączy 💬
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const fromMe = item.sender_id === myUserId;
            return (
              <View style={[styles.bubble, fromMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, fromMe && styles.bubbleTextMe]}>
                  {item.content}
                </Text>
                <Text style={[styles.timestamp, fromMe && styles.timestampMe]}>
                  {msgTime(item.created_at)}
                </Text>
              </View>
            );
          }}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={isFirstMessage ? t('chat.placeholderFirst') : t('chat.placeholder')}
            placeholderTextColor={COLORS.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: 12,
  },
  back: { fontSize: 22, color: COLORS.primary, paddingRight: 4 },
  chatHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  miniAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  avatarEmoji: { fontSize: 20 },
  chatName: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  messageList: { padding: 16, gap: 8 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 80 },
  emptyChatText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },

  bubble: { maxWidth: '78%', borderRadius: 18, padding: 12, gap: 4 },
  bubbleThem: {
    backgroundColor: COLORS.surface, alignSelf: 'flex-start',
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  bubbleMe: { backgroundColor: COLORS.primary, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 15, color: COLORS.text, lineHeight: 21 },
  bubbleTextMe: { color: '#fff' },
  timestamp: { fontSize: 11, color: COLORS.textSecondary, alignSelf: 'flex-end' },
  timestampMe: { color: 'rgba(255,255,255,0.7)' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: COLORS.border, gap: 8,
  },
  input: {
    flex: 1, backgroundColor: COLORS.surface, borderRadius: 22,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: COLORS.text,
    maxHeight: 100, borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
  sendBtnText: { color: '#fff', fontSize: 18 },
});
