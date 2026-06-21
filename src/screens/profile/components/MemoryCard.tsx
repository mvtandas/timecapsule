import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { getCapType } from '../../../constants/capTypes';
import CapTypeIcon from '../../../components/common/CapTypeIcon';
import { getMediaUrl } from '../../../utils/mediaUtils';
import { useT } from '../../../i18n';
import type { Memory } from '../../../services/memoriesService';

interface Props {
  memory: Memory;
  onPress: (capsule: any) => void;
}

/** A single "on this day" memory row. */
const MemoryCard: React.FC<Props> = ({ memory, onPress }) => {
  const t = useT();
  const cap = memory.capsule;
  const ct = getCapType(cap.type);
  const mediaUrl = getMediaUrl(cap);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(cap)} activeOpacity={0.85}>
      <View style={styles.thumb}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.thumbImg} resizeMode="cover" />
        ) : (
          <LinearGradient colors={ct.gradient as [string, string]} style={styles.thumbImg}>
            <CapTypeIcon size={22} color={COLORS.white} />
          </LinearGradient>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{cap.title}</Text>
        <Text style={styles.sub}>
          {memory.yearsAgo === 1
            ? t('memories.years_ago_one', { count: memory.yearsAgo })
            : t('memories.years_ago_other', { count: memory.yearsAgo })}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={COLORS.text3} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: RADIUS.lg, padding: SPACING.sm,
  },
  thumb: { width: 52, height: 52, borderRadius: RADIUS.md, overflow: 'hidden' },
  thumbImg: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg3 },
  body: { flex: 1 },
  title: { ...font('bodyBold'), color: COLORS.text },
  sub: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
});

export default MemoryCard;
