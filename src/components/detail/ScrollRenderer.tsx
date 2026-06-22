import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { COLORS, RADIUS, SPACING, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface Block { id?: string; type: string; text?: string; uri?: string; url?: string; label?: string }

/** Renders a Scroll cap's block content as a readable article (demo SDetail). */
const ScrollRenderer: React.FC<{ blocks: any }> = ({ blocks }) => {
  const t = useT();
  const list: Block[] = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return null;
  const openUrl = (url?: string) => { if (url) Linking.openURL(url).catch(() => {}); };
  return (
    <View style={styles.wrap}>
      {list.map((b, i) => {
        const k = b.id || String(i);
        switch (b.type) {
          case 'heading': return <Text key={k} style={styles.h1}>{b.text}</Text>;
          case 'subheading': return <Text key={k} style={styles.h2}>{b.text}</Text>;
          case 'quote': return <View key={k} style={styles.quote}><Text style={styles.quoteText}>{b.text}</Text></View>;
          case 'callout': return (
            <View key={k} style={styles.callout}>
              <Ionicons name="information-circle" size={16} color={COLORS.blue} />
              <Text style={styles.calloutText}>{b.text}</Text>
            </View>
          );
          case 'divider': return <Text key={k} style={styles.divider}>· · ·</Text>;
          case 'list': return (
            <View key={k} style={styles.list}>
              {String(b.text || '').split('\n').filter(Boolean).map((it, j) => (
                <View key={j} style={styles.li}><Text style={styles.bullet}>•</Text><Text style={styles.liText}>{it}</Text></View>
              ))}
            </View>
          );
          case 'photo': return b.uri ? <Image key={k} source={{ uri: b.uri }} style={styles.photo} resizeMode="cover" /> : null;
          case 'video': return b.uri ? (
            <Video
              key={k}
              style={styles.video}
              source={{ uri: b.uri }}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
            />
          ) : (
            <TouchableOpacity key={k} style={styles.video} activeOpacity={0.85} onPress={() => openUrl(b.url)}>
              <View style={styles.playBadge}><Ionicons name="play" size={22} color={COLORS.text} /></View>
              <Text style={styles.videoLabel}>{t('createFlow.block_video', { defaultValue: 'Video' })}</Text>
            </TouchableOpacity>
          );
          case 'link': return (b.url || b.text) ? (
            <TouchableOpacity key={k} style={styles.link} activeOpacity={0.7} onPress={() => openUrl(b.url || b.text)}>
              <Ionicons name="link" size={16} color={COLORS.blue} />
              <Text style={styles.linkText} numberOfLines={1}>{b.label || b.url || b.text}</Text>
              <Ionicons name="open-outline" size={15} color={COLORS.text3} />
            </TouchableOpacity>
          ) : null;
          default: return b.text ? <Text key={k} style={styles.p}>{b.text}</Text> : null;
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { gap: SPACING.md, marginTop: SPACING.sm },
  h1: { ...font('title'), color: COLORS.text },
  h2: { ...font('subtitle'), color: COLORS.text },
  p: { ...font('body'), fontSize: 15, lineHeight: 24, color: COLORS.text },
  quote: { borderLeftWidth: 3, borderLeftColor: COLORS.ember, paddingLeft: SPACING.md },
  quoteText: { ...font('subtitle'), fontStyle: 'italic', color: COLORS.text2 },
  callout: { flexDirection: 'row', gap: SPACING.sm, backgroundColor: `${COLORS.blue}1A`, borderRadius: RADIUS.md, padding: SPACING.md },
  calloutText: { ...font('body'), color: COLORS.text, flex: 1 },
  divider: { ...font('title'), color: COLORS.text3, textAlign: 'center', letterSpacing: 4, paddingVertical: SPACING.xs },
  list: { gap: 6 },
  li: { flexDirection: 'row', gap: SPACING.sm },
  bullet: { ...font('body'), color: COLORS.ember },
  liText: { ...font('body'), fontSize: 15, lineHeight: 22, color: COLORS.text, flex: 1 },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3 },
  video: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm },
  playBadge: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center' },
  videoLabel: { ...font('caption'), color: COLORS.text2 },
  link: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  linkText: { ...font('body'), color: COLORS.blue, flex: 1 },
});

export default ScrollRenderer;
