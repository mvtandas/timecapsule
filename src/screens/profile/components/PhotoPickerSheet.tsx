import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onChooseGallery: () => void;
}

/** Bottom sheet for picking a new avatar (camera / gallery). */
const PhotoPickerSheet: React.FC<Props> = ({ visible, onClose, onTakePhoto, onChooseGallery }) => {
  const t = useT();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{t('profile.profilePhoto')}</Text>
          <TouchableOpacity style={styles.option} onPress={onTakePhoto}>
            <View style={[styles.icon, { backgroundColor: COLORS.emberSoft }]}>
              <Ionicons name="camera" size={22} color={COLORS.ember} />
            </View>
            <Text style={styles.optionText}>{t('profile.takePhoto')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.option} onPress={onChooseGallery}>
            <View style={[styles.icon, { backgroundColor: `${COLORS.moss}2E` }]}>
              <Ionicons name="images" size={22} color={COLORS.moss} />
            </View>
            <Text style={styles.optionText}>{t('profile.chooseFromGallery')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.bg2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border, paddingTop: SPACING.md, paddingBottom: SPACING.xxxl, paddingHorizontal: SPACING.lg,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.borderLight, alignSelf: 'center', marginBottom: SPACING.lg },
  title: { ...font('subtitle'), color: COLORS.text, textAlign: 'center', marginBottom: SPACING.lg },
  option: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  optionText: { ...font('body'), fontSize: 16, color: COLORS.text },
  cancel: { alignItems: 'center', paddingVertical: SPACING.md, marginTop: SPACING.sm, borderTopWidth: 0.5, borderTopColor: COLORS.border },
  cancelText: { ...font('bodyBold'), fontSize: 16, color: COLORS.text2 },
});

export default PhotoPickerSheet;
