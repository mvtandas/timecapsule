import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

interface Props {
  visible: boolean;
  onSaveDraft: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/** Bottom sheet shown when leaving a create wizard with unsaved content. */
const ExitWarningSheet: React.FC<Props> = ({ visible, onSaveDraft, onDiscard, onCancel }) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel} />
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
        <Text style={styles.title}>{t('createFlow.exitTitle')}</Text>
        <Text style={styles.body}>{t('createFlow.exitBody')}</Text>

        <TouchableOpacity style={styles.draftBtn} onPress={onSaveDraft} activeOpacity={0.85}>
          <Ionicons name="bookmark-outline" size={18} color={COLORS.white} />
          <Text style={styles.draftText}>{t('createFlow.saveDraft')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardBtn} onPress={onDiscard} activeOpacity={0.85}>
          <Text style={styles.discardText}>{t('createFlow.discard')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.85}>
          <Text style={styles.cancelText}>{t('createFlow.keepEditing')}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLORS.card, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.lg, borderTopWidth: 1, borderColor: COLORS.border },
  title: { ...font('subtitle'), color: COLORS.text },
  body: { ...font('body'), color: COLORS.text2, marginTop: SPACING.xs, marginBottom: SPACING.lg },
  draftBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.ember, paddingVertical: 14, borderRadius: RADIUS.md },
  draftText: { ...font('labelBold'), color: COLORS.white },
  discardBtn: { alignItems: 'center', paddingVertical: 14, marginTop: SPACING.sm },
  discardText: { ...font('labelBold'), color: COLORS.danger },
  cancelBtn: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { ...font('label'), color: COLORS.text2 },
});

export default ExitWarningSheet;
