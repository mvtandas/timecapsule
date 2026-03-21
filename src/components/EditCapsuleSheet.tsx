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
      'Delete Capsule',
      'This will permanently delete this capsule and all its media. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await CapsuleService.deleteCapsule(capsuleId);
              if (error) {
                Alert.alert('Error', 'Failed to delete capsule');
              } else {
                onClose();
                onDeleted?.();
              }
            } catch {
              Alert.alert('Error', 'Something went wrong.');
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title cannot be empty.');
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
        Alert.alert('Error', 'Failed to update capsule. Please try again.');
        return;
      }

      onSaved({ title: title.trim(), description: description.trim(), category });
      onClose();
    } catch (e) {
      Alert.alert('Error', 'Something went wrong.');
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
          <Text style={styles.headerTitle}>Edit Capsule</Text>
          <TouchableOpacity onPress={onClose} style={styles.headerClose}>
            <Ionicons name="close" size={22} color="#aaa" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Capsule title"
            placeholderTextColor="#666"
            maxLength={100}
          />

          {/* Description */}
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Capsule description"
            placeholderTextColor="#666"
            multiline
            maxLength={500}
          />

          {/* Category */}
          <Text style={styles.label}>Category</Text>
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
                  color={category === cat.id ? '#1c1c1e' : '#aaa'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat.id && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
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
              <ActivityIndicator size="small" color="#1c1c1e" />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          {/* Delete Capsule Button */}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteCapsule}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={styles.deleteBtnText}>Delete Capsule</Text>
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
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SHEET_HEIGHT,
    backgroundColor: '#1c1c1e',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  header: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#333',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#555',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
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
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#2c2c2e',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#fff',
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
    backgroundColor: '#2c2c2e',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  categoryChipActive: {
    backgroundColor: '#FAC638',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#aaa',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#1c1c1e',
  },
  saveBtn: {
    backgroundColor: '#FAC638',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1c1e',
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
    borderColor: '#FF3B30',
    backgroundColor: 'transparent',
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF3B30',
  },
});

export default EditCapsuleSheet;
