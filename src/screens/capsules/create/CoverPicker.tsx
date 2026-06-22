import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

interface Props { uri: string | null; onChange: (uri: string | null) => void; accent?: string }

/** 16:9 cover photo with the OS's native crop/zoom (allowsEditing + aspect). */
const CoverPicker: React.FC<Props> = ({ uri, onChange, accent = COLORS.ember }) => {
  const t = useT();
  const pick = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!res.canceled && res.assets?.[0]) onChange(res.assets[0].uri);
  };

  if (uri) {
    return (
      <View style={styles.wrap}>
        <Image source={{ uri }} style={styles.img} resizeMode="cover" />
        <TouchableOpacity style={styles.remove} onPress={() => onChange(null)} accessibilityLabel={t('common.remove')}>
          <Ionicons name="close" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.replace} onPress={pick}>
          <Ionicons name="crop" size={13} color="#fff" />
          <Text style={styles.replaceText}>{t('createFlow.replaceCover')}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <TouchableOpacity style={styles.empty} onPress={pick} activeOpacity={0.8} accessibilityRole="button">
      <Ionicons name="image-outline" size={26} color={accent} />
      <Text style={[styles.emptyText, { color: accent }]}>{t('createFlow.addCover')}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: { aspectRatio: 16 / 9, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  img: { width: '100%', height: '100%', backgroundColor: COLORS.bg3 },
  remove: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  replace: { position: 'absolute', bottom: SPACING.sm, right: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.pill },
  replaceText: { ...font('caption'), color: '#fff' },
  empty: { aspectRatio: 16 / 9, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { ...font('label') },
});

export default CoverPicker;
