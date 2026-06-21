import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, GRADIENTS, RADIUS, SPACING, SHADOWS, font } from '../../../constants/theme';
import GlassView from '../../../components/common/GlassView';

export interface StatItem {
  key: string;
  label: string;
  value: number;
  onPress?: () => void;
}

interface Props {
  displayName: string;
  username: string;
  joinedLabel?: string | null;
  location?: string | null;
  bio?: string | null;
  photo?: string | null;
  uploading?: boolean;
  onAvatarPress: () => void;
  stats: StatItem[];
}

/** Centered identity (avatar → name → meta → bio) over a single glass stat card. */
const ProfileHero: React.FC<Props> = ({
  displayName, username, joinedLabel, location, bio, photo, uploading, onAvatarPress, stats,
}) => {
  const metaParts = [`@${username}`];
  if (joinedLabel) metaParts.push(joinedLabel);
  if (location) metaParts.push(location);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onAvatarPress} disabled={uploading} activeOpacity={0.85} style={styles.avatarTouch}>
        <LinearGradient colors={GRADIENTS.ember} style={styles.ring}>
          <View style={styles.ringInner}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={38} color={COLORS.ember} />
              </View>
            )}
          </View>
        </LinearGradient>
        {uploading ? (
          <View style={styles.avatarOverlay}><ActivityIndicator color={COLORS.ember} /></View>
        ) : (
          <View style={styles.cameraBadge}><Ionicons name="camera" size={13} color={COLORS.white} /></View>
        )}
      </TouchableOpacity>

      <Text style={styles.name}>{displayName}</Text>
      <Text style={styles.meta} numberOfLines={1}>{metaParts.join('  ·  ')}</Text>
      {!!bio && <Text style={styles.bio}>{bio}</Text>}

      <GlassView radius={RADIUS.lg} style={styles.statCard} sheen>
        <View style={styles.statsRow}>
          {stats.map((s, idx) => {
            const Inner = (
              <>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </>
            );
            return (
              <React.Fragment key={s.key}>
                {idx > 0 && <View style={styles.divider} />}
                {s.onPress ? (
                  <TouchableOpacity style={styles.stat} onPress={s.onPress} activeOpacity={0.6}>
                    {Inner}
                  </TouchableOpacity>
                ) : (
                  <View style={styles.stat}>{Inner}</View>
                )}
              </React.Fragment>
            );
          })}
        </View>
      </GlassView>
    </View>
  );
};

const RING = 92;

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.md, alignItems: 'center' },

  avatarTouch: { width: RING, height: RING, ...SHADOWS.glow(COLORS.ember) },
  ring: { width: RING, height: RING, borderRadius: RING / 2, alignItems: 'center', justifyContent: 'center' },
  ringInner: { width: 84, height: 84, borderRadius: 42, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: COLORS.bg3 },
  avatarPlaceholder: { width: 78, height: 78, borderRadius: 39, backgroundColor: COLORS.emberSoft, alignItems: 'center', justifyContent: 'center' },
  avatarOverlay: { position: 'absolute', width: RING, height: RING, borderRadius: RING / 2, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2, width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.ember, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.bg,
  },

  name: { ...font('title'), color: COLORS.text, marginTop: SPACING.md, textAlign: 'center' },
  meta: { ...font('caption'), color: COLORS.text2, marginTop: 3, textAlign: 'center' },
  bio: { ...font('subtitle'), fontSize: 14, lineHeight: 19, color: COLORS.text2, marginTop: SPACING.sm, textAlign: 'center', fontStyle: 'italic' },

  statCard: { alignSelf: 'stretch', marginTop: SPACING.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...font('title'), color: COLORS.text },
  statLabel: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: SPACING.xs, backgroundColor: COLORS.borderLight },
});

export default ProfileHero;
