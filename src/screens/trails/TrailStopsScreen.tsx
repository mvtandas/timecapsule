import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Modal,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Linking,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/common/ScreenHeader';
import { Skeleton } from '../../components/common/Skeleton';
import ShareSheet from '../../components/ShareSheet';
import { TrailService, type TrailStop } from '../../services/trailService';
import { MediaService } from '../../services/mediaService';
import { supabase } from '../../lib/supabase';
import { DARK_MAP_STYLE } from '../../constants/mapStyle';
import { COLORS, SPACING, RADIUS, font } from '../../constants/theme';
import { useT } from '../../i18n';

interface Props {
  capsuleId: string;
  trailTitle?: string;
  /** Trail description, threaded through so the share card has a subtitle. */
  trailDesc?: string;
  /** True when arriving straight from the create wizard (vs editing an existing
   * trail from My Caps) — controls where leave() lands so we don't drop back
   * onto the still-mounted Create modal. */
  fromCreate?: boolean;
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

type Draft = {
  title: string;
  content: string;
  tip: string;
  lat: number | null;
  lng: number | null;
  location_name: string;
  photo_url: string | null;
  media_type: 'image' | 'video';
  estimated_minutes: number | null;
};

const emptyDraft = (): Draft => ({ title: '', content: '', tip: '', lat: null, lng: null, location_name: '', photo_url: null, media_type: 'image', estimated_minutes: null });
const FALLBACK = { latitude: 40.99, longitude: 29.02 }; // demo area fallback

const TrailStopsScreen = ({ capsuleId, trailTitle, trailDesc, fromCreate, onNavigate, onGoBack }: Props) => {
  const t = useT();
  const insets = useSafeAreaInsets();

  const [stops, setStops] = useState<TrailStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [region, setRegion] = useState(FALLBACK);

  const [editorVisible, setEditorVisible] = useState(false);
  // Completion + share: shown after the trail is finished so the creator can
  // immediately share the connected route (key for influencer distribution).
  const [finished, setFinished] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Title input ref so we can re-focus after "Save & add another" for fast,
  // back-to-back stop entry (matches the demo's inline-editor flow).
  const titleInputRef = useRef<TextInput>(null);
  // Page ScrollView ref so opening the inline editor can scroll it into view.
  const scrollRef = useRef<ScrollView>(null);

  // Serialize auto-saves so concurrent writes can't interleave (which would
  // duplicate rows). While a save is in flight, the latest state is queued.
  const savingRef = useRef(false);
  const pendingRef = useRef<TrailStop[] | null>(null);
  // Token to ignore out-of-order reverse-geocode results.
  const geoToken = useRef(0);

  useEffect(() => {
    (async () => {
      const existing = capsuleId ? await TrailService.getStops(capsuleId) : [];
      setStops(existing);
      setLoading(false);
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const l = await Location.getCurrentPositionAsync({});
          setRegion({ latitude: l.coords.latitude, longitude: l.coords.longitude });
        }
      } catch { /* keep fallback */ }
    })();
  }, [capsuleId]);

  /** Persist the full ordered set (auto-save: no lose-on-back). */
  const persist = async (next: TrailStop[]) => {
    setStops(next);
    if (!capsuleId) return;
    // Coalesce: if a save is already running, just queue the latest snapshot.
    if (savingRef.current) { pendingRef.current = next; return; }
    savingRef.current = true;
    setSaving(true);
    let toSave: TrailStop[] | null = next;
    while (toSave) {
      const { error } = await TrailService.saveStops(capsuleId, toSave);
      if (error) Alert.alert(t('common.retry'), t('trailEditor.saveFailed'));
      toSave = pendingRef.current;
      pendingRef.current = null;
    }
    savingRef.current = false;
    setSaving(false);
  };

  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const a = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      const x = a[0];
      if (!x) return '';
      return [x.name || x.street, x.city || x.region].filter(Boolean).join(', ');
    } catch {
      return '';
    }
  };

  const openAdd = () => {
    setDraft(emptyDraft());
    setEditingIndex(null);
    setEditorVisible(true);
    // Autofocus the title so the user can start typing immediately, and scroll
    // the inline editor (rendered at the end of the list) into view.
    setTimeout(() => {
      titleInputRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 350);
  };

  const openEdit = (i: number) => {
    const s = stops[i];
    setDraft({
      title: s.title || '',
      content: s.content || '',
      tip: s.tip || '',
      lat: s.lat ?? null,
      lng: s.lng ?? null,
      location_name: s.location_name || '',
      photo_url: s.photo_url ?? null,
      media_type: s.media_type === 'video' ? 'video' : 'image',
      estimated_minutes: s.estimated_minutes ?? null,
    });
    setEditingIndex(i);
    setEditorVisible(true);
    // Reveal the inline editor below the list.
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 350);
  };

  const pickStopPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert(t('createFlow.alert_allow_photos')); return; }
    // Allow both photos and videos. Editing/cropping only applies to images, so
    // leave it off here to support video selection cleanly.
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.85 });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    const isVideo = asset.type === 'video';
    setUploadingPhoto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert(t('trailEditor.saveFailed')); return; }
      const up = await MediaService.uploadMedia(asset.uri, user.id, `trailstop_${Date.now()}`);
      if (!up) { Alert.alert(t('trailEditor.saveFailed')); return; }
      setDraft((d) => ({ ...d, photo_url: up.url, media_type: isVideo ? 'video' : 'image' }));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const onMapPress = async (lat: number, lng: number) => {
    setDraft((d) => ({ ...d, lat, lng }));
    const token = ++geoToken.current;
    const name = await reverseGeocode(lat, lng);
    // Ignore if a newer tap/location has superseded this geocode request.
    if (token !== geoToken.current) return;
    setDraft((d) => ({ ...d, location_name: d.location_name || name }));
  };

  const useMyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const l = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = l.coords;
      setRegion({ latitude, longitude });
      onMapPress(latitude, longitude);
    } catch { /* ignore */ }
  };

  /**
   * Save the current draft. `addAnother` keeps the editor open, clears the
   * form, and re-focuses the title input so the user can immediately enter the
   * next stop (the demo's back-to-back flow). Otherwise the editor dismisses.
   */
  const saveStop = (addAnother = false) => {
    if (!draft.title.trim()) { Alert.alert(t('trailEditor.needTitle')); return; }
    if (draft.lat == null || draft.lng == null) { Alert.alert(t('trailEditor.needLocation')); return; }
    const stop: TrailStop = {
      ordinal: 0,
      title: draft.title.trim(),
      content: draft.content.trim() || null,
      tip: draft.tip.trim() || null,
      lat: draft.lat,
      lng: draft.lng,
      location_name: draft.location_name.trim() || null,
      photo_url: draft.photo_url || null,
      media_type: draft.media_type || 'image',
      estimated_minutes: draft.estimated_minutes,
    };
    const next = [...stops];
    if (editingIndex == null) next.push(stop);
    else next[editingIndex] = { ...next[editingIndex], ...stop };
    persist(next.map((s, i) => ({ ...s, ordinal: i })));

    if (addAnother) {
      // Keep editing inline: clear the form, switch to "add" mode, re-focus.
      setDraft(emptyDraft());
      setEditingIndex(null);
      setTimeout(() => titleInputRef.current?.focus(), 100);
    } else {
      setEditorVisible(false);
    }
  };

  const removeStop = (i: number) => {
    Alert.alert(t('trailEditor.removeStop'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => persist(stops.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, ordinal: idx }))) },
    ]);
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops];
    [next[i], next[j]] = [next[j], next[i]];
    persist(next.map((s, idx) => ({ ...s, ordinal: idx })));
  };

  const leave = () => {
    // From the create flow, goBack() would land on the still-mounted Create
    // modal — navigate to a tab instead so that modal is popped too and the
    // creator sees the map. From the edit flow, go back to where they came from.
    if (fromCreate) onNavigate('Dashboard');
    else if (onGoBack) onGoBack();
    else onNavigate('Dashboard');
  };

  const done = () => {
    // Demo requirement: a trail needs at least 2 stops to be complete.
    if (stops.length < 2) {
      Alert.alert(t('trailEditor.needTwoStops', { defaultValue: 'Add at least 2 stops before finishing your trail.' }));
      return;
    }
    // Show the completion screen so the creator can review the connected route
    // and share it, instead of silently dropping back to the map.
    setFinished(true);
  };

  const canFinish = stops.length >= 2;

  // Live stats: total stop count + summed estimated minutes (matches the demo).
  const totalMinutes = stops.reduce((sum, s) => sum + (s.estimated_minutes || 0), 0);
  const statsLine = totalMinutes > 0
    ? t('trailEditor.statsLine', {
        count: stops.length,
        minutes: totalMinutes,
        defaultValue: '%{count} stops · ~%{minutes} min total',
      })
    : t('trailEditor.statsLineCountOnly', {
        count: stops.length,
        defaultValue: '%{count} stops',
      });

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={trailTitle || t('trailEditor.title')}
        onBack={leave}
        borderBottom
        right={(
          <TouchableOpacity onPress={done} disabled={!canFinish} style={[styles.doneBtn, !canFinish && styles.doneBtnDisabled]} accessibilityRole="button" accessibilityState={{ disabled: !canFinish }}>
            {saving ? <ActivityIndicator size="small" color={COLORS.ember} /> : <Ionicons name="checkmark" size={24} color={canFinish ? COLORS.ember : COLORS.text3} />}
          </TouchableOpacity>
        )}
      />

      {loading ? (
        <View style={{ padding: SPACING.lg, gap: SPACING.md }}>
          <Skeleton height={64} radius={RADIUS.lg} />
          <Skeleton height={64} radius={RADIUS.lg} />
          <Skeleton height={64} radius={RADIUS.lg} />
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: insets.bottom + 120 }} keyboardShouldPersistTaps="handled">
          <Text style={styles.subtitle}>{t('trailEditor.subtitle')}</Text>

          {stops.length > 0 && (
            <View style={styles.statsRow}>
              <Ionicons name="footsteps-outline" size={14} color={COLORS.gold} />
              <Text style={styles.statsText}>{statsLine}</Text>
            </View>
          )}

          {stops.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}><Ionicons name="trail-sign" size={32} color={COLORS.gold} /></View>
              <Text style={styles.emptyTitle}>{t('trailEditor.emptyTitle')}</Text>
              <Text style={styles.emptyText}>{t('trailEditor.emptyText')}</Text>
            </View>
          ) : (
            stops.map((s, i) => (
              <View key={i} style={styles.stopRow}>
                {/* Timeline rail: numbered badge linked by a vertical connector */}
                <View style={styles.rail}>
                  {stops.length > 1 && (
                    <View style={[styles.railLine, i === 0 && styles.railLineFirst, i === stops.length - 1 && styles.railLineLast]} />
                  )}
                  <View style={styles.ordinalBadge}><Text style={styles.ordinalText}>{i + 1}</Text></View>
                </View>
                <View style={styles.stopCard}>
                {!!s.photo_url && (
                  s.media_type === 'video' ? (
                    <TouchableOpacity style={styles.stopThumbWrap} onPress={() => s.photo_url && Linking.openURL(s.photo_url)} activeOpacity={0.85}>
                      <Image source={{ uri: s.photo_url }} style={styles.stopThumb} resizeMode="cover" />
                      <View style={styles.thumbPlay}><Ionicons name="play-circle" size={24} color={COLORS.text} /></View>
                    </TouchableOpacity>
                  ) : (
                    <Image source={{ uri: s.photo_url }} style={styles.stopThumb} resizeMode="cover" />
                  )
                )}
                <TouchableOpacity style={styles.stopBody} onPress={() => openEdit(i)} activeOpacity={0.7}>
                  <Text style={styles.stopTitle} numberOfLines={1}>{s.title || t('trailEditor.stopNum', { n: i + 1 })}</Text>
                  {!!s.location_name && <Text style={styles.stopMeta} numberOfLines={1}><Ionicons name="location" size={11} color={COLORS.text3} /> {s.location_name}</Text>}
                  {!!s.content && <Text style={styles.stopMeta} numberOfLines={1}>{s.content}</Text>}
                </TouchableOpacity>
                <View style={styles.stopActions}>
                  <TouchableOpacity onPress={() => move(i, -1)} disabled={i === 0} style={styles.iconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="chevron-up" size={18} color={i === 0 ? COLORS.text3 : COLORS.text2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => move(i, 1)} disabled={i === stops.length - 1} style={styles.iconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="chevron-down" size={18} color={i === stops.length - 1 ? COLORS.text3 : COLORS.text2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => removeStop(i)} style={styles.iconBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
                </View>
              </View>
            ))
          )}

          {/* Inline stop editor — opens in-place (no page transition). Shown
              right after the list; replaces the "Add stop" button while open. */}
          {editorVisible ? (
            <View style={styles.editorCard}>
              <View style={styles.editorCardHeader}>
                <Text style={styles.editorCardTitle}>
                  {editingIndex == null
                    ? t('trailEditor.addStop')
                    : t('trailEditor.editStop', { n: (editingIndex ?? 0) + 1, defaultValue: 'Edit stop %{n}' })}
                </Text>
                <TouchableOpacity onPress={() => setEditorVisible(false)} style={styles.editorClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('common.close', { defaultValue: 'Close' })}>
                  <Ionicons name="close" size={22} color={COLORS.text2} />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>{t('trailEditor.titleLabel')}</Text>
              <TextInput
                ref={titleInputRef}
                style={styles.input}
                value={draft.title}
                onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
                placeholder={t('trailEditor.titlePlaceholder')}
                placeholderTextColor={COLORS.text3}
                returnKeyType="next"
              />

              <Text style={styles.fieldLabel}>{t('trailEditor.locationLabel')}</Text>
              <Text style={styles.hint}>{t('trailEditor.tapToPlace')}</Text>
              <View style={styles.mapWrap}>
                <MapView
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  customMapStyle={DARK_MAP_STYLE}
                  style={StyleSheet.absoluteFill}
                  region={{
                    latitude: draft.lat ?? region.latitude,
                    longitude: draft.lng ?? region.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  }}
                  onPress={(e) => onMapPress(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
                >
                  {draft.lat != null && draft.lng != null && (
                    <Marker coordinate={{ latitude: draft.lat, longitude: draft.lng }} pinColor={COLORS.gold} />
                  )}
                </MapView>
                <TouchableOpacity style={styles.myLocBtn} onPress={useMyLocation} activeOpacity={0.85}>
                  <Ionicons name="locate" size={16} color={COLORS.text} />
                  <Text style={styles.myLocText}>{t('trailEditor.useMyLocation')}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                value={draft.location_name}
                onChangeText={(v) => setDraft((d) => ({ ...d, location_name: v }))}
                placeholder={t('trailEditor.placeName')}
                placeholderTextColor={COLORS.text3}
              />

              <Text style={styles.fieldLabel}>{t('trailEditor.contentLabel')} <Text style={styles.optionalTag}>{t('trailEditor.optional', { defaultValue: '(optional)' })}</Text></Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={draft.content}
                onChangeText={(v) => setDraft((d) => ({ ...d, content: v }))}
                placeholder={t('trailEditor.contentPlaceholderHelper', { defaultValue: "A short note helps first-timers — what's special here, what to try?" })}
                placeholderTextColor={COLORS.text3}
                multiline
              />

              <Text style={styles.fieldLabel}>{t('trailEditor.tipLabel')} <Text style={styles.optionalTag}>{t('trailEditor.optional', { defaultValue: '(optional)' })}</Text></Text>
              <TextInput
                style={styles.input}
                value={draft.tip}
                onChangeText={(v) => setDraft((d) => ({ ...d, tip: v }))}
                placeholder={t('trailEditor.tipPlaceholder')}
                placeholderTextColor={COLORS.text3}
              />

              <Text style={styles.fieldLabel}>{t('trailEditor.mediaLabelShort', { defaultValue: 'Photo or video' })} <Text style={styles.optionalTag}>{t('trailEditor.optional', { defaultValue: '(optional)' })}</Text></Text>
              {draft.photo_url ? (
                <TouchableOpacity onPress={pickStopPhoto} activeOpacity={0.85} disabled={uploadingPhoto}>
                  <Image source={{ uri: draft.photo_url }} style={styles.stopPhoto} resizeMode="cover" />
                  {draft.media_type === 'video' && !uploadingPhoto && (
                    <View style={styles.previewPlay}><Ionicons name="play-circle" size={48} color={COLORS.text} /></View>
                  )}
                  {uploadingPhoto && <View style={styles.photoLoading}><ActivityIndicator size="small" color={COLORS.text} /></View>}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.photoBtn} onPress={pickStopPhoto} activeOpacity={0.85} disabled={uploadingPhoto}>
                  {uploadingPhoto
                    ? <ActivityIndicator size="small" color={COLORS.gold} />
                    : <><Ionicons name="images-outline" size={20} color={COLORS.gold} /><Text style={styles.photoBtnText}>{t('trailEditor.addMedia', { defaultValue: 'Add photo or video' })}</Text></>}
                </TouchableOpacity>
              )}

              <Text style={styles.fieldLabel}>{t('trailEditor.estMinutesLabelShort', { defaultValue: 'Estimated time (minutes)' })} <Text style={styles.optionalTag}>{t('trailEditor.optional', { defaultValue: '(optional)' })}</Text></Text>
              <TextInput
                style={styles.input}
                value={draft.estimated_minutes != null ? String(draft.estimated_minutes) : ''}
                onChangeText={(v) => {
                  const n = parseInt(v.replace(/[^0-9]/g, ''), 10);
                  setDraft((d) => ({ ...d, estimated_minutes: Number.isNaN(n) ? null : n }));
                }}
                placeholder={t('trailEditor.estMinutesPlaceholder', { defaultValue: 'e.g. 15' })}
                placeholderTextColor={COLORS.text3}
                keyboardType="number-pad"
              />

              {/* Save controls: primary keeps the editor open for the next stop. */}
              <View style={styles.editorActions}>
                {editingIndex == null ? (
                  <>
                    <TouchableOpacity style={styles.primaryBtn} onPress={() => saveStop(true)} activeOpacity={0.85} accessibilityRole="button">
                      <Ionicons name="add" size={18} color={COLORS.bg} />
                      <Text style={styles.primaryBtnText}>{t('trailEditor.saveAndAdd', { defaultValue: 'Save & add another' })}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => saveStop(false)} activeOpacity={0.85} accessibilityRole="button">
                      <Text style={styles.secondaryBtnText}>{t('trailEditor.saveAndClose', { defaultValue: 'Save & close' })}</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity style={styles.primaryBtn} onPress={() => saveStop(false)} activeOpacity={0.85} accessibilityRole="button">
                    <Ionicons name="checkmark" size={18} color={COLORS.bg} />
                    <Text style={styles.primaryBtnText}>{t('common.save')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.85}>
              <Ionicons name="add" size={20} color={COLORS.gold} />
              <Text style={styles.addBtnText}>{t('trailEditor.addStop')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Completion → share: review the connected route, then share it. */}
      <Modal visible={finished} animationType="slide" transparent onRequestClose={leave}>
        <View style={styles.doneOverlay}>
          <View style={[styles.doneCard, { paddingBottom: insets.bottom + SPACING.lg }]}>
            <View style={styles.doneTrophy}><Ionicons name="trophy" size={34} color={COLORS.gold} /></View>
            <Text style={styles.doneTitle}>{t('trailEditor.readyTitle', { defaultValue: 'Your trail is ready' })}</Text>
            <Text style={styles.doneStats}>{statsLine}</Text>
            <Text style={styles.doneDesc}>{t('trailEditor.readyDesc', { defaultValue: 'Share it so people can follow your route, stop by stop.' })}</Text>
            {/* The connected route, reviewed together before sharing. */}
            <ScrollView style={styles.donePreview} contentContainerStyle={{ paddingVertical: SPACING.xs }} showsVerticalScrollIndicator={false}>
              {stops.map((s, i) => (
                <View key={i} style={styles.donePreviewRow}>
                  <View style={styles.rail}>
                    {stops.length > 1 && (
                      <View style={[styles.railLine, i === 0 && styles.railLineFirst, i === stops.length - 1 && styles.railLineLast]} />
                    )}
                    <View style={styles.ordinalBadge}><Text style={styles.ordinalText}>{i + 1}</Text></View>
                  </View>
                  <Text style={styles.donePreviewText} numberOfLines={1}>{s.title || t('trailEditor.stopNum', { n: i + 1 })}</Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.shareBtn} onPress={() => { setFinished(false); setShowShare(true); }} activeOpacity={0.85} accessibilityRole="button">
              <Ionicons name="share-social" size={18} color={COLORS.bg} />
              <Text style={styles.shareBtnText}>{t('trailEditor.shareTrail', { defaultValue: 'Share trail' })}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneSecondary} onPress={leave} activeOpacity={0.7} accessibilityRole="button">
              <Text style={styles.doneSecondaryText}>{t('common.done', { defaultValue: 'Done' })}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ShareSheet
        visible={showShare}
        cap={{ id: capsuleId, type: 'trail', title: trailTitle, description: trailDesc || undefined, location_name: stops[0]?.location_name || undefined }}
        onClose={() => { setShowShare(false); leave(); }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  subtitle: { ...font('body'), color: COLORS.text2, marginBottom: SPACING.lg },
  doneBtn: { width: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  doneBtnDisabled: { opacity: 0.4 },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, marginBottom: SPACING.md, borderRadius: RADIUS.pill, backgroundColor: `${COLORS.gold}14`, borderWidth: 1, borderColor: `${COLORS.gold}33` },
  statsText: { ...font('labelBold'), fontSize: 13, color: COLORS.gold },
  optionalTag: { ...font('caption'), color: COLORS.text3, textTransform: 'none' },

  // Inline editor card (replaces the former full-screen editor modal).
  editorCard: { marginTop: SPACING.md, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg },
  editorCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.xs },
  editorCardTitle: { ...font('title'), color: COLORS.text },
  editorClose: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  editorActions: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.lg },

  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.gold },
  primaryBtnText: { ...font('labelBold'), color: COLORS.bg },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg3 },
  secondaryBtnText: { ...font('labelBold'), color: COLORS.text2 },

  empty: { alignItems: 'center', paddingVertical: SPACING.xl, gap: SPACING.xs },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.gold}22`, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  emptyTitle: { ...font('title'), color: COLORS.text },
  emptyText: { ...font('body'), color: COLORS.text2, textAlign: 'center', paddingHorizontal: SPACING.lg },

  // Completion → share overlay.
  doneOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  doneCard: { backgroundColor: COLORS.bg2, borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl, padding: SPACING.xl, alignItems: 'center', borderTopWidth: 1, borderColor: COLORS.border },
  doneTrophy: { width: 64, height: 64, borderRadius: 32, backgroundColor: `${COLORS.gold}22`, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.md },
  doneTitle: { ...font('title'), color: COLORS.text, textAlign: 'center' },
  doneStats: { ...font('labelBold'), color: COLORS.gold, marginTop: SPACING.xs },
  doneDesc: { ...font('body'), color: COLORS.text2, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.md, paddingHorizontal: SPACING.md },
  donePreview: { alignSelf: 'stretch', maxHeight: 220, marginBottom: SPACING.md },
  donePreviewRow: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  donePreviewText: { ...font('body'), color: COLORS.text, flex: 1 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'stretch', paddingVertical: SPACING.md, borderRadius: RADIUS.pill, backgroundColor: COLORS.gold },
  shareBtnText: { ...font('bodyBold'), color: COLORS.bg },
  doneSecondary: { paddingVertical: SPACING.md, marginTop: SPACING.xs },
  doneSecondaryText: { ...font('label'), color: COLORS.text2 },

  // Connected timeline: rail (badge + vertical connector) beside each stop card.
  stopRow: { flexDirection: 'row', alignItems: 'stretch', marginBottom: SPACING.sm },
  rail: { width: 28, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  railLine: { position: 'absolute', width: 2, top: 0, bottom: -SPACING.sm, backgroundColor: `${COLORS.gold}66` },
  railLineFirst: { top: '50%' },
  railLineLast: { bottom: '50%' },
  stopCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.md, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md },
  ordinalBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.gold, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  ordinalText: { ...font('labelBold'), color: COLORS.bg },
  stopThumbWrap: { width: 48, height: 48, borderRadius: RADIUS.sm, overflow: 'hidden' },
  stopThumb: { width: 48, height: 48, borderRadius: RADIUS.sm, backgroundColor: COLORS.bg3 },
  thumbPlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  stopBody: { flex: 1 },
  stopTitle: { ...font('bodyBold'), color: COLORS.text },
  stopMeta: { ...font('caption'), color: COLORS.text3, marginTop: 2 },
  stopActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: SPACING.md, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: `${COLORS.gold}66`, backgroundColor: `${COLORS.gold}14` },
  addBtnText: { ...font('labelBold'), color: COLORS.gold },

  fieldLabel: { ...font('eyebrow'), color: COLORS.text2, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  hint: { ...font('caption'), color: COLORS.text3, marginBottom: SPACING.sm },
  input: { ...font('body'), fontSize: 16, color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, minHeight: 48 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  mapWrap: { height: 220, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.md },
  myLocBtn: { position: 'absolute', bottom: SPACING.sm, right: SPACING.sm, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.overlay, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: RADIUS.pill },
  myLocText: { ...font('label'), color: COLORS.text },
  photoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: `${COLORS.gold}66`, backgroundColor: `${COLORS.gold}14` },
  photoBtnText: { ...font('labelBold'), color: COLORS.gold },
  stopPhoto: { width: '100%', aspectRatio: 16 / 9, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3 },
  previewPlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  photoLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.overlay, borderRadius: RADIUS.md },
});

export default TrailStopsScreen;
