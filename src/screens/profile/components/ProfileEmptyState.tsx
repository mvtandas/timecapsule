import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

/** Per-tab empty state: icon + title + text + optional CTA. */
const ProfileEmptyState: React.FC<Props> = ({ icon, title, text, ctaLabel, onCta }) => (
  <View style={styles.box}>
    <View style={styles.icon}>
      <Ionicons name={icon} size={34} color={COLORS.ember} />
    </View>
    <Text style={styles.title}>{title}</Text>
    {!!text && <Text style={styles.text}>{text}</Text>}
    {!!ctaLabel && !!onCta && (
      <TouchableOpacity style={styles.cta} onPress={onCta} activeOpacity={0.85}>
        <Ionicons name="add" size={18} color={COLORS.white} />
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  box: {
    marginHorizontal: SPACING.lg, marginTop: SPACING.lg,
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: SPACING.xxl,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  icon: {
    width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.emberSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg,
  },
  title: { ...font('title'), color: COLORS.text, marginBottom: SPACING.xs, textAlign: 'center' },
  text: { ...font('body'), color: COLORS.text2, textAlign: 'center', marginBottom: SPACING.lg },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.ember, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: RADIUS.pill,
  },
  ctaText: { ...font('labelBold'), fontSize: 14, color: COLORS.white },
});

export default ProfileEmptyState;
