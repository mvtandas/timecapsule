import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { useT } from '../../../i18n';

export type ScrollBlock = {
  id: string;
  type: 'heading' | 'subheading' | 'text' | 'quote' | 'callout' | 'list' | 'divider' | 'photo' | 'video' | 'link';
  text?: string;
  uri?: string;
  url?: string;
  label?: string;
};

const ADD_TYPES: { type: ScrollBlock['type']; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'heading', icon: 'text' }, { type: 'subheading', icon: 'text-outline' }, { type: 'text', icon: 'reorder-four' },
  { type: 'quote', icon: 'chatbox-ellipses-outline' }, { type: 'callout', icon: 'information-circle-outline' },
  { type: 'list', icon: 'list' }, { type: 'photo', icon: 'image' }, { type: 'video', icon: 'videocam' },
  { type: 'link', icon: 'link' }, { type: 'divider', icon: 'remove' },
];

interface Props { blocks: ScrollBlock[]; onChange: (b: ScrollBlock[]) => void; accent?: string }

const uid = () => `${Date.now()}_${Math.round(Math.random() * 1e6)}`;

// English fallbacks for block-type labels whose i18n keys may not exist yet.
const BLOCK_LABEL: Record<ScrollBlock['type'], string> = {
  heading: 'Heading', subheading: 'Subheading', text: 'Text', quote: 'Quote',
  callout: 'Callout', list: 'List', photo: 'Photo', video: 'Video', link: 'Link', divider: 'Divider',
};

/** Block-based rich content editor for Scroll caps (demo SCreate block system). */
const ScrollBlockEditor: React.FC<Props> = ({ blocks, onChange, accent = COLORS.ember }) => {
  const t = useT();
  const blockLabel = (type: ScrollBlock['type']) => t('createFlow.block_' + type, { defaultValue: BLOCK_LABEL[type] });

  const words = blocks.reduce((n, b) => n + (b.text ? b.text.trim().split(/\s+/).filter(Boolean).length : 0), 0);
  const readMin = Math.max(1, Math.round(words / 200));

  const add = (type: ScrollBlock['type']) => onChange([...blocks, { id: uid(), type, text: '', uri: undefined }]);
  const update = (id: string, patch: Partial<ScrollBlock>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const remove = (id: string) => onChange(blocks.filter((b) => b.id !== id));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir; if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice(); [next[i], next[j]] = [next[j], next[i]]; onChange(next);
  };
  const pickPhoto = async (id: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [16, 9], quality: 0.85 });
    if (!res.canceled && res.assets?.[0]) update(id, { uri: res.assets[0].uri });
  };
  const pickVideo = async (id: string) => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.85 });
    if (!res.canceled && res.assets?.[0]) update(id, { uri: res.assets[0].uri });
  };

  return (
    <View>
      <Text style={styles.meta}>{t('createFlow.s_wordcount', { words, min: readMin })}</Text>

      {blocks.map((b, i) => (
        <View key={b.id} style={styles.block}>
          <View style={styles.blockBar}>
            <Text style={styles.blockType}>{blockLabel(b.type)}</Text>
            <View style={styles.blockCtrls}>
              <TouchableOpacity onPress={() => move(i, -1)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}><Ionicons name="chevron-up" size={16} color={COLORS.text3} /></TouchableOpacity>
              <TouchableOpacity onPress={() => move(i, 1)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}><Ionicons name="chevron-down" size={16} color={COLORS.text3} /></TouchableOpacity>
              <TouchableOpacity onPress={() => remove(b.id)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}><Ionicons name="trash-outline" size={15} color={COLORS.danger} /></TouchableOpacity>
            </View>
          </View>

          {b.type === 'divider' ? (
            <Text style={styles.divider}>· · ·</Text>
          ) : b.type === 'photo' ? (
            b.uri ? (
              <TouchableOpacity onPress={() => pickPhoto(b.id)}><Image source={{ uri: b.uri }} style={styles.photo} resizeMode="cover" /></TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoEmpty} onPress={() => pickPhoto(b.id)}><Ionicons name="image-outline" size={24} color={accent} /><Text style={[styles.photoEmptyText, { color: accent }]}>{t('createFlow.addPhoto')}</Text></TouchableOpacity>
            )
          ) : b.type === 'video' ? (
            b.uri ? (
              <TouchableOpacity style={styles.videoFilled} onPress={() => pickVideo(b.id)}>
                <Ionicons name="play-circle" size={32} color={accent} />
                <Text style={[styles.photoEmptyText, { color: accent }]} numberOfLines={1}>{t('createFlow.block_video', { defaultValue: 'Video' })}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.photoEmpty} onPress={() => pickVideo(b.id)}><Ionicons name="videocam-outline" size={24} color={accent} /><Text style={[styles.photoEmptyText, { color: accent }]}>{t('createFlow.addVideo', { defaultValue: 'Add video' })}</Text></TouchableOpacity>
            )
          ) : b.type === 'link' ? (
            <View style={styles.linkFields}>
              <TextInput
                style={[styles.input, styles.linkInput]}
                value={b.url}
                onChangeText={(url) => update(b.id, { url })}
                placeholder={t('createFlow.block_ph_link', { defaultValue: 'https://…' })}
                placeholderTextColor={COLORS.text3}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TextInput
                style={[styles.input, styles.linkInput]}
                value={b.label}
                onChangeText={(label) => update(b.id, { label })}
                placeholder={t('createFlow.block_ph_link_label', { defaultValue: 'Label (optional)' })}
                placeholderTextColor={COLORS.text3}
              />
            </View>
          ) : (
            <TextInput
              style={[styles.input, blockStyle(b.type)]}
              value={b.text}
              onChangeText={(text) => update(b.id, { text })}
              placeholder={t('createFlow.block_ph_' + (b.type === 'list' ? 'list' : 'text'))}
              placeholderTextColor={COLORS.text3}
              multiline={b.type === 'text' || b.type === 'quote' || b.type === 'callout' || b.type === 'list'}
            />
          )}
        </View>
      ))}

      <Text style={styles.addLabel}>{t('createFlow.addBlock')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addRow}>
        {ADD_TYPES.map((a) => (
          <TouchableOpacity key={a.type} style={styles.addChip} onPress={() => add(a.type)} activeOpacity={0.8}>
            <Ionicons name={a.icon} size={16} color={accent} />
            <Text style={styles.addChipText}>{blockLabel(a.type)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const blockStyle = (type: ScrollBlock['type']) => {
  if (type === 'heading') return { ...font('title') } as any;
  if (type === 'subheading') return { ...font('subtitle') } as any;
  if (type === 'quote') return { ...font('subtitle'), fontStyle: 'italic', color: COLORS.text2 } as any;
  if (type === 'callout') return {} as any;
  return {} as any;
};

const styles = StyleSheet.create({
  meta: { ...font('caption'), color: COLORS.text3, marginBottom: SPACING.md },
  block: { marginBottom: SPACING.md, backgroundColor: COLORS.bg3, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm },
  blockBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  blockType: { ...font('micro'), color: COLORS.text3, textTransform: 'uppercase' },
  blockCtrls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  input: { ...font('body'), color: COLORS.text, padding: SPACING.xs, minHeight: 24 },
  divider: { ...font('title'), color: COLORS.text3, textAlign: 'center', letterSpacing: 4, paddingVertical: SPACING.sm },
  photo: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg4 },
  photoEmpty: { aspectRatio: 16 / 9, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg4, alignItems: 'center', justifyContent: 'center', gap: 6 },
  photoEmptyText: { ...font('label') },
  videoFilled: { aspectRatio: 16 / 9, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg4, alignItems: 'center', justifyContent: 'center', gap: 6 },
  linkFields: { gap: SPACING.sm },
  linkInput: { backgroundColor: COLORS.bg4, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm },
  addLabel: { ...font('eyebrow'), color: COLORS.text2, marginTop: SPACING.sm, marginBottom: SPACING.sm },
  addRow: { gap: SPACING.sm, paddingVertical: 2 },
  addChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  addChipText: { ...font('label'), color: COLORS.text2 },
});

export default ScrollBlockEditor;
