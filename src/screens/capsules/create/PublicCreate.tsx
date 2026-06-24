import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { getCapType } from '../../../constants/capTypes';
import { CapsuleService } from '../../../services/capsuleService';
import { supabase } from '../../../lib/supabase';
import { formatDate } from '../../../utils/dateUtils';
import { useT } from '../../../i18n';
import WizardShell from './WizardShell';
import MediaPicker, { PickedMedia } from './MediaPicker';
import LocationPicker, { PickedLocation } from './LocationPicker';
import CoverPicker from './CoverPicker';
import TimeLock, { TimeMode } from './TimeLock';
import ExitWarningSheet from './ExitWarningSheet';
import { Heading, ReviewRow, ToggleRow, uploadUri } from './CreateBits';
import { DraftService } from '../../../services/draftService';

interface Props { onClose: () => void; onSealed: () => void }
const STEPS = 4; // Content · Location · Options · Seal

/** Public cap wizard (demo PCreate): open to all, reactions/comments, time-lock. */
const PublicCreate: React.FC<Props> = ({ onClose, onSealed }) => {
  const t = useT();
  const accent = getCapType('public').color;
  const [step, setStep] = useState(0);
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [text, setText] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [loc, setLoc] = useState<PickedLocation | null>(null);
  const [hint, setHint] = useState('');
  const [mode, setMode] = useState<TimeMode>('locked');
  const [date, setDate] = useState<Date | null>(null);
  const [reactions, setReactions] = useState(true);
  const [comments, setComments] = useState(true);
  const [sealing, setSealing] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const dirty = !!(media || text || cover || loc || hint || date);
  const canAdvance = step === 0 ? !!(text.trim() || media) : step === 1 ? !!loc : step === 2 ? !!date : true;
  const headings = [t('createFlow.p_content'), t('createFlow.w_location'), t('createFlow.p_options'), t('createFlow.w_review')];

  const seal = async () => {
    try {
      setSealing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_must_be_logged_in')); setSealing(false); return; }
      let media_url: string | null = null, media_type: 'image' | 'video' | 'audio' | 'none' = 'none', cover_photo_url: string | null = null;
      if (media) { const up = await uploadUri(media.uri, user.id); if (up) { media_url = up.url; media_type = up.type; } }
      if (cover) { const up = await uploadUri(cover, user.id); if (up) cover_photo_url = up.url; }
      const locked = mode === 'locked';
      const { error } = await CapsuleService.createCapsule({
        type: 'public', title: (text && text.split('\n')[0].slice(0, 80)) || getCapType('public').name, description: text || null,
        lat: loc!.lat, lng: loc!.lng, location_name: loc!.name || null, location_hint: hint || null,
        open_at: locked ? date!.toISOString() : null, expires_at: !locked ? date!.toISOString() : null,
        is_public: true, is_anonymous: false, is_locked: locked, status: locked ? 'sealed' : 'open',
        allow_reactions: reactions, allow_comments: comments, cover_photo_url, media_url, media_type,
      });
      if (error) { Alert.alert(t('createFlow.alert_error'), (error as any)?.message || t('createFlow.alert_create_failed')); setSealing(false); return; }
      onSealed();
    } catch (e: any) { Alert.alert(t('createFlow.alert_error'), e?.message || t('createFlow.alert_something_wrong')); setSealing(false); }
  };

  return (
    <>
      <WizardShell
        title={getCapType('public').name} accent={accent} stepIndex={step} steps={STEPS}
        onClose={() => (dirty ? setShowExit(true) : onClose())}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        primaryLabel={step === STEPS - 1 ? t('createFlow.seal') : t('createFlow.next')}
        primaryDisabled={!canAdvance} loading={sealing}
        onPrimary={() => (step === STEPS - 1 ? seal() : setStep((s) => s + 1))}
      >
        <Heading>{headings[step]}</Heading>

        {step === 0 && (
          <View style={{ gap: SPACING.md }}>
            <TextInput style={styles.textArea} value={text} onChangeText={setText} placeholder={t('createFlow.p_content_ph')} placeholderTextColor={COLORS.text3} multiline maxLength={500} />
            <MediaPicker media={media} onChange={setMedia} accent={accent} />
            <CoverPicker uri={cover} onChange={setCover} accent={accent} />
          </View>
        )}
        {step === 1 && (
          <View style={{ gap: SPACING.md }}>
            <LocationPicker value={loc} onChange={setLoc} accent={accent} />
            <TextInput style={styles.input} value={hint} onChangeText={setHint} placeholder={t('createFlow.w_hint_ph')} placeholderTextColor={COLORS.text3} maxLength={80} />
          </View>
        )}
        {step === 2 && (
          <View style={{ gap: SPACING.lg }}>
            <TimeLock mode={mode} onModeChange={setMode} date={date} onDateChange={setDate} accent={accent} />
            <View style={styles.card}>
              <ToggleRow label={t('createFlow.allowReactions')} value={reactions} onChange={setReactions} accent={accent} />
              <ToggleRow label={t('createFlow.allowComments')} value={comments} onChange={setComments} accent={accent} />
            </View>
          </View>
        )}
        {step === 3 && (
          <View>
            <ReviewRow label={t('createFlow.r_location')} value={loc?.name || t('createFlow.pinnedLocation')} />
            <ReviewRow label={mode === 'locked' ? t('createFlow.lockedUntil') : t('createFlow.expiresOn')} value={date ? formatDate(date.toISOString()) : '—'} />
            <ReviewRow label={t('createFlow.r_message')} value={text ? (text.length > 40 ? text.slice(0, 40) + '…' : text) : (media ? t('createFlow.media_attached') : '—')} />
            <ReviewRow label={t('createFlow.p_engagement')} value={`${reactions ? '♥' : '—'} · ${comments ? '💬' : '—'}`} />
          </View>
        )}
      </WizardShell>

      <ExitWarningSheet
        visible={showExit}
        onCancel={() => setShowExit(false)}
        onDiscard={() => { setShowExit(false); onClose(); }}
        onSaveDraft={async () => { await DraftService.save('public', { text, hint }); setShowExit(false); onClose(); }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  textArea: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, minHeight: 120, textAlignVertical: 'top' },
  input: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  card: { backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md },
});

export default PublicCreate;
