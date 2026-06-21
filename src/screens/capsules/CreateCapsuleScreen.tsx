import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet, Image, ActivityIndicator,
  Alert, Platform, KeyboardAvoidingView, ScrollView, Dimensions,
} from 'react-native';
import { CameraView, type CameraType, type FlashMode, useCameraPermissions } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DatePickerModal from '../../components/DatePickerModal';
import { CapsuleService } from '../../services/capsuleService';
import { MediaService } from '../../services/mediaService';
import { NotificationService } from '../../lib/notifications';
import { AchievementService } from '../../services/achievementService';
import { supabase } from '../../lib/supabase';
import { COLORS, font, RADIUS } from '../../constants/theme';
import { useT } from '../../i18n';
import { CAP_TYPE_LIST, getCapType, type CapTypeId } from '../../constants/capTypes';
import CapTypeIcon from '../../components/common/CapTypeIcon';

const LAUNCH = CAP_TYPE_LIST.filter((c) => c.enabled);
const { height } = Dimensions.get('window');

interface Props {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

type Captured = { uri: string; type: 'image' | 'video' };

const CreateCapsuleScreen = ({ onNavigate, onGoBack }: Props) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);

  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [mode, setMode] = useState<'camera' | 'compose'>('camera');
  const [captured, setCaptured] = useState<Captured | null>(null);

  const [caption, setCaption] = useState('');
  const [capType, setCapType] = useState<CapTypeId>('public');
  const [isPublic, setIsPublic] = useState(true);
  const [openDate, setOpenDate] = useState<Date | null>(null);
  const [loc, setLoc] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [saving, setSaving] = useState(false);

  const ct = getCapType(capType);
  const accent = ct.color;
  const grad = ct.gradient as readonly [string, string];

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const l = await Location.getCurrentPositionAsync({});
        const a = await Location.reverseGeocodeAsync({ latitude: l.coords.latitude, longitude: l.coords.longitude });
        const addr = a[0] ? `${a[0].city || a[0].name || ''}${a[0].region ? ', ' + a[0].region : ''}`.trim() : t('capture.here');
        setLoc({ lat: l.coords.latitude, lng: l.coords.longitude, address: addr || t('capture.here') });
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const selectType = (id: CapTypeId) => {
    setCapType(id);
    setIsPublic(id === 'public' || id === 'scroll' || id === 'trail');
  };

  const takePhoto = async () => {
    try {
      const p = await camRef.current?.takePictureAsync({ quality: 0.85 });
      if (p?.uri) {
        setCaptured({ uri: p.uri, type: 'image' });
        setMode('compose');
      }
    } catch (e) {
      if (__DEV__) console.warn('takePicture', e);
    }
  };

  const pickGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('createFlow.alert_permission_required'), t('createFlow.alert_allow_photos'));
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.85 });
    if (!r.canceled && r.assets[0]) {
      const a = r.assets[0];
      setCaptured({ uri: a.uri, type: a.type === 'video' ? 'video' : 'image' });
      setMode('compose');
    }
  };

  const finishAndNotify = async () => {
    onNavigate('Dashboard');
    try {
      const fresh = await AchievementService.checkNewlyUnlocked();
      if (fresh.length) {
        setTimeout(
          () => Alert.alert(t('createFlow.alert_achievement'), fresh.map((a) => `${a.name}  +${a.points} pts`).join('\n')),
          500,
        );
      }
    } catch {
      /* non-fatal */
    }
  };

  const seal = async () => {
    if (saving || !captured) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_must_be_logged_in'));
        setSaving(false);
        return;
      }
      const tempId = `temp_${Date.now()}`;
      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' | 'none' = 'none';
      const refs: { url: string; type: string }[] = [];
      const up = await MediaService.uploadMedia(captured.uri, user.id, tempId);
      if (!up) {
        // We always have captured media in the camera-first flow — a failed
        // upload must NOT silently create a media-less "sealed moment".
        Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_create_failed'));
        setSaving(false);
        return;
      }
      refs.push({ url: up.url, type: up.type });
      mediaUrl = up.url;
      mediaType = up.type as 'image' | 'video';
      const isLocked = openDate ? new Date(openDate) > new Date() : false;
      const title = caption.trim() || loc?.address || t('capture.here');

      const { data, error } = await CapsuleService.createCapsule({
        title,
        description: caption.trim() || null,
        open_at: openDate?.toISOString() || null,
        lat: loc?.lat || null,
        lng: loc?.lng || null,
        is_public: isPublic,
        content_refs: refs.length ? refs : undefined,
        media_url: mediaUrl,
        media_type: mediaType,
        is_locked: isLocked,
        type: capType,
        location_name: loc?.address || null,
        is_anonymous: !isPublic,
      } as any);

      if (error) {
        if (__DEV__) console.error('create error', error);
        Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_create_failed'));
        if (mediaUrl) {
          const p = MediaService.extractPathFromUrl(mediaUrl);
          if (p) await MediaService.deleteMedia(p);
        }
        setSaving(false);
        return;
      }
      if (openDate && data?.id && new Date(openDate) > new Date()) {
        const has = await NotificationService.checkPermissions().catch(() => false);
        if (has) {
          await NotificationService.scheduleCapsuleOpeningNotification(data.id, title, new Date(openDate)).catch(() => {});
        }
      }
      // Trail caps need stops added next — route to the stop editor.
      if (capType === 'trail' && data?.id) {
        setSaving(false);
        // Reset compose state: this screen stays mounted (TrailStops is pushed
        // on top), so clear the sealed draft to avoid a resurrected draft /
        // duplicate creation when the user returns.
        setCaptured(null);
        setMode('camera');
        setCaption('');
        setOpenDate(null);
        setCapType('public');
        onNavigate('TrailStops', { capsuleId: data.id, trailTitle: title });
        return;
      }
      finishAndNotify();
    } catch (e) {
      if (__DEV__) console.error('seal', e);
      Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_something_wrong'));
      setSaving(false);
    }
  };

  const dateLabel = openDate
    ? t('capture.opens_on', {
        date: openDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
          openDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      })
    : t('capture.now');

  // ── Permission gate ─────────────────────────────────────────
  if (mode === 'camera' && permission && !permission.granted) {
    return (
      <View style={styles.permWrap}>
        <Ionicons name="camera" size={56} color={COLORS.ember} />
        <Text style={[font('title'), styles.permTitle]}>{t('capture.permission_title')}</Text>
        <Text style={[font('body'), styles.permBody]}>{t('capture.permission_body')}</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={[font('labelBold'), { color: '#fff' }]}>{t('capture.grant')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.permGallery} onPress={pickGallery}>
          <Ionicons name="images-outline" size={18} color={COLORS.text2} />
          <Text style={[font('label'), { color: COLORS.text2 }]}>{t('createFlow.gallery')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onGoBack && onGoBack()} style={styles.permClose}>
          <Ionicons name="close" size={26} color={COLORS.text2} />
        </TouchableOpacity>
      </View>
    );
  }

  // ── Compose ─────────────────────────────────────────────────
  if (mode === 'compose' && captured) {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.flex}>
          {captured.type === 'video' ? (
            <Video source={{ uri: captured.uri }} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay isLooping isMuted />
          ) : (
            <Image source={{ uri: captured.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.55)', 'transparent', 'rgba(0,0,0,0.75)']} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />

          {/* Top bar */}
          <View style={[styles.composeTop, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity style={styles.roundBtn} onPress={() => { setCaptured(null); setMode('camera'); }}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.retakePill} onPress={() => { setCaptured(null); setMode('camera'); }}>
              <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
              <Text style={[font('label'), { color: '#fff' }]}>{t('capture.retake')}</Text>
            </TouchableOpacity>
          </View>

          {/* Type selector + always-on explanation of the selected type */}
          <View style={[styles.typeBlock, { top: insets.top + 52 }]} pointerEvents="box-none">
            <View style={styles.typeStripRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeStripContent}>
                {LAUNCH.map((tp) => {
                  const active = capType === tp.id;
                  return (
                    <TouchableOpacity
                      key={tp.id}
                      onPress={() => selectType(tp.id)}
                      style={[styles.typeChip, active && { backgroundColor: tp.color, borderColor: tp.color }]}
                      activeOpacity={0.85}
                    >
                      <CapTypeIcon size={16} color={active ? '#fff' : tp.color} />
                      <Text style={[font('labelBold'), { color: '#fff' }]}>{tp.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {/* right-edge fade — signals there are more types to scroll through */}
              <LinearGradient
                pointerEvents="none"
                colors={['transparent', 'rgba(0,0,0,0.6)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.typeFade}
              />
            </View>
            <View style={styles.typeDescWrap}>
              <CapTypeIcon size={15} color={accent} />
              <Text style={[font('caption'), styles.typeDescText]} numberOfLines={2}>
                {t('createFlow.desc_' + capType)}
              </Text>
            </View>
          </View>

          {/* Caption + bottom controls */}
          <View style={[styles.composeBottom, { paddingBottom: insets.bottom + 14 }]}>
            <TextInput
              style={styles.caption}
              value={caption}
              onChangeText={setCaption}
              placeholder={t('capture.caption_placeholder')}
              placeholderTextColor="rgba(255,255,255,0.6)"
              multiline
              maxLength={280}
            />

            <View style={styles.metaRow}>
              <TouchableOpacity style={styles.metaPill} onPress={() => setShowDate(true)} activeOpacity={0.8}>
                <Ionicons name={openDate ? 'lock-closed' : 'time-outline'} size={15} color="#fff" />
                <Text style={[font('caption'), styles.metaText]} numberOfLines={1}>{dateLabel}</Text>
              </TouchableOpacity>
              <View style={styles.metaPill}>
                <Ionicons name="location" size={15} color="#fff" />
                <Text style={[font('caption'), styles.metaText]} numberOfLines={1}>{loc?.address || t('capture.here')}</Text>
              </View>
              <TouchableOpacity style={styles.metaPill} onPress={() => setIsPublic((v) => !v)} activeOpacity={0.8}>
                <Ionicons name={isPublic ? 'globe-outline' : 'lock-closed'} size={15} color="#fff" />
                <Text style={[font('caption'), styles.metaText]}>{isPublic ? t('capture.visibility_public') : t('capture.visibility_private')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={seal} disabled={saving} activeOpacity={0.9} style={styles.sealWrap}>
              <LinearGradient colors={grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sealBtn}>
                {saving ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[font('labelBold'), styles.sealText]}>{t('capture.sealing')}</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={18} color="#fff" />
                    <Text style={[font('labelBold'), styles.sealText]}>{t('capture.seal')}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <DatePickerModal
            visible={showDate}
            onClose={() => setShowDate(false)}
            onSelectDate={(d) => setOpenDate(d)}
            minimumDate={new Date()}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Camera ──────────────────────────────────────────────────
  return (
    <View style={styles.flex}>
      <CameraView ref={camRef} style={StyleSheet.absoluteFill} facing={facing} flash={flash} />
      {/* Top controls */}
      <View style={[styles.camTop, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => onGoBack && onGoBack()} accessibilityRole="button" accessibilityLabel={t('a11y.close')}>
          <Ionicons name="close" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={styles.roundBtn} onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))} accessibilityRole="button" accessibilityLabel={t('a11y.flash')}>
            <Ionicons name={flash === 'off' ? 'flash-off' : 'flash'} size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.roundBtn} onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))} accessibilityRole="button" accessibilityLabel={t('a11y.flipCamera')}>
            <Ionicons name="camera-reverse" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom capture row */}
      <View style={[styles.camBottom, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.galleryBtn} onPress={pickGallery} accessibilityRole="button" accessibilityLabel={t('a11y.gallery')}>
          <Ionicons name="images" size={26} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={takePhoto} activeOpacity={0.8} style={styles.shutterOuter} accessibilityRole="button" accessibilityLabel={t('a11y.takePhoto')}>
          <View style={styles.shutterInner} />
        </TouchableOpacity>
        <View style={{ width: 52 }} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },

  // permission
  permWrap: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  permTitle: { color: COLORS.text, marginTop: 6 },
  permBody: { color: COLORS.text2, textAlign: 'center', marginBottom: 8 },
  permBtn: { backgroundColor: COLORS.ember, paddingHorizontal: 28, paddingVertical: 14, borderRadius: RADIUS.pill },
  permGallery: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  permClose: { position: 'absolute', top: 56, left: 20 },

  // camera
  camTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, zIndex: 5 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  camBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36 },
  galleryBtn: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  shutterOuter: { width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#fff' },

  // compose
  composeTop: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, zIndex: 5 },
  retakePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill },
  typeBlock: { position: 'absolute', left: 0, right: 0, zIndex: 4 },
  typeStripRow: { position: 'relative' },
  typeStripContent: { paddingHorizontal: 16, paddingRight: 44, gap: 8, alignItems: 'center' },
  typeFade: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 48 },
  typeDescWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginLeft: 16, marginTop: 9, maxWidth: '88%', backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: RADIUS.pill },
  typeDescText: { color: 'rgba(255,255,255,0.92)', flexShrink: 1 },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  composeBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, gap: 12 },
  caption: { ...font('subtitle'), color: '#fff', maxHeight: height * 0.25, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: RADIUS.pill, maxWidth: 160 },
  metaText: { color: '#fff' },
  sealWrap: { borderRadius: RADIUS.pill, overflow: 'hidden', marginTop: 2 },
  sealBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: RADIUS.pill },
  sealText: { color: '#fff', fontSize: 16 },
});

export default CreateCapsuleScreen;
