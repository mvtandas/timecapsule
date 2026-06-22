import React, { useState, useCallback } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { MessagingService } from '../../services/messagingService';
import { COLORS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface Props {
  onPress: () => void;
  /** Add a translucent glass fill (for floating use over the map). */
  glass?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable Messages entry — a circular chat icon with an unread-count badge.
 * Dropped into every main screen's header so the messaging flow is always one
 * tap away. Polls the unread total on focus + a light interval. The badge sits
 * on the (non-clipping) outer wrapper so it isn't cut off by the round mask.
 */
const MessagesButton: React.FC<Props> = ({ onPress, glass, style }) => {
  const t = useT();
  const [unread, setUnread] = useState(0);

  useFocusEffect(useCallback(() => {
    let alive = true;
    const refresh = () => { MessagingService.getTotalUnread().then((n) => { if (alive) setUnread(n); }).catch(() => {}); };
    refresh();
    const id = setInterval(refresh, 8000);
    return () => { alive = false; clearInterval(id); };
  }, []));

  return (
    <TouchableOpacity
      style={[styles.wrap, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('messages.title')}
    >
      <View style={[styles.circle, glass && styles.glass]}>
        {glass && <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />}
        <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.text} />
      </View>
      {unread > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg3,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  glass: { backgroundColor: 'rgba(18,23,31,0.55)' },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: COLORS.ember,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.bg,
  },
  badgeText: { ...font('micro'), color: '#fff', fontWeight: '700', fontSize: 10 },
});

export default MessagesButton;
