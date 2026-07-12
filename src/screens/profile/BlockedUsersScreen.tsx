import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, font } from '../../constants/theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useT } from '../../i18n';
import { ReportService, BlockedUser } from '../../services/reportService';

interface BlockedUsersScreenProps {
  onGoBack: () => void;
  onNavigate?: (screen: string, data?: any) => void;
}

const BlockedUsersScreen: React.FC<BlockedUsersScreenProps> = ({ onGoBack }) => {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<BlockedUser[]>([]);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const list = await ReportService.getBlockedUsers();
    setUsers(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleUnblock = (user: BlockedUser) => {
    const name = user.display_name || user.username || t('blocked.this_user', { defaultValue: 'this user' });
    Alert.alert(
      t('blocked.unblock_title', { defaultValue: 'Unblock' }),
      t('blocked.unblock_msg', { defaultValue: `Unblock ${name}? They will be able to see and interact with your content again.`, name }),
      [
        { text: t('common.cancel', { defaultValue: 'Cancel' }), style: 'cancel' },
        {
          text: t('blocked.unblock_action', { defaultValue: 'Unblock' }),
          style: 'destructive',
          onPress: async () => {
            setUnblocking(user.blocked_id);
            const { error } = await ReportService.unblockUser(user.blocked_id);
            setUnblocking(null);
            if (error) {
              Alert.alert(t('common.error', { defaultValue: 'Error' }), t('blocked.unblock_failed', { defaultValue: 'Could not unblock. Please try again.' }));
              return;
            }
            setUsers((prev) => prev.filter((u) => u.blocked_id !== user.blocked_id));
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={t('blocked.title', { defaultValue: 'Blocked Users' })}
        onBack={onGoBack}
        borderBottom
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.ember} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="shield-checkmark-outline" size={44} color={COLORS.text3} />
          <Text style={styles.emptyTitle}>{t('blocked.empty_title', { defaultValue: 'No blocked users' })}</Text>
          <Text style={styles.emptySub}>
            {t('blocked.empty_sub', { defaultValue: 'People you block will appear here. They won’t be able to see your content or contact you.' })}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {users.map((user) => {
            const name = user.display_name || user.username || t('blocked.unknown_user', { defaultValue: 'Unknown user' });
            const handle = user.username ? `@${user.username}` : null;
            return (
              <View key={user.id} style={styles.row}>
                {user.avatar_url ? (
                  <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarInitial}>{name.charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.rowText}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  {handle && <Text style={styles.handle} numberOfLines={1}>{handle}</Text>}
                </View>
                <TouchableOpacity
                  style={styles.unblockBtn}
                  onPress={() => handleUnblock(user)}
                  disabled={unblocking === user.blocked_id}
                  accessibilityRole="button"
                  accessibilityLabel={t('blocked.unblock_action', { defaultValue: 'Unblock' })}
                >
                  {unblocking === user.blocked_id ? (
                    <ActivityIndicator size="small" color={COLORS.text} />
                  ) : (
                    <Text style={styles.unblockText}>{t('blocked.unblock_action', { defaultValue: 'Unblock' })}</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    ...font('subtitle'),
    color: COLORS.text,
    marginTop: SPACING.md,
  },
  emptySub: {
    ...font('body'),
    color: COLORS.text2,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.card,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...font('subtitle'),
    color: COLORS.text2,
  },
  rowText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  name: {
    ...font('label'),
    color: COLORS.text,
  },
  handle: {
    ...font('caption'),
    color: COLORS.text2,
    marginTop: 1,
  },
  unblockBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    minWidth: 84,
    alignItems: 'center',
  },
  unblockText: {
    ...font('label'),
    color: COLORS.ember,
  },
});

export default BlockedUsersScreen;
