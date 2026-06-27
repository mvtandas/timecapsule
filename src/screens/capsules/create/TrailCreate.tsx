import React, { useMemo, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { uuidv4 } from '../../../utils/uuid';
import { getCapType } from '../../../constants/capTypes';
import { CapsuleService } from '../../../services/capsuleService';
import { DraftService } from '../../../services/draftService';
import { TrailService, type TrailStop } from '../../../services/trailService';
import { supabase } from '../../../lib/supabase';
import { useT } from '../../../i18n';
import WizardShell from './WizardShell';
import CoverPicker from './CoverPicker';
import TimeLock, { TimeMode } from './TimeLock';
import LocationPicker, { PickedLocation } from './LocationPicker';
import MediaPicker, { PickedMedia } from './MediaPicker';
import ExitWarningSheet from './ExitWarningSheet';
import ShareSheet from '../../../components/ShareSheet';
import { Heading, CategoryPicker, TRAIL_CATEGORIES, uploadUri } from './CreateBits';

interface Props {
  onClose: () => void;
  onNavigate: (screen: string, data?: any) => void;
  onSealed: () => void;
}

/** Local stop shape: TrailStop plus the not-yet-uploaded media URI/type. */
type DraftStop = TrailStop & {
  /** Stable client key for list rendering / reorder (stops have no id until saved). */
  key: string;
  /** Local media uri (uploaded once, at Seal). */
  media_uri?: string | null;
};

const STEPS = 3; // Name · Stops · Seal
const MINUTE_OPTIONS = [10, 20, 30, 45, 60, 90, 120];

/** Haversine distance (km) between two lat/lng points. */
const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

/**
 * Trail wizard (demo TCreate): a single 3-step flow — Name → Stops → Seal.
 * The cap AND its stops are saved together at the final "Seal this Trail" tap;
 * stops live in component state until then (no separate page, no duplicate caps).
 */
const TrailCreate: React.FC<Props> = ({ onClose, onNavigate, onSealed }) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const accent = getCapType('trail').color;

  const [step, setStep] = useState(0);

  // ── Step 0: Name ──────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  // ── Step 1: Stops ─────────────────────────────────────────────
  const [stops, setStops] = useState<DraftStop[]>([]);
  const [adding, setAdding] = useState(false);
  // Which existing stop currently has its location editor open (inline).
  const [editLocKey, setEditLocKey] = useState<string | null>(null);
  const [sTitle, setSTitle] = useState('');
  const [sLoc, setSLoc] = useState<PickedLocation | null>(null);
  const [sMedia, setSMedia] = useState<PickedMedia | null>(null);
  const [sMsg, setSMsg] = useState('');

  // ── Step 2: Seal ──────────────────────────────────────────────
  const [mode, setMode] = useState<TimeMode>('locked');
  const [date, setDate] = useState<Date | null>(null);

  // ── Sealed / success ──────────────────────────────────────────
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState(false);
  const [sealedCapId, setSealedCapId] = useState<string | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showExit, setShowExit] = useState(false);

  // Idempotent create id (retry-safe) + a guard so Seal can't double-fire.
  const capIdRef = useRef(uuidv4());
  const sealingRef = useRef(false);

  // ── Derived stats (port of the demo's totals) ─────────────────
  const totalMinutes = useMemo(
    () => stops.reduce((sum, s) => sum + (Number(s.estimated_minutes) || 30), 0),
    [stops],
  );
  const totalDistanceKm = useMemo(() => {
    const pts = stops
      .filter((s) => typeof s.lat === 'number' && typeof s.lng === 'number')
      .map((s) => ({ lat: s.lat as number, lng: s.lng as number }));
    if (pts.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) total += haversineKm(pts[i], pts[i + 1]);
    return total;
  }, [stops]);
  const formatTotalTime = (m: number) =>
    m >= 60 ? `${Math.floor(m / 60)}h ${m % 60 > 0 ? `${m % 60}m` : ''}`.trim() : `${m}m`;

  // ── Stop list mutations ───────────────────────────────────────
  const updateStop = (key: string, updates: Partial<DraftStop>) =>
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, ...updates } : s)));
  const removeStop = (key: string) => setStops((prev) => prev.filter((s) => s.key !== key));
  const moveStop = (i: number, dir: -1 | 1) =>
    setStops((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const resetAddForm = () => { setSTitle(''); setSLoc(null); setSMedia(null); setSMsg(''); };
  const addStop = () => {
    if (!sTitle.trim()) return;
    setStops((prev) => [
      ...prev,
      {
        key: uuidv4(),
        ordinal: prev.length,
        title: sTitle.trim(),
        location_name: sLoc?.name || null,
        lat: sLoc?.lat ?? null,
        lng: sLoc?.lng ?? null,
        content: sMsg.trim() || null,
        tip: null,
        photo_url: sMedia && sMedia.type !== 'audio' ? sMedia.uri : null,
        media_uri: sMedia && sMedia.type !== 'audio' ? sMedia.uri : null,
        media_type: sMedia?.type === 'video' ? 'video' : 'image',
        estimated_minutes: 30,
      },
    ]);
    resetAddForm();
    setAdding(false);
  };

  // ── Validation / step gating ──────────────────────────────────
  const dirty = !!(title || desc || cover || stops.length);
  const timeValid = !!date; // locked → date set, expires → date set
  const canAdvance = step === 0 ? !!title.trim() : step === 1 ? stops.length >= 2 : timeValid;

  // ── Seal: create cap + persist stops in one shot ──────────────
  const seal = async () => {
    if (sealingRef.current) return;
    sealingRef.current = true;
    setSealing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_must_be_logged_in'));
        setSealing(false); sealingRef.current = false; return;
      }

      // Cover upload (best-effort).
      let cover_photo_url: string | null = null;
      if (cover) { const up = await uploadUri(cover, user.id); if (up) cover_photo_url = up.url; }

      const firstLat = stops[0]?.lat ?? null;
      const firstLng = stops[0]?.lng ?? null;
      const locked = mode === 'locked' && !!date;

      const { data, error } = await CapsuleService.createCapsule({
        id: capIdRef.current,
        type: 'trail',
        title: title || getCapType('trail').name,
        description: desc || null,
        cover_photo_url,
        category: category || undefined,
        is_public: isPublic,
        is_anonymous: false,
        lat: firstLat,
        lng: firstLng,
        location_name: stops[0]?.location_name || null,
        open_at: locked ? date!.toISOString() : null,
        expires_at: mode === 'expires' && date ? date.toISOString() : null,
        is_locked: locked,
        status: locked ? 'sealed' : 'open',
        total_minutes: totalMinutes,
        total_distance_km: Number(totalDistanceKm.toFixed(2)),
      });
      if (error || !data) {
        Alert.alert(t('createFlow.alert_error'), (error as any)?.message || t('createFlow.alert_create_failed'));
        setSealing(false); sealingRef.current = false; return;
      }
      const capId = (data as any).id as string;

      // Upload each stop's local media once, then persist all stops in ONE call.
      const persisted: TrailStop[] = [];
      for (let i = 0; i < stops.length; i++) {
        const s = stops[i];
        let photo_url = s.photo_url || null;
        if (s.media_uri) {
          const up = await uploadUri(s.media_uri, user.id);
          if (up) photo_url = up.url;
        }
        persisted.push({
          ordinal: i,
          title: s.title || null,
          location_name: s.location_name || null,
          lat: s.lat ?? null,
          lng: s.lng ?? null,
          content: s.content || null,
          tip: s.tip || null,
          photo_url,
          media_type: s.media_type || 'image',
          estimated_minutes: s.estimated_minutes ?? 30,
        });
      }
      await TrailService.saveStops(capId, persisted);

      setSealedCapId(capId);
      setSealed(true);
    } catch (e: any) {
      Alert.alert(t('createFlow.alert_error'), e?.message || t('createFlow.alert_something_wrong'));
    } finally {
      setSealing(false);
      sealingRef.current = false;
    }
  };

  // ── Sealed success screen (port of the demo's sealed state) ───
  if (sealed) {
    return (
      <View style={[styles.container, styles.sealedRoot, { paddingTop: insets.top, paddingBottom: insets.bottom + SPACING.lg }]}>
        <View style={styles.sealedTrophy}><Ionicons name="trail-sign" size={36} color={accent} /></View>
        <Text style={styles.sealedTitle}>{t('trailEditor.readyTitle', { defaultValue: 'The trail is sealed' })}</Text>
        <Text style={[styles.sealedSub, { color: accent }]}>{title || getCapType('trail').name}</Text>
        <Text style={styles.sealedDesc}>
          {t('trailEditor.readyDesc', { defaultValue: 'Share it so people can follow your route, stop by stop.' })}
        </Text>

        <View style={styles.sealedStats}>
          <Stat value={String(stops.length)} label={t('trailEditor.stat_stops', { defaultValue: 'Stops' })} accent={accent} />
          <View style={styles.statDivider} />
          <Stat value={`${totalDistanceKm.toFixed(1)} km`} label={t('trailEditor.stat_distance', { defaultValue: 'Distance' })} accent={accent} />
          <View style={styles.statDivider} />
          <Stat value={formatTotalTime(totalMinutes)} label={t('trailEditor.stat_time', { defaultValue: 'Time' })} accent={accent} />
        </View>

        <View style={styles.sealedActions}>
          <TouchableOpacity style={[styles.sealedPrimary, { backgroundColor: accent }]} onPress={() => setShowShare(true)} activeOpacity={0.9} accessibilityRole="button">
            <Ionicons name="share-social" size={18} color={COLORS.bg} />
            <Text style={styles.sealedPrimaryText}>{t('trailEditor.shareTrail', { defaultValue: 'Share trail' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sealedSecondary} onPress={() => sealedCapId && onNavigate('Cap', { capId: sealedCapId })} activeOpacity={0.85} accessibilityRole="button">
            <Text style={styles.sealedSecondaryText}>{t('trailEditor.viewTrail', { defaultValue: 'View Trail' })}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.sealedDone} onPress={() => onNavigate('Dashboard')} activeOpacity={0.7} accessibilityRole="button">
            <Text style={styles.sealedDoneText}>{t('common.done', { defaultValue: 'Done' })}</Text>
          </TouchableOpacity>
        </View>

        <ShareSheet
          visible={showShare}
          cap={{ id: sealedCapId, type: 'trail', title, description: desc || undefined, location_name: stops[0]?.location_name || undefined }}
          onClose={() => setShowShare(false)}
        />
      </View>
    );
  }

  const headings = [
    t('trailEditor.step_name', { defaultValue: 'Name your Trail' }),
    t('trailEditor.step_stops', { defaultValue: 'Add your stops' }),
    t('trailEditor.step_seal', { defaultValue: 'Ready to seal' }),
  ];

  return (
    <>
      <WizardShell
        title={getCapType('trail').name} accent={accent} stepIndex={step} steps={STEPS}
        onClose={() => (dirty ? setShowExit(true) : onClose())}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        primaryLabel={step === STEPS - 1 ? t('trailEditor.sealCta', { defaultValue: 'Seal this Trail  →' }) : t('createFlow.next')}
        primaryDisabled={!canAdvance} loading={sealing}
        onPrimary={() => (step === STEPS - 1 ? seal() : setStep((s) => s + 1))}
      >
        {/* Labeled stepper to mirror the demo ("1. Name · 2. Stops · 3. Seal"). */}
        <View style={styles.stepLabels}>
          {[
            t('trailEditor.tab_name', { defaultValue: 'Name' }),
            t('trailEditor.tab_stops', { defaultValue: 'Stops' }),
            t('trailEditor.tab_seal', { defaultValue: 'Seal' }),
          ].map((label, i) => (
            <Text key={label} style={[styles.stepLabel, { color: i <= step ? accent : COLORS.text3 }]}>
              {i + 1}. {label}
            </Text>
          ))}
        </View>

        <Heading>{headings[step]}</Heading>

        {/* ── STEP 0: NAME ── */}
        {step === 0 && (
          <View style={{ gap: SPACING.md }}>
            <Text style={styles.helper}>{t('trailEditor.nameHelper', { defaultValue: 'Give your trail a title and a short description for the person who will walk it.' })}</Text>
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder={t('trailEditor.titlePh', { defaultValue: "e.g. Mom's Neighborhood Trail" })} placeholderTextColor={COLORS.text3} />
            <TextInput style={styles.input} value={desc} onChangeText={(v) => setDesc(v.slice(0, 200))} placeholder={t('trailEditor.descPh', { defaultValue: 'Set the scene — what is this trail about?' })} placeholderTextColor={COLORS.text3} multiline maxLength={200} />
            <Text style={styles.counter}>{desc.length}/200</Text>
            <Text style={styles.label}>{t('trailEditor.coverLabel', { defaultValue: 'Cover photo (optional)' })}</Text>
            <CoverPicker uri={cover} onChange={setCover} accent={accent} />
            <Text style={styles.label}>{t('createFlow.category')}</Text>
            <CategoryPicker options={TRAIL_CATEGORIES} value={category} onChange={setCategory} accent={accent} />
            <Text style={styles.label}>{t('trailEditor.privacyLabel', { defaultValue: 'Who can find this trail?' })}</Text>
            <PrivacyCard active={!isPublic} onPress={() => setIsPublic(false)} icon="lock-closed" title={t('trailEditor.private', { defaultValue: '🔒 Private' })} desc={t('trailEditor.privateDesc', { defaultValue: 'Only the people you invite can find and walk this trail.' })} accent={accent} />
            <PrivacyCard active={isPublic} onPress={() => setIsPublic(true)} icon="earth" title={t('trailEditor.public', { defaultValue: '🌍 Public' })} desc={t('trailEditor.publicDesc', { defaultValue: 'Anyone nearby can discover and walk this trail.' })} accent={accent} />
          </View>
        )}

        {/* ── STEP 1: STOPS ── */}
        {step === 1 && (
          <View style={{ gap: SPACING.md }}>
            <Text style={styles.helper}>{t('trailEditor.stopsHelper', { defaultValue: 'Each stop is a GPS-locked cap. They open in order — stop 2 unlocks only after stop 1 is opened.' })}</Text>

            {stops.map((s, i) => (
              <View key={s.key} style={styles.stopCard}>
                <View style={styles.stopHeader}>
                  <View style={styles.stopHeaderLeft}>
                    <View style={[styles.ordinalBadge, { backgroundColor: accent }]}><Text style={styles.ordinalText}>{i + 1}</Text></View>
                    <Text style={styles.stopEyebrow}>{t('trailEditor.stopNum', { n: i + 1, defaultValue: `Stop ${i + 1}` })}</Text>
                  </View>
                  <View style={styles.stopHeaderActions}>
                    <TouchableOpacity onPress={() => moveStop(i, -1)} disabled={i === 0} style={styles.iconBtn} hitSlop={6}>
                      <Ionicons name="chevron-up" size={18} color={i === 0 ? COLORS.text3 : COLORS.text2} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => moveStop(i, 1)} disabled={i === stops.length - 1} style={styles.iconBtn} hitSlop={6}>
                      <Ionicons name="chevron-down" size={18} color={i === stops.length - 1 ? COLORS.text3 : COLORS.text2} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeStop(s.key)} style={styles.iconBtn} hitSlop={6}>
                      <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TextInput style={styles.stopInput} value={s.title || ''} onChangeText={(v) => updateStop(s.key, { title: v })} placeholder={t('trailEditor.stopTitlePh', { defaultValue: "Stop title (e.g. Joe's Pizza)" })} placeholderTextColor={COLORS.text3} />

                <TouchableOpacity
                  style={styles.locRow}
                  onPress={() => setEditLocKey((k) => (k === s.key ? null : s.key))}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                >
                  <Ionicons name="location" size={14} color={s.location_name ? accent : COLORS.text3} />
                  <Text style={[styles.locText, { color: s.location_name ? COLORS.text : COLORS.text3 }]} numberOfLines={1}>
                    {s.location_name || t('trailEditor.setLocation', { defaultValue: 'Set location' })}
                  </Text>
                  <Ionicons name={editLocKey === s.key ? 'chevron-up' : 'pencil'} size={14} color={COLORS.text3} />
                </TouchableOpacity>
                {editLocKey === s.key && (
                  <View style={{ marginBottom: SPACING.sm }}>
                    <LocationPicker
                      value={s.lat != null && s.lng != null ? { lat: s.lat, lng: s.lng, name: s.location_name || undefined } : null}
                      onChange={(v) => updateStop(s.key, { lat: v.lat, lng: v.lng, location_name: v.name || null })}
                      accent={accent}
                    />
                  </View>
                )}

                <TextInput style={[styles.stopInput, styles.multiline]} value={s.content || ''} onChangeText={(v) => updateStop(s.key, { content: v })} placeholder={t('trailEditor.stopDescPh', { defaultValue: "What's special about this stop? What should they try?" })} placeholderTextColor={COLORS.text3} multiline />

                <Text style={[styles.miniLabel, { color: accent }]}>{t('trailEditor.tipLabel', { defaultValue: 'Pro tip (optional)' })}</Text>
                <TextInput style={[styles.stopInput, { backgroundColor: `${accent}14`, borderColor: `${accent}4D` }]} value={s.tip || ''} onChangeText={(v) => updateStop(s.key, { tip: v })} placeholder={t('trailEditor.tipPlaceholder', { defaultValue: 'Insider advice (e.g. Order the truffle pizza)' })} placeholderTextColor={COLORS.text3} />

                {!!s.photo_url && (
                  <View style={styles.stopThumbWrap}>
                    <Image source={{ uri: s.photo_url }} style={styles.stopThumb} resizeMode="cover" />
                    {s.media_type === 'video' && <View style={styles.thumbPlay}><Ionicons name="play-circle" size={32} color={COLORS.white} /></View>}
                    <TouchableOpacity style={styles.thumbRemove} onPress={() => updateStop(s.key, { photo_url: null, media_uri: null })} hitSlop={6}>
                      <Ionicons name="close" size={14} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.estRow}>
                  <Text style={styles.estLabel}>{t('trailEditor.estLabel', { defaultValue: 'Estimated time:' })}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                    {MINUTE_OPTIONS.map((m) => {
                      const on = (s.estimated_minutes ?? 30) === m;
                      return (
                        <TouchableOpacity key={m} onPress={() => updateStop(s.key, { estimated_minutes: m })} style={[styles.estChip, on && { backgroundColor: `${accent}22`, borderColor: accent }]} activeOpacity={0.8}>
                          <Text style={[styles.estChipText, { color: on ? accent : COLORS.text2 }]}>{m >= 60 ? `${m / 60}h` : `${m}m`}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              </View>
            ))}

            {/* Live stats bar (≥2 stops). */}
            {stops.length >= 2 && (
              <View style={[styles.statsBar, { backgroundColor: `${accent}14`, borderColor: `${accent}33` }]}>
                <Stat value={String(stops.length)} label={t('trailEditor.stat_stops', { defaultValue: 'Stops' })} accent={accent} />
                <View style={styles.statDivider} />
                <Stat value={`${totalDistanceKm.toFixed(1)} km`} label={t('trailEditor.stat_distance', { defaultValue: 'Distance' })} accent={accent} />
                <View style={styles.statDivider} />
                <Stat value={formatTotalTime(totalMinutes)} label={t('trailEditor.stat_time', { defaultValue: 'Time' })} accent={accent} />
              </View>
            )}

            {/* Add-stop inline form. */}
            {adding ? (
              <View style={[styles.addForm, { borderColor: `${accent}4D` }]}>
                <TextInput style={styles.stopInput} value={sTitle} onChangeText={setSTitle} placeholder={t('trailEditor.nameStopPh', { defaultValue: 'Name this stop' })} placeholderTextColor={COLORS.text3} autoFocus />
                <LocationPicker value={sLoc} onChange={setSLoc} accent={accent} />
                <MediaPicker media={sMedia} onChange={setSMedia} accent={accent} />
                <TextInput style={[styles.stopInput, styles.multiline]} value={sMsg} onChangeText={setSMsg} placeholder={t('trailEditor.stopMsgPh', { defaultValue: 'Leave a message for this stop...' })} placeholderTextColor={COLORS.text3} multiline />
                <View style={styles.addFormActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { resetAddForm(); setAdding(false); }} activeOpacity={0.85}>
                    <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.addToTrailBtn, { backgroundColor: accent, opacity: sTitle.trim() ? 1 : 0.4 }]} onPress={addStop} disabled={!sTitle.trim()} activeOpacity={0.9}>
                    <Text style={styles.addToTrailText}>{t('trailEditor.addToTrail', { defaultValue: 'Add to trail  →' })}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity style={[styles.addBtn, { borderColor: `${accent}80`, backgroundColor: `${accent}14` }]} onPress={() => setAdding(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={20} color={accent} />
                <Text style={[styles.addBtnText, { color: accent }]}>{t('trailEditor.addStop', { defaultValue: 'Add a stop' })}</Text>
              </TouchableOpacity>
            )}

            {stops.length < 2 && !adding && (
              <Text style={styles.note}>{t('trailEditor.needTwoStops', { defaultValue: 'Add at least 2 stops to continue' })}</Text>
            )}
          </View>
        )}

        {/* ── STEP 2: SEAL ── */}
        {step === 2 && (
          <View style={{ gap: SPACING.lg }}>
            {/* Summary card */}
            <View style={styles.summaryCard}>
              <View style={[styles.summaryBadge, { backgroundColor: `${accent}22` }]}>
                <Ionicons name="trail-sign" size={16} color={accent} />
                <Text style={[styles.summaryBadgeText, { color: accent }]}>{getCapType('trail').name}</Text>
              </View>
              <Text style={styles.summaryTitle}>{title || getCapType('trail').name}</Text>
              <Text style={styles.summaryDesc}>{desc || t('trailEditor.noDescription', { defaultValue: 'No description.' })}</Text>
              <View style={styles.summaryMetaRow}>
                <Text style={styles.summaryMeta}>{t('trailEditor.nStops', { n: stops.length, defaultValue: `${stops.length} stops` })}</Text>
                <Text style={styles.summaryMeta}>·</Text>
                <Text style={styles.summaryMeta}>{isPublic ? t('trailEditor.public', { defaultValue: '🌍 Public' }) : t('trailEditor.private', { defaultValue: '🔒 Private' })}</Text>
              </View>
            </View>

            {/* Ordered stops list */}
            <View style={styles.stopsReview}>
              {stops.map((s, i) => (
                <View key={s.key} style={[styles.reviewRow, i < stops.length - 1 && styles.reviewRowBorder]}>
                  <View style={[styles.reviewBadge, { borderColor: `${accent}66` }]}><Text style={[styles.reviewBadgeText, { color: accent }]}>{i + 1}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewTitle} numberOfLines={1}>{s.title || t('trailEditor.stopNum', { n: i + 1, defaultValue: `Stop ${i + 1}` })}</Text>
                    {!!s.location_name && <Text style={styles.reviewLoc} numberOfLines={1}>{s.location_name}</Text>}
                  </View>
                </View>
              ))}
            </View>

            {/* Availability */}
            <View>
              <Text style={styles.label}>{t('trailEditor.whenAvailable', { defaultValue: 'When is it available?' })}</Text>
              <View style={{ marginTop: SPACING.sm }}>
                <TimeLock mode={mode} onModeChange={setMode} date={date} onDateChange={setDate} accent={accent} />
              </View>
              <Text style={styles.note}>
                {mode === 'locked'
                  ? t('trailEditor.lockedNote', { defaultValue: 'The trail is sealed until this date. After it, anyone nearby can begin walking it.' })
                  : t('trailEditor.expiresNote', { defaultValue: 'The trail is open now and disappears from the map after this date.' })}
              </Text>
            </View>
          </View>
        )}
      </WizardShell>

      <ExitWarningSheet
        visible={showExit}
        onCancel={() => setShowExit(false)}
        onDiscard={() => { setShowExit(false); onClose(); }}
        onSaveDraft={async () => { await DraftService.save('trail', { title, desc, category, isPublic, stops }); setShowExit(false); onClose(); }}
      />
    </>
  );
};

const Stat: React.FC<{ value: string; label: string; accent: string }> = ({ value, label, accent }) => (
  <View style={styles.stat}>
    <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const PrivacyCard: React.FC<{ active: boolean; onPress: () => void; icon: keyof typeof Ionicons.glyphMap; title: string; desc: string; accent: string }> = ({ active, onPress, title, desc, accent }) => (
  <TouchableOpacity style={[styles.privacyCard, active && { borderColor: accent, backgroundColor: `${accent}14` }]} onPress={onPress} activeOpacity={0.85}>
    <View style={styles.privacyTop}>
      <Text style={[styles.privacyTitle, { color: active ? accent : COLORS.text }]}>{title}</Text>
      {active && <Ionicons name="checkmark-circle" size={18} color={accent} />}
    </View>
    <Text style={styles.privacyDesc}>{desc}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  // Stepper labels
  stepLabels: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  stepLabel: { ...font('eyebrow') },

  helper: { ...font('body'), color: COLORS.text2 },
  titleInput: { ...font('title'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  input: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, minHeight: 80, textAlignVertical: 'top' },
  counter: { ...font('caption'), color: COLORS.text3, alignSelf: 'flex-end', marginTop: -SPACING.sm },
  label: { ...font('eyebrow'), color: COLORS.text2 },

  // Privacy cards
  privacyCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md },
  privacyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  privacyTitle: { ...font('bodyBold') },
  privacyDesc: { ...font('caption'), color: COLORS.text3 },

  // Stop cards
  stopCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.sm },
  stopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stopHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  stopHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ordinalBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ordinalText: { ...font('labelBold'), color: COLORS.bg },
  stopEyebrow: { ...font('eyebrow'), color: COLORS.text3 },
  iconBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stopInput: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md },
  locText: { ...font('caption'), flex: 1 },
  miniLabel: { ...font('eyebrow') },
  stopThumbWrap: { borderRadius: RADIUS.md, overflow: 'hidden' },
  stopThumb: { width: '100%', height: 140, backgroundColor: COLORS.bg3 },
  thumbPlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  thumbRemove: { position: 'absolute', top: SPACING.sm, right: SPACING.sm, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center' },
  estRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  estLabel: { ...font('caption'), color: COLORS.text3 },
  estChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  estChipText: { ...font('label') },

  // Stats bar
  statsBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: SPACING.md },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { ...font('subtitle') },
  statLabel: { ...font('eyebrow'), color: COLORS.text3, marginTop: 2 },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: COLORS.border },

  // Add-stop form
  addForm: { backgroundColor: COLORS.card, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md },
  addFormActions: { flexDirection: 'row', gap: SPACING.sm },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg3 },
  cancelBtnText: { ...font('labelBold'), color: COLORS.text2 },
  addToTrailBtn: { flex: 2, alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  addToTrailText: { ...font('labelBold'), color: COLORS.bg },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderStyle: 'dashed' },
  addBtnText: { ...font('labelBold') },
  note: { ...font('caption'), color: COLORS.text3, textAlign: 'center', marginTop: SPACING.sm },

  // Seal summary
  summaryCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, padding: SPACING.lg },
  summaryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.pill, marginBottom: SPACING.md },
  summaryBadgeText: { ...font('eyebrow') },
  summaryTitle: { ...font('title'), color: COLORS.text, marginBottom: 4 },
  summaryDesc: { ...font('body'), color: COLORS.text2, marginBottom: SPACING.sm },
  summaryMetaRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  summaryMeta: { ...font('labelBold'), color: COLORS.text3 },
  stopsReview: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.xl, paddingHorizontal: SPACING.md },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.sm },
  reviewRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border },
  reviewBadge: { width: 24, height: 24, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  reviewBadgeText: { ...font('labelBold') },
  reviewTitle: { ...font('bodyBold'), color: COLORS.text },
  reviewLoc: { ...font('caption'), color: COLORS.text3 },

  // Sealed success
  sealedRoot: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  sealedTrophy: { width: 72, height: 72, borderRadius: 36, backgroundColor: `${COLORS.gold}22`, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  sealedTitle: { ...font('display'), color: COLORS.text, textAlign: 'center' },
  sealedSub: { ...font('bodyBold'), marginTop: SPACING.sm },
  sealedDesc: { ...font('body'), color: COLORS.text2, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg, paddingHorizontal: SPACING.md },
  sealedStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', alignSelf: 'stretch', backgroundColor: `${COLORS.gold}14`, borderWidth: 1, borderColor: `${COLORS.gold}33`, borderRadius: RADIUS.lg, paddingVertical: SPACING.md, marginBottom: SPACING.xl },
  sealedActions: { alignSelf: 'stretch', gap: SPACING.sm },
  sealedPrimary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: RADIUS.lg },
  sealedPrimaryText: { ...font('bodyBold'), color: COLORS.bg },
  sealedSecondary: { alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg3 },
  sealedSecondaryText: { ...font('labelBold'), color: COLORS.text },
  sealedDone: { alignItems: 'center', paddingVertical: SPACING.md },
  sealedDoneText: { ...font('label'), color: COLORS.text2 },
});

export default TrailCreate;
