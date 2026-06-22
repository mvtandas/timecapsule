import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, GestureResponderEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { getCapType } from '../../../constants/capTypes';
import { getMediaUrl } from '../../../utils/mediaUtils';
import CapTypeIcon from '../../../components/common/CapTypeIcon';
import { useT } from '../../../i18n';
import { computeCapTimingBadge, TIMING_TONE_COLORS } from './TallDiscoverCard';

interface Props {
  cap: any;
  saved: boolean;
  onToggleSave: (cap: any) => void;
  onPress: (cap: any) => void;
}

/** "Trending now" list row (demo TrendingRow): thumb + title + type·location meta +
 *  type-tinted Trending pill + tone-colored timing pill + circular save + chevron. */
const TrendingRow: React.FC<Props> = ({ cap, saved, onToggleSave, onPress }) => {
  const t = useT();
  const ct = getCapType(cap.type);
  const cover = cap.cover_photo_url || getMediaUrl(cap);
  const timing = computeCapTimingBadge(cap, t);
  const timingColor = TIMING_TONE_COLORS[timing.tone];

  // Keep the save tap from also opening the row.
  const handleSave = (e: GestureResponderEvent) => { e.stopPropagation?.(); onToggleSave(cap); };

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => onPress(cap)}>
      <View style={styles.thumb}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <LinearGradient colors={ct.gradient as [string, string]} style={styles.thumbImg}>
            <CapTypeIcon size={22} color={COLORS.white} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{cap.title || ct.name}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          <Text style={{ color: ct.color }}>{ct.name}</Text>
          <Text style={styles.metaDim}>{`  ·  ${cap.location_name || t('discover.live')}`}</Text>
        </Text>
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: ct.color + '1F' }]}>
            <Text style={[styles.pillText, { color: ct.color }]}>{t('discover.trendingBadge')}</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: timingColor + '1F' }]}>
            <Text style={[styles.pillText, { color: timingColor }]}>{timing.label}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        onPress={handleSave}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[styles.saveBtn, saved ? { backgroundColor: ct.color + '1F', borderColor: ct.color + '66' } : null]}
        accessibilityRole="button"
      >
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={15} color={saved ? ct.color : COLORS.text3} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border,
  },
  thumb: { width: 64, height: 64, borderRadius: RADIUS.md, overflow: 'hidden', backgroundColor: COLORS.bg3 },
  thumbImg: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, minWidth: 0 },
  title: { ...font('bodyBold'), color: COLORS.text },
  meta: { ...font('caption'), marginTop: 2 },
  metaDim: { color: COLORS.text3 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  pill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  pillText: { ...font('micro'), textTransform: 'uppercase' },
  saveBtn: {
    width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
});

export default TrendingRow;
