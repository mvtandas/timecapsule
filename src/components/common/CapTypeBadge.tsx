import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getCapType } from '../../constants/capTypes';
import CapTypeIcon from './CapTypeIcon';
import { font } from '../../constants/theme';

/** Small pill showing a cap's type with its accent color + icon. */
const CapTypeBadge: React.FC<{ type?: string | null; size?: 'sm' | 'md' }> = ({ type, size = 'sm' }) => {
  const ct = getCapType(type);
  const icon = size === 'md' ? 14 : 12;
  return (
    <View style={[styles.badge, { backgroundColor: `${ct.color}22`, borderColor: `${ct.color}55` }]}>
      <CapTypeIcon size={icon} color={ct.color} />
      <Text style={[font('micro'), { color: ct.color }]}>{ct.name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
});

export default CapTypeBadge;
