import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, LayoutChangeEvent } from 'react-native';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import GlassView from '../../../components/common/GlassView';

export interface TabDef { key: string; label: string; }

interface Props {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
  containerStyle?: ViewStyle;
  onLayout?: (e: LayoutChangeEvent) => void;
}

/** Glass segmented control (iOS-style) — a pill track with an ember-tinted active thumb. */
const ProfileTabs: React.FC<Props> = ({ tabs, active, onChange, containerStyle, onLayout }) => (
  <View style={[styles.outer, containerStyle]} onLayout={onLayout}>
    <GlassView radius={RADIUS.pill} sheen={false}>
      <View style={styles.track}>
        {tabs.map((tb) => {
          const on = tb.key === active;
          return (
            <TouchableOpacity
              key={tb.key}
              style={[styles.seg, on && styles.segActive]}
              onPress={() => onChange(tb.key)}
              activeOpacity={0.7}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
            >
              <Text style={[font('labelBold'), { color: on ? COLORS.ember : COLORS.text2 }]}>{tb.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </GlassView>
  </View>
);

const styles = StyleSheet.create({
  outer: { paddingHorizontal: SPACING.lg },
  track: { flexDirection: 'row', padding: 4 },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.pill },
  segActive: { backgroundColor: COLORS.emberSoft },
});

export default ProfileTabs;
