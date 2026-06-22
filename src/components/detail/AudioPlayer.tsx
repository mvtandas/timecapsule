import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { COLORS, RADIUS, SPACING, font } from '../../constants/theme';
import { useT } from '../../i18n';

/** Minimal play/pause player for voice-note caps. */
const AudioPlayer: React.FC<{ uri: string; accent?: string }> = ({ uri, accent = COLORS.ember }) => {
  const t = useT();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => { soundRef.current?.unloadAsync().catch(() => {}); }, []);

  const toggle = async () => {
    try {
      if (!soundRef.current) {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: true });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((s: any) => {
          if (s?.didJustFinish) { setPlaying(false); sound.setPositionAsync(0).catch(() => {}); }
        });
        setPlaying(true);
        return;
      }
      const st: any = await soundRef.current.getStatusAsync();
      if (st?.isPlaying) { await soundRef.current.pauseAsync(); setPlaying(false); }
      else { await soundRef.current.playAsync(); setPlaying(true); }
    } catch { /* ignore */ }
  };

  return (
    <TouchableOpacity style={[styles.wrap, { borderColor: accent }]} onPress={toggle} activeOpacity={0.85}>
      <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={34} color={accent} />
      <Text style={styles.label}>{t('createFlow.voiceNote')}</Text>
      <Ionicons name="mic" size={18} color={COLORS.text3} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginTop: SPACING.sm },
  label: { ...font('bodyBold'), color: COLORS.text, flex: 1 },
});

export default AudioPlayer;
