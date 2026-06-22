import React from 'react';
import { Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font, SHADOWS } from '../../../constants/theme';
import { useT } from '../../../i18n';

export type DiscoverFilterId = 'for_you' | 'nearby' | 'unopened' | 'trending';

// For You → star, Nearby → location pin, Unopened → lock-open, Trending → trending-up.
const FILTERS: { id: DiscoverFilterId; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'for_you', icon: 'star' },
  { id: 'nearby', icon: 'location' },
  { id: 'unopened', icon: 'lock-open' },
  { id: 'trending', icon: 'trending-up' },
];

interface Props {
  active: DiscoverFilterId;
  onChange: (id: DiscoverFilterId) => void;
}

/** Discover filter chips: each has an icon + label, with a clear active (ember fill +
 *  white) vs. inactive (text2 + subtle border) state. */
const DiscoverFilters: React.FC<Props> = ({ active, onChange }) => {
  const t = useT();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {FILTERS.map((f) => {
        const on = f.id === active;
        return (
          <TouchableOpacity
            key={f.id}
            onPress={() => onChange(f.id)}
            activeOpacity={0.85}
            style={[styles.chip, on && styles.chipActive]}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
          >
            <Ionicons name={f.icon} size={14} color={on ? COLORS.white : COLORS.text2} />
            <Text style={[styles.label, { color: on ? COLORS.white : COLORS.text2 }]}>{t(`discover.filter_${f.id}`)}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: RADIUS.pill,
    backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.ember, borderColor: COLORS.ember, ...SHADOWS.glow(COLORS.ember) },
  label: { ...font('labelBold') },
});

export default DiscoverFilters;
