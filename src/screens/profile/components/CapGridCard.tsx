import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { getCapType } from '../../../constants/capTypes';
import CapTypeIcon from '../../../components/common/CapTypeIcon';
import { getMediaUrl } from '../../../utils/mediaUtils';
import { timeAgo } from '../../../utils/dateUtils';

interface Props {
  capsule: any;
  width: number;
  onPress: (capsule: any) => void;
}

/** A single cap thumbnail in the 2-column grid (type-colored, lock badge). */
const CapGridCard: React.FC<Props> = ({ capsule, width, onPress }) => {
  const ct = getCapType(capsule.type);
  const mediaUrl = getMediaUrl(capsule);
  const locked = !!capsule.open_at && new Date(capsule.open_at).getTime() > Date.now();

  return (
    <TouchableOpacity style={[styles.card, { width }]} onPress={() => onPress(capsule)} activeOpacity={0.85}>
      <View style={styles.imageWrap}>
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <LinearGradient colors={ct.gradient as [string, string]} style={styles.placeholder}>
            <CapTypeIcon size={30} color={COLORS.white} />
          </LinearGradient>
        )}
        <View style={[styles.typeDot, { backgroundColor: ct.color }]}>
          <CapTypeIcon size={11} color={COLORS.white} filled />
        </View>
        {locked && (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={11} color={COLORS.white} />
          </View>
        )}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{capsule.title}</Text>
        <Text style={styles.time}>{timeAgo(capsule.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.borderLight, marginBottom: SPACING.md,
  },
  imageWrap: { width: '100%', aspectRatio: 1, position: 'relative' },
  image: { width: '100%', height: '100%', backgroundColor: COLORS.bg3 },
  placeholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  typeDot: {
    position: 'absolute', top: 7, left: 7, width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.bg,
  },
  lockBadge: {
    position: 'absolute', top: 7, right: 7, width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center',
  },
  info: { padding: SPACING.sm },
  title: { ...font('bodyBold'), color: COLORS.text },
  time: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
});

export default React.memo(CapGridCard);
