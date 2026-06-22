import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

export interface FriendPreviewItem {
  id: string;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
}

interface Props {
  friends: FriendPreviewItem[];
  count: number;
  onSeeAll: () => void;
}

const letter = (f: FriendPreviewItem): string => {
  const src = f.username || f.display_name || '?';
  return src.replace('@', '').charAt(0).toUpperCase() || '?';
};

/** Inline friends preview — header + a row of up to 6 avatars, taps to Friends. */
const FriendsPreview: React.FC<Props> = ({ friends, count, onSeeAll }) => {
  const t = useT();
  const shown = friends.slice(0, 6);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.header}>{t('profile.friendsTitle')}</Text>
          {count > 0 && <Text style={styles.badge}>{count}</Text>}
        </View>
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7}>
          <Text style={styles.seeAll}>{t('profile.seeAll', { defaultValue: 'See all' })}</Text>
        </TouchableOpacity>
      </View>

      {shown.length === 0 ? (
        <TouchableOpacity style={styles.empty} onPress={onSeeAll} activeOpacity={0.85}>
          <Ionicons name="person-add-outline" size={18} color={COLORS.text3} />
          <Text style={styles.emptyText}>{t('profile.findFriends', { defaultValue: 'Find friends' })}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.grid}>
          {shown.map((f) => (
            <TouchableOpacity key={f.id} style={styles.avatarCell} onPress={onSeeAll} activeOpacity={0.7}>
              {f.avatar_url ? (
                <Image source={{ uri: f.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarLetter}>{letter(f)}</Text>
                </View>
              )}
              <Text style={styles.handle} numberOfLines={1}>@{(f.username || '').replace('@', '') || '…'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.sm },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  header: { ...font('eyebrow'), color: COLORS.text3 },
  badge: {
    ...font('caption'), color: COLORS.purple, backgroundColor: 'rgba(123,108,176,0.18)',
    paddingHorizontal: 7, paddingVertical: 1, borderRadius: RADIUS.pill, overflow: 'hidden',
  },
  seeAll: { ...font('labelBold'), color: COLORS.ember },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  avatarCell: { width: 52, alignItems: 'center' },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.bg3 },
  avatarPlaceholder: { backgroundColor: COLORS.emberSoft, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { ...font('subtitle'), color: COLORS.ember },
  handle: { ...font('caption'), color: COLORS.text3, marginTop: 4, maxWidth: 52, textAlign: 'center' },

  empty: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.card, borderWidth: StyleSheet.hairlineWidth, borderColor: COLORS.border,
    borderRadius: RADIUS.md, padding: SPACING.lg,
  },
  emptyText: { ...font('caption'), color: COLORS.text3 },
});

export default FriendsPreview;
