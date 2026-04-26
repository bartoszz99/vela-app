import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS } from '@/constants/colors';

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: number;
  style?: object;
}

export function PhotoAvatar({ uri, name, size = 52, style }: Props) {
  const initials = name?.trim().charAt(0).toUpperCase() ?? '?';
  const r = size / 2;
  const base = { width: size, height: size, borderRadius: r };

  if (uri) {
    return (
      <View style={[styles.wrap, base, style]}>
        <Image source={{ uri }} style={styles.img} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, styles.initWrap, base, style]}>
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:     { overflow: 'hidden', backgroundColor: COLORS.primaryLight },
  img:      { width: '100%', height: '100%', resizeMode: 'cover' },
  initWrap: { justifyContent: 'center', alignItems: 'center' },
  initial:  { fontWeight: '800', color: COLORS.primary },
});
