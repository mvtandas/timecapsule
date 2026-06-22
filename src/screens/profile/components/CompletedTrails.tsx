import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

interface Props {
  trails: any[] | null;
  onPress: (cap: any) => void;
}

/** Profile "Completed trails" section — a compact list of finished trail caps. */
const CompletedTrails: React.FC<Props> = ({ trails, onPress }) => {
  const t = useT();
  if (trails === null) return null; // not loaded yet — keep the section out of flow

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>{t('profile.completedTrails')}</Text>
      {trails.length === 0 ? (
        <View style={styles.emptyRow}>
          <Text style={styles.emptyText}>{t('profile.noCompletedTrails')}</Text>
        </View>
      ) : (
        trails.map((cap) => (
          <TouchableOpacity
            key={cap.id}
            style={styles.row}
            onPress={() => onPress(cap)}
            activeOpacity={0.7}
          >
            <View style={styles.icon}>
              <Ionicons name="checkmark" size={16} color={COLORS.moss} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>{cap.title || t('profile.untitled', { defaultValue: 'Untitled' })}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {t('profile.byUser', { defaultValue: 'by @%{name}', name: cap.profiles?.username || t('profile.someone', { defaultValue: 'someone' }) })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.text3} />
          </TouchableOpacity>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  header: { ...font('eyebrow'), color: COLORS.text3, marginBottom: SPACING.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  icon: {
    width: 32, height: 32, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(61,155,122,0.18)', alignItems: 'center', justifyContent: 'center',
  },
  body: { flex: 1, minWidth: 0 },
  title: { ...font('bodyBold'), color: COLORS.text },
  sub: { ...font('caption'), color: COLORS.text3, marginTop: 1 },
  emptyRow: {
    backgroundColor: COLORS.card, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.lg, alignItems: 'center',
  },
  emptyText: { ...font('caption'), color: COLORS.text3 },
});

export default CompletedTrails;
