import { useRef, useState } from 'react';
import { Tabs, usePathname, router } from 'expo-router';
import {
  View, Text, TouchableOpacity, StyleSheet, Image,
  Alert, Platform, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/colors';
import { useIsDesktop } from '@/hooks/useBreakpoint';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/contexts/LanguageContext';

const NAV_ITEMS = [
  { name: 'matches', labelKey: 'nav.discover', emoji: '🔥' },
  { name: 'chats',   labelKey: 'nav.chats',    emoji: '💬' },
  { name: 'profile', labelKey: 'nav.profile',  emoji: '👤' },
];

const COLLAPSED_W = 72;
const EXPANDED_W  = 200;
const ANIM_MS     = 180;

function DesktopSidebar() {
  const pathname  = usePathname();
  const { profile } = useProfile();
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const widthAnim = useRef(new Animated.Value(COLLAPSED_W)).current;

  const expand = () => {
    setExpanded(true);
    Animated.timing(widthAnim, {
      toValue: EXPANDED_W, duration: ANIM_MS, useNativeDriver: false,
    }).start();
  };

  const collapse = () => {
    Animated.timing(widthAnim, {
      toValue: COLLAPSED_W, duration: ANIM_MS, useNativeDriver: false,
    }).start(() => setExpanded(false));
  };

  // Web: hover to expand; native: tap to toggle
  const hoverProps = Platform.OS === 'web'
    ? ({ onMouseEnter: expand, onMouseLeave: collapse } as any)
    : {};
  const handleToggle = Platform.OS !== 'web'
    ? () => (expanded ? collapse() : expand())
    : undefined;

  const doLogout = () => {
    supabase.auth.signOut().finally(() => router.replace('/onboarding'));
  };
  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (window.confirm(t('profile.logoutWebMsg'))) doLogout();
    } else {
      Alert.alert(t('profile.logoutConfirmTitle'), t('profile.logoutConfirmMsg'), [
        { text: t('profile.logoutConfirmNo'),  style: 'cancel' },
        { text: t('profile.logoutConfirmYes'), style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  const avatarPhoto  = profile?.photos?.[0] ?? null;
  const initials     = profile?.name?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <Animated.View style={[styles.sidebar, { width: widthAnim }]} {...hoverProps}>
      <SafeAreaView style={styles.sidebarInner} onTouchEnd={handleToggle}>

        {/* Logo */}
        <Text style={styles.sidebarLogo}>
          {expanded ? 'Vela' : 'V'}
        </Text>

        {/* Nav */}
        <View style={styles.sidebarNav}>
          {NAV_ITEMS.map((item) => {
            const active = pathname.includes(item.name);
            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.sidebarItem, active && styles.sidebarItemActive]}
                onPress={() => router.replace(`/(tabs)/${item.name}`)}
              >
                <Text style={styles.sidebarEmoji}>{item.emoji}</Text>
                {expanded && (
                  <Text style={[styles.sidebarLabel, active && styles.sidebarLabelActive]}>
                    {t(item.labelKey)}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bottom: avatar + logout */}
        <View style={styles.sidebarBottom}>
          <TouchableOpacity
            style={styles.sidebarUser}
            onPress={() => router.replace('/(tabs)/profile')}
          >
            <View style={styles.sidebarAvatar}>
              {avatarPhoto
                ? <Image source={{ uri: avatarPhoto }} style={styles.sidebarAvatarImg} />
                : <Text style={styles.sidebarInitial}>{initials}</Text>}
            </View>
            {expanded && (
              <View style={styles.sidebarUserInfo}>
                <Text style={styles.sidebarUserName} numberOfLines={1}>
                  {profile?.name ?? t('common.user')}
                </Text>
                {profile?.city && (
                  <Text style={styles.sidebarUserCity} numberOfLines={1}>
                    {profile.city}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarLogout} onPress={handleLogout}>
            <Text style={styles.sidebarLogoutIcon}>↩</Text>
            {expanded && (
              <Text style={styles.sidebarLogoutText}>{t('nav.logout')}</Text>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </Animated.View>
  );
}

export default function TabsLayout() {
  const isDesktop = useIsDesktop();
  const { t } = useLang();

  return (
    <View style={styles.root}>
      {isDesktop && <DesktopSidebar />}
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: isDesktop
              ? { display: 'none' }
              : {
                  backgroundColor: COLORS.surface,
                  borderTopColor: COLORS.border,
                  paddingBottom: 8,
                  paddingTop: 8,
                  height: 64,
                },
            tabBarActiveTintColor:   COLORS.primary,
            tabBarInactiveTintColor: COLORS.textSecondary,
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          }}
        >
          <Tabs.Screen name="matches" options={{ title: t('nav.discover') }} />
          <Tabs.Screen name="chats"   options={{ title: t('nav.chats') }} />
          <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
        </Tabs>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.background },

  sidebar: {
    backgroundColor: COLORS.background,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    overflow: 'hidden',
  },
  sidebarInner: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 0,
  },

  sidebarLogo: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primary,
    paddingVertical: 20,
    paddingHorizontal: 4,
    letterSpacing: -0.5,
  },

  sidebarNav: { gap: 4, flex: 1 },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  sidebarItemActive: { backgroundColor: COLORS.primaryLight },
  sidebarEmoji:       { fontSize: 20, width: 28, textAlign: 'center' },
  sidebarLabel:       { fontSize: 14, fontWeight: '500', color: COLORS.textSecondary },
  sidebarLabelActive: { color: COLORS.primary, fontWeight: '700' },

  sidebarBottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 14,
    paddingBottom: 14,
    gap: 10,
  },
  sidebarUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 2,
  },
  sidebarAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  sidebarAvatarImg:  { width: '100%', height: '100%', resizeMode: 'cover' },
  sidebarInitial:    { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  sidebarUserInfo:   { flex: 1 },
  sidebarUserName:   { fontSize: 13, fontWeight: '700', color: COLORS.text },
  sidebarUserCity:   { fontSize: 11, color: COLORS.textSecondary },

  sidebarLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  sidebarLogoutIcon: { fontSize: 16, color: COLORS.primary, width: 28, textAlign: 'center' },
  sidebarLogoutText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  content: { flex: 1 },
});
