import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CapTypeIcon from '../../../components/common/CapTypeIcon';
import { getCapType } from '../../../constants/capTypes';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

interface Props {
  drafts: any[] | null;
  onSeeAll: () => void;
}

/** Snippet shown under the type label — mirrors DraftsScreen's helper. */
const snippet = (p: any): string => p?.title || p?.text || p?.myText || p?.desc || '—';

/**
 * Profile "Drafts" teaser — header with count + "See all" and up to 2 inline
 * draft preview rows. Hidden entirely when there are no drafts.
 */
const DraftsTeaser: React.FC<Props> = ({ drafts, onSeeAll }) => {
  const t = useT();
  if (!drafts || drafts.length === 0) return null; // hide the whole block

  const shown = drafts.slice(0, 2);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.header}>{t('profile.draftsTitle', { defaultValue: 'Drafts' })}</Text>
          <Text style={styles.badge}>{drafts.length}</Text>
        </View>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>{t('profile.seeAll', { defaultValue: 'See all' })}</Text>
        </TouchableOpacity>
      </View>

      {shown.map((d) => {
        const ct = getCapType(d.type);
        return (
          <TouchableOpacity key={d.id} style={styles.row} onPress={onSeeAll} activeOpacity={0.7}>
            <View style={[styles.icon, { backgroundColor: `${ct.color}22` }]}>
              <CapTypeIcon size={18} color={ct.color} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>{ct.name}</Text>
              <Text style={styles.sub} numberOfLines={1}>{snippet(d.payload)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.text3} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  header: { ...font('eyebrow'), color: COLORS.text3 },
  badge: {
    ...font('caption'), color: COLORS.ember, backgroundColor: COLORS.emberSoft,
    paddingHorizontal: 7, paddingVertical: 1, borderRadius: RADIUS.pill, overflow: 'hidden',
  },
  seeAll: { ...font('labelBold'), color: COLORS.ember },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
  },
  icon: { width: 32, height: 32, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  title: { ...font('bodyBold'), color: COLORS.text },
  sub: { ...font('caption'), color: COLORS.text3, marginTop: 1 },
});

export default DraftsTeaser;
