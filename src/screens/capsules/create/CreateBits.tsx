import React from 'react';
import { View, Text, Switch, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { MediaService } from '../../../services/mediaService';

export const TRAIL_CATEGORIES = ['Food tour', 'City walk', 'Hike', 'Coffee crawl', 'Photo spots', 'Nightlife', 'Shopping', 'Culture', 'Other'];
export const SCROLL_CATEGORIES = ['Architecture', 'History', 'Nature', 'Art', 'Food & Culture', 'Personal Story', 'Science', 'Other'];

export const Heading: React.FC<{ children: React.ReactNode }> = ({ children }) => <Text style={bits.heading}>{children}</Text>;

export const ReviewRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={bits.row}>
    <Text style={bits.rl}>{label}</Text>
    <Text style={bits.rv} numberOfLines={1}>{value}</Text>
  </View>
);

export const ToggleRow: React.FC<{ label: string; desc?: string; value: boolean; onChange: (v: boolean) => void; accent?: string }> = ({ label, desc, value, onChange, accent = COLORS.ember }) => (
  <View style={bits.toggle}>
    <View style={{ flex: 1 }}>
      <Text style={bits.tl}>{label}</Text>
      {!!desc && <Text style={bits.td}>{desc}</Text>}
    </View>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: accent, false: COLORS.bg4 }} thumbColor="#fff" />
  </View>
);

export const CategoryPicker: React.FC<{ options: string[]; value: string | null; onChange: (v: string | null) => void; accent?: string }> = ({ options, value, onChange, accent = COLORS.ember }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm, paddingVertical: 2 }}>
    {options.map((o) => {
      const on = o === value;
      return (
        <TouchableOpacity key={o} onPress={() => onChange(on ? null : o)} style={[bits.cat, on && { backgroundColor: `${accent}22`, borderColor: accent }]} activeOpacity={0.8}>
          <Text style={[bits.catText, { color: on ? accent : COLORS.text2 }]}>{o}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);

/** Upload a local uri to storage; returns { url, type } or null. */
export async function uploadUri(uri: string, userId: string) {
  return MediaService.uploadMedia(uri, userId, `tmp_${Date.now()}_${Math.round(Math.random() * 1e6)}`);
}

const bits = StyleSheet.create({
  heading: { ...font('title'), color: COLORS.text, marginBottom: SPACING.lg },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, gap: SPACING.lg },
  rl: { ...font('label'), color: COLORS.text2 },
  rv: { ...font('bodyBold'), color: COLORS.text, flexShrink: 1, textAlign: 'right' },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  tl: { ...font('bodyBold'), color: COLORS.text },
  td: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
  cat: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  catText: { ...font('label') },
});

export default {};
