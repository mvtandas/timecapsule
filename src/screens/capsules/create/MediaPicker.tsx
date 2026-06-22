import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

export interface PickedMedia { uri: string; type: 'image' | 'video' | 'audio' }

interface Props {
  media: PickedMedia | null;
  onChange: (m: PickedMedia | null) => void;
  accent?: string;
}

/** Attach a photo/video (camera or gallery) or record a voice note. */
const MediaPicker: React.FC<Props> = ({ media, onChange, accent = COLORS.ember }) => {
  const t = useT();
  const recRef = useRef<Audio.Recording | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [recording]);

  // Stop & clean up any in-flight recording when unmounting.
  useEffect(() => () => { recRef.current?.stopAndUnloadAsync().catch(() => {}); }, []);

  const fromCamera = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) { Alert.alert(t('createFlow.alert_permission_required'), t('createFlow.alert_allow_camera')); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!res.canceled && res.assets?.[0]) onChange({ uri: res.assets[0].uri, type: 'image' });
  };
  const fromLibrary = async (videos: boolean) => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.85,
      mediaTypes: videos ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets?.[0]) onChange({ uri: res.assets[0].uri, type: videos ? 'video' : 'image' });
  };

  const startVoice = async () => {
    try {
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) { Alert.alert(t('createFlow.alert_permission_required'), t('createFlow.alert_allow_mic')); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recRef.current = rec;
      setElapsed(0);
      setRecording(true);
    } catch {
      Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_something_wrong'));
    }
  };
  const stopVoice = async () => {
    const rec = recRef.current;
    setRecording(false);
    if (!rec) return;
    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      recRef.current = null;
      if (uri) onChange({ uri, type: 'audio' });
    } catch { /* ignore */ }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (recording) {
    return (
      <TouchableOpacity style={[styles.recording, { borderColor: accent }]} onPress={stopVoice} activeOpacity={0.85}>
        <View style={[styles.recDot, { backgroundColor: COLORS.danger }]} />
        <Text style={styles.recText}>{t('createFlow.recording')} · {fmt(elapsed)}</Text>
        <Ionicons name="stop-circle" size={26} color={accent} />
      </TouchableOpacity>
    );
  }

  if (media) {
    return (
      <View style={styles.preview}>
        {media.type === 'image' ? (
          <Image source={{ uri: media.uri }} style={styles.previewImg} resizeMode="cover" />
        ) : (
          <View style={[styles.previewImg, styles.altPreview]}>
            <Ionicons name={media.type === 'video' ? 'videocam' : 'mic'} size={32} color={COLORS.white} />
            <Text style={styles.altPreviewText}>{media.type === 'video' ? t('createFlow.mediaVideo') : t('createFlow.voiceNote')}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.remove} onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel={t('common.remove')}>
          <Ionicons name="close" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Btn icon="camera" label={t('createFlow.mediaPhoto')} accent={accent} onPress={fromCamera} />
      <Btn icon="images" label={t('createFlow.mediaGallery')} accent={accent} onPress={() => fromLibrary(false)} />
      <Btn icon="videocam" label={t('createFlow.mediaVideo')} accent={accent} onPress={() => fromLibrary(true)} />
      <Btn icon="mic" label={t('createFlow.mediaVoice')} accent={accent} onPress={startVoice} />
    </View>
  );
};

const Btn: React.FC<{ icon: keyof typeof Ionicons.glyphMap; label: string; accent: string; onPress: () => void }> = ({ icon, label, accent, onPress }) => (
  <TouchableOpacity style={styles.btn} onPress={onPress} activeOpacity={0.85} accessibilityRole="button" accessibilityLabel={label}>
    <Ionicons name={icon} size={22} color={accent} />
    <Text style={styles.btnText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.sm },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  btnText: { ...font('caption'), color: COLORS.text2 },
  preview: { borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border },
  previewImg: { width: '100%', height: 200, backgroundColor: COLORS.bg3 },
  altPreview: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  altPreviewText: { ...font('label'), color: COLORS.white },
  remove: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  recording: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, backgroundColor: COLORS.bg3 },
  recDot: { width: 12, height: 12, borderRadius: 6 },
  recText: { ...font('bodyBold'), color: COLORS.text, flex: 1 },
});

export default MediaPicker;
