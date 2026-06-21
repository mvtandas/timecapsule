import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Animated,
  Dimensions,
  Keyboard,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CapsuleService } from '../services/capsuleService';
import { COLORS, font } from '../constants/theme';
import { useT } from '../i18n';

const { height } = Dimensions.get('window');
const SHEET_HEIGHT = height * 0.6;

const CATEGORIES = [
  { id: 'general', label: 'General', icon: 'cube-outline' },
  { id: 'travel', label: 'Travel', icon: 'airplane-outline' },
  { id: 'family', label: 'Family', icon: 'people-outline' },
  { id: 'friends', label: 'Friends', icon: 'person-outline' },
  { id: 'school', label: 'School', icon: 'school-outline' },
  { id: 'work', label: 'Work', icon: 'briefcase-outline' },
  { id: 'celebration', label: 'Celebration', icon: 'sparkles-outline' },
  { id: 'nature', label: 'Nature', icon: 'leaf-outline' },
  { id: 'food', label: 'Food', icon: 'restaurant-outline' },
  { id: 'music', label: 'Music', icon: 'musical-notes-outline' },
];

interface EditCapsuleSheetProps {
  capsuleId: string;
  visible: boolean;
  onClose: () => void;
  initialTitle: string;
  initialDescription: string;
  initialCategory: string;
  onSaved: (updated: { title: string; description: string; category: string }) => void;
  onDeleted?: () => void;
}

const EditCapsuleSheet: React.FC<EditCapsuleSheetProps> = ({
  capsuleId,
  visible,
  onClose,
  initialTitle,
  initialDescription,
  initialCategory,
  onSaved,
  onDeleted,
}) => {
  const t = useT();
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory || 'general');
  const [saving, setSaving] = useState(false);
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      setTitle(initialTitle);
      setDescription(initialDescription);
      setCategory(initialCategory || 'general');
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    return () => {
      translateY.stopAnimation();
    };
  }, [visible]);

  const handleDeleteCapsule = () => {
    Alert.alert(
      t('editCap.deleteTitle'),
      t('editCap.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await CapsuleService.deleteCapsule(capsuleId);
              if (error) {
                Alert.alert(t('editCap.errorTitle'), t('editCap.deleteFailed'));
              } else {
                onClose();
                onDeleted?.();
              }
            } catch {
              Alert.alert(t('editCap.errorTitle'), t('editCap.somethingWrong'));
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert(t('editCap.errorTitle'), t('editCap.titleEmpty'));
      return;
    }

    try {
      setSaving(true);
      Keyboard.dismiss();

      const { data, error } = await CapsuleService.updateCapsule(capsuleId, {
        title: title.trim(),
        description: description.trim() || null,
        category: category,
      });

      if (error) {
        Alert.alert(t('editCap.errorTitle'), t('editCap.updateFailed'));
        return;
      }

      onSaved({ title: title.trim(), description: description.trim(), category });
      onClose();
    } catch (e) {
      Alert.alert(t('editCap.errorTitle'), t('editCap.somethingWrong'));
    } finally {
      setSaving(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }] }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.handleBar} />
          <Text style={styles.headerTitle}>{t('editCap.headerTitle')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.headerClose}>
            <Ionicons name="close" size={22} color={COLORS.text2} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={styles.label}>{t('editCap.titleLabel')}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t('editCap.titlePlaceholder')}
            placeholderTextColor={COLORS.text3}
            maxLength={100}
          />

          {/* Description */}
          <Text style={styles.label}>{t('editCap.descriptionLabel')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder={t('editCap.descriptionPlaceholder')}
            placeholderTextColor={COLORS.text3}
            multiline
            maxLength={500}
          />

          {/* Category */}
          <Text style={styles.label}>{t('editCap.categoryLabel')}</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryChip,
                  category === cat.id && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={cat.icon as any}
                  size={16}
                  color={category === cat.id ? COLORS.white : COLORS.text2}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat.id && styles.categoryChipTextActive,
                  ]}
                >
                  {t(`editCap.cat_${cat.id}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={0.7}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.saveBtnText}>{t('editCap.saveChanges')}</Text>
            )}
          </TouchableOpacity>

          {/* Delete Capsule Button */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteCapsule}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
            <Text style={styles.deleteBtnText}>{t('editCap.deleteCapBtn')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    flex: 1,
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: COLORS.border,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.text3,
    marginBottom: 10,
  },
  headerTitle: {
    ...font('subtitle'),
    fontSize: 15,
    color: COLORS.text,
  },
  headerClose: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  label: {
    ...font('label'),
    color: COLORS.text2,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: COLORS.bg3,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.bg3,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  categoryChipActive: {
    backgroundColor: COLORS.ember,
  },
  categoryChipText: {
    ...font('label'),
    fontSize: 13,
    color: COLORS.text2,
  },
  categoryChipTextActive: {
    color: COLORS.white,
  },
  saveBtn: {
    backgroundColor: COLORS.ember,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    ...font('subtitle'),
    color: COLORS.white,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 16,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: COLORS.danger,
    backgroundColor: 'transparent',
  },
  deleteBtnText: {
    ...font('subtitle'),
    color: COLORS.danger,
  },
});

export default EditCapsuleSheet;
