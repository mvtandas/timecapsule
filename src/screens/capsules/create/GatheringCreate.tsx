import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { getCapType } from '../../../constants/capTypes';
import { CapsuleService } from '../../../services/capsuleService';
import { DraftService } from '../../../services/draftService';
import { supabase } from '../../../lib/supabase';
import { formatDate } from '../../../utils/dateUtils';
import { useT } from '../../../i18n';
import WizardShell from './WizardShell';
import LocationPicker, { PickedLocation } from './LocationPicker';
import CoverPicker from './CoverPicker';
import MediaPicker, { PickedMedia } from './MediaPicker';
import UserPicker, { PickedUser } from './UserPicker';
import TimeLock from './TimeLock';
import ExitWarningSheet from './ExitWarningSheet';
import { Heading, ReviewRow, ToggleRow, CategoryPicker, TRAIL_CATEGORIES, uploadUri } from './CreateBits';

interface Props { onClose: () => void; onSealed: () => void }
const STEPS = 4; // Setup · Where&When · Moment · Seal

/** Gathering wizard (demo GCreate): many voices, one cap; blind/open reveal. */
const GatheringCreate: React.FC<Props> = ({ onClose, onSealed }) => {
  const t = useT();
  const accent = getCapType('gathering').color;
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [blind, setBlind] = useState(false);
  const [joinReq, setJoinReq] = useState(false);
  const [loc, setLoc] = useState<PickedLocation | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [myMedia, setMyMedia] = useState<PickedMedia | null>(null);
  const [myText, setMyText] = useState('');
  const [invites, setInvites] = useState<PickedUser[]>([]);
  const [sealing, setSealing] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const dirty = !!(title || cover || loc || date || myMedia || myText || invites.length);
  const canAdvance = step === 0 ? !!title.trim() : step === 1 ? !!(loc && date) : true;
  const headings = [t('createFlow.g_setup'), t('createFlow.g_where'), t('createFlow.g_moment'), t('createFlow.w_review')];

  const seal = async () => {
    try {
      setSealing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_must_be_logged_in')); setSealing(false); return; }
      let cover_photo_url: string | null = null, media_url: string | null = null, media_type: 'image' | 'video' | 'audio' | 'none' = 'none';
      if (cover) { const up = await uploadUri(cover, user.id); if (up) cover_photo_url = up.url; }
      if (myMedia) { const up = await uploadUri(myMedia.uri, user.id); if (up) { media_url = up.url; media_type = up.type; } }
      const { data: created, error } = await CapsuleService.createCapsule({
        type: 'gathering', title: title || getCapType('gathering').name, description: myText || null,
        cover_photo_url, category: category || undefined,
        lat: loc!.lat, lng: loc!.lng, location_name: loc!.name || null,
        open_at: date!.toISOString(), is_locked: true, status: 'sealed',
        is_public: isPublic, is_anonymous: false, gathering_blind: blind, allow_join_requests: joinReq,
        media_url, media_type,
      });
      if (error || !created) { Alert.alert(t('createFlow.alert_error'), (error as any)?.message || t('createFlow.alert_create_failed')); setSealing(false); return; }
      // Persist invites so invitees can access the gathering (incl. private ones).
      // Requires the "Owners can share their capsules" RLS policy (migration 0009).
      const inviteeIds = invites.map((u) => u.id).filter((id) => !!id && id !== user.id);
      if (inviteeIds.length) {
        try {
          await supabase.from('shared_capsules').insert(
            inviteeIds.map((uid) => ({ capsule_id: (created as any).id, user_id: uid })) as any,
          );
        } catch { /* invites best-effort; cap is already created */ }
      }
      onSealed();
    } catch (e: any) { Alert.alert(t('createFlow.alert_error'), e?.message || t('createFlow.alert_something_wrong')); setSealing(false); }
  };

  return (
    <>
      <WizardShell
        title={getCapType('gathering').name} accent={accent} stepIndex={step} steps={STEPS}
        onClose={() => (dirty ? setShowExit(true) : onClose())}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        primaryLabel={step === STEPS - 1 ? t('createFlow.seal') : t('createFlow.next')}
        primaryDisabled={!canAdvance} loading={sealing}
        onPrimary={() => (step === STEPS - 1 ? seal() : setStep((s) => s + 1))}
      >
        <Heading>{headings[step]}</Heading>

        {step === 0 && (
          <View style={{ gap: SPACING.md }}>
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder={t('createFlow.g_title_ph')} placeholderTextColor={COLORS.text3} />
            <CoverPicker uri={cover} onChange={setCover} accent={accent} />
            <Text style={styles.label}>{t('createFlow.category')}</Text>
            <CategoryPicker options={TRAIL_CATEGORIES} value={category} onChange={setCategory} accent={accent} />
            <View style={styles.modeRow}>
              <ModeCard active={blind} onPress={() => setBlind(true)} icon="eye-off-outline" title={t('createFlow.g_blind')} desc={t('createFlow.g_blind_desc')} accent={accent} />
              <ModeCard active={!blind} onPress={() => setBlind(false)} icon="eye-outline" title={t('createFlow.g_open')} desc={t('createFlow.g_open_desc')} accent={accent} />
            </View>
            <View style={styles.card}>
              <ToggleRow label={t('createFlow.g_public')} desc={t('createFlow.g_public_desc')} value={isPublic} onChange={setIsPublic} accent={accent} />
              <ToggleRow label={t('createFlow.g_joinreq')} value={joinReq} onChange={setJoinReq} accent={accent} />
            </View>
          </View>
        )}
        {step === 1 && (
          <View style={{ gap: SPACING.lg }}>
            <LocationPicker value={loc} onChange={setLoc} accent={accent} />
            <TimeLock mode="locked" onModeChange={() => {}} date={date} onDateChange={setDate} allowExpires={false} accent={accent} />
          </View>
        )}
        {step === 2 && (
          <View style={{ gap: SPACING.md }}>
            <Text style={styles.label}>{t('createFlow.g_your_moment')}</Text>
            <TextInput style={styles.input} value={myText} onChangeText={setMyText} placeholder={t('createFlow.g_moment_ph')} placeholderTextColor={COLORS.text3} multiline maxLength={200} />
            <MediaPicker media={myMedia} onChange={setMyMedia} accent={accent} />
            <Text style={[styles.label, { marginTop: SPACING.sm }]}>{t('createFlow.g_invite')}</Text>
            <UserPicker selected={invites} onChange={setInvites} multi accent={accent} />
          </View>
        )}
        {step === 3 && (
          <View>
            <ReviewRow label={t('createFlow.g_contributors')} value={invites.length ? t('createFlow.g_you_plus', { n: invites.length }) : t('createFlow.g_just_you')} />
            <ReviewRow label={t('createFlow.r_location')} value={loc?.name || t('createFlow.pinnedLocation')} />
            <ReviewRow label={t('createFlow.r_opens')} value={date ? formatDate(date.toISOString()) : '—'} />
            <ReviewRow label={t('createFlow.g_mode')} value={blind ? t('createFlow.g_blind') : t('createFlow.g_open')} />
          </View>
        )}
      </WizardShell>

      <ExitWarningSheet
        visible={showExit}
        onCancel={() => setShowExit(false)}
        onDiscard={() => { setShowExit(false); onClose(); }}
        onSaveDraft={async () => { await DraftService.save('gathering', { title, myText, category }); setShowExit(false); onClose(); }}
      />
    </>
  );
};

const ModeCard: React.FC<{ active: boolean; onPress: () => void; icon: keyof typeof Ionicons.glyphMap; title: string; desc: string; accent: string }> = ({ active, onPress, icon, title, desc, accent }) => (
  <TouchableOpacity style={[styles.mode, active && { backgroundColor: `${accent}22`, borderColor: accent }]} onPress={onPress} activeOpacity={0.85}>
    <Ionicons name={icon} size={18} color={active ? accent : COLORS.text2} />
    <Text style={[styles.modeTitle, { color: active ? accent : COLORS.text }]}>{title}</Text>
    <Text style={styles.modeDesc}>{desc}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  titleInput: { ...font('title'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  input: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, minHeight: 90, textAlignVertical: 'top' },
  label: { ...font('eyebrow'), color: COLORS.text2 },
  card: { backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md },
  modeRow: { flexDirection: 'row', gap: SPACING.sm },
  mode: { flex: 1, gap: 4, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border },
  modeTitle: { ...font('bodyBold') },
  modeDesc: { ...font('caption'), color: COLORS.text2 },
});

export default GatheringCreate;
