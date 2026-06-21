import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import GlassView from '../../../components/common/GlassView';
import { useT } from '../../../i18n';

interface Props {
  onEdit: () => void;
  onInvite: () => void;
}

/** Two equal-width glass action buttons (Edit profile · Invite). */
const ProfileActions: React.FC<Props> = ({ onEdit, onInvite }) => {
  const t = useT();
  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.btnWrap} onPress={onEdit} activeOpacity={0.8}>
        <GlassView radius={RADIUS.md} sheen={false}>
          <View style={styles.btnInner}>
            <Ionicons name="create-outline" size={16} color={COLORS.text} />
            <Text style={styles.label}>{t('profile.editProfile')}</Text>
          </View>
        </GlassView>
      </TouchableOpacity>
      <TouchableOpacity style={styles.btnWrap} onPress={onInvite} activeOpacity={0.8}>
        <GlassView radius={RADIUS.md} sheen={false}>
          <View style={styles.btnInner}>
            <Ionicons name="person-add-outline" size={16} color={COLORS.text} />
            <Text style={styles.label}>{t('profile.invite')}</Text>
          </View>
        </GlassView>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.lg, marginTop: SPACING.md },
  btnWrap: { flex: 1 },
  btnInner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 11,
  },
  label: { ...font('labelBold'), color: COLORS.text },
});

export default ProfileActions;
