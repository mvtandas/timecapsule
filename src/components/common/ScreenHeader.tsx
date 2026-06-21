import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface Props {
  title?: string;
  /** Show a back arrow that calls this. */
  onBack?: () => void;
  /** Right-side content (actions). */
  right?: React.ReactNode;
  /** Hairline divider under the header. */
  borderBottom?: boolean;
}

/**
 * Safe-area-aware screen header (back · title · right). Replaces the per-screen
 * header blocks that hardcoded `paddingTop` — one place owns top inset, hit
 * targets, and the back-button a11y label.
 */
const ScreenHeader: React.FC<Props> = ({ title, onBack, right, borderBottom }) => {
  const insets = useSafeAreaInsets();
  const t = useT();
  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + SPACING.sm },
        borderBottom && styles.border,
      ]}
    >
      <View style={styles.side}>
        {onBack && (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.back')}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <View style={[styles.side, styles.right]}>{right}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.bg,
  },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  side: { minWidth: 44, justifyContent: 'center' },
  right: { alignItems: 'flex-end' },
  backBtn: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  title: { ...font('title'), color: COLORS.text, flex: 1, textAlign: 'center' },
});

export default ScreenHeader;
