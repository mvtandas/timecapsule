import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Share, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { COLORS, font } from '../constants/theme';
import { getCapType } from '../constants/capTypes';
import CapTypeBadge from './common/CapTypeBadge';
import { useT } from '../i18n';

/**
 * Bottom share sheet for a cap: WhatsApp · X · Copy link · More.
 * Builds a deep link (voorcap://cap/<id>) + descriptive text; falls back to the
 * OS share sheet when a target app isn't installed.
 */
interface ShareSheetProps {
  visible: boolean;
  cap: any;
  onClose: () => void;
}

const ShareSheet: React.FC<ShareSheetProps> = ({ visible, cap, onClose }) => {
  const insets = useSafeAreaInsets();
  const t = useT();
  if (!cap) return null;

  const ct = getCapType(cap.type);
  const link = `voorcap://cap/${cap.id}`;
  const loc = cap.location_name ? t('share.message_at', { location: cap.location_name }) : '';
  const message = t('share.message', {
    title: cap.title || t('share.fallback_title'),
    type: ct.name,
    loc,
    link,
  });

  const openOrShare = async (url: string) => {
    try {
      const ok = await Linking.canOpenURL(url);
      if (ok) await Linking.openURL(url);
      else await Share.share({ message });
    } catch {
      try {
        await Share.share({ message });
      } catch {
        /* ignore */
      }
    }
    onClose();
  };

  const targets = [
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: 'logo-whatsapp' as const,
      color: '#25D366',
      onPress: () => openOrShare(`whatsapp://send?text=${encodeURIComponent(message)}`),
    },
    {
      key: 'x',
      label: 'X',
      icon: 'logo-twitter' as const,
      color: COLORS.text,
      onPress: () => openOrShare(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`),
    },
    {
      key: 'copy',
      label: t('share.label_copy_link'),
      icon: 'link' as const,
      color: COLORS.ember,
      onPress: async () => {
        await Clipboard.setStringAsync(link);
        onClose();
        Alert.alert(t('share.copied_title'), t('share.copied_message'));
      },
    },
    {
      key: 'more',
      label: t('share.label_more'),
      icon: 'ellipsis-horizontal' as const,
      color: COLORS.text2,
      onPress: async () => {
        try {
          await Share.share({ message });
        } catch {
          /* ignore */
        }
        onClose();
      },
    },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={[font('subtitle'), { color: COLORS.text, marginBottom: 14 }]}>{t('share.title')}</Text>

          {/* Preview */}
          <View style={[styles.preview, { borderColor: `${ct.color}55` }]}>
            <CapTypeBadge type={cap.type} />
            <Text style={[font('subtitle'), { color: COLORS.text, marginTop: 8 }]} numberOfLines={1}>
              {cap.title || t('share.fallback_title')}
            </Text>
            {!!cap.location_name && (
              <Text style={[font('caption'), { color: COLORS.text3, marginTop: 2 }]} numberOfLines={1}>
                {cap.location_name}
              </Text>
            )}
          </View>

          {/* Targets */}
          <View style={styles.targets}>
            {targets.map((target) => (
              <TouchableOpacity key={target.key} style={styles.target} onPress={target.onPress} activeOpacity={0.8}>
                <View style={[styles.targetIcon, { backgroundColor: `${target.color}22` }]}>
                  <Ionicons name={target.icon} size={24} color={target.color} />
                </View>
                <Text style={[font('caption'), { color: COLORS.text2 }]}>{target.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.bg4, alignSelf: 'center', marginBottom: 16 },
  preview: {
    backgroundColor: COLORS.bg2,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 18,
  },
  targets: { flexDirection: 'row', justifyContent: 'space-around' },
  target: { alignItems: 'center', gap: 8 },
  targetIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

export default ShareSheet;
