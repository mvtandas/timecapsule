import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { getCapType } from '../../../constants/capTypes';
import { CapsuleService } from '../../../services/capsuleService';
import { MediaService } from '../../../services/mediaService';
import { DraftService } from '../../../services/draftService';
import { supabase } from '../../../lib/supabase';
import { formatDate } from '../../../utils/dateUtils';
import { useT } from '../../../i18n';
import WizardShell from './WizardShell';
import UserPicker, { PickedUser } from './UserPicker';
import MediaPicker, { PickedMedia } from './MediaPicker';
import LocationPicker, { PickedLocation } from './LocationPicker';
import TimeLock from './TimeLock';
import ExitWarningSheet from './ExitWarningSheet';

interface Props {
  onClose: () => void;   // back to type picker / exit
  onSealed: () => void;  // after a successful seal
}

const STEPS = 5; // To · Message · Location · Time · Seal

/** Whisper create wizard (demo WCreate): private, recipient-locked, time-locked. */
const WhisperCreate: React.FC<Props> = ({ onClose, onSealed }) => {
  const t = useT();
  const accent = getCapType('whisper').color;
  const [step, setStep] = useState(0);
  const [recipient, setRecipient] = useState<PickedUser[]>([]);
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [text, setText] = useState('');
  const [loc, setLoc] = useState<PickedLocation | null>(null);
  const [hint, setHint] = useState('');
  const [openDate, setOpenDate] = useState<Date | null>(null);
  const [sealing, setSealing] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const dirty = !!(recipient.length || media || text || loc || hint || openDate);
  const canAdvance =
    step === 0 ? recipient.length > 0 :
    step === 1 ? !!(text.trim() || media) :
    step === 2 ? !!loc :
    step === 3 ? !!openDate :
    true;

  const headings = [t('createFlow.w_to'), t('createFlow.w_message'), t('createFlow.w_location'), t('createFlow.w_time'), t('createFlow.w_review')];

  const requestClose = () => { if (dirty) setShowExit(true); else onClose(); };

  const seal = async () => {
    try {
      setSealing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_must_be_logged_in')); setSealing(false); return; }
      let media_url: string | null = null;
      let media_type: 'image' | 'video' | 'audio' | 'none' = 'none';
      if (media) {
        const up = await MediaService.uploadMedia(media.uri, user.id, `tmp_${Date.now()}`);
        if (!up) { Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_create_failed')); setSealing(false); return; }
        media_url = up.url; media_type = up.type;
      }
      const recip = recipient[0];
      const { error } = await CapsuleService.createCapsule({
        type: 'whisper', title: getCapType('whisper').name, description: text || null,
        lat: loc!.lat, lng: loc!.lng, location_name: loc!.name || null, location_hint: hint || null,
        open_at: openDate!.toISOString(), is_locked: true, status: 'sealed',
        is_public: false, is_anonymous: false,
        recipient_id: recip?.isSelf ? user.id : (recip?.id || null), is_self_whisper: !!recip?.isSelf,
        media_url, media_type,
      });
      if (error) { Alert.alert(t('createFlow.alert_error'), (error as any)?.message || t('createFlow.alert_create_failed')); setSealing(false); return; }
      onSealed();
    } catch (e: any) {
      Alert.alert(t('createFlow.alert_error'), e?.message || t('createFlow.alert_something_wrong'));
      setSealing(false);
    }
  };

  return (
    <>
      <WizardShell
        title={getCapType('whisper').name}
        accent={accent}
        stepIndex={step}
        steps={STEPS}
        onClose={requestClose}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        primaryLabel={step === STEPS - 1 ? t('createFlow.seal') : t('createFlow.next')}
        primaryDisabled={!canAdvance}
        loading={sealing}
        onPrimary={() => (step === STEPS - 1 ? seal() : setStep((s) => s + 1))}
      >
        <Text style={styles.heading}>{headings[step]}</Text>

        {step === 0 && (
          <UserPicker selected={recipient} onChange={setRecipient} allowSelf accent={accent} />
        )}

        {step === 1 && (
          <View style={{ gap: SPACING.md }}>
            <TextInput
              style={styles.textArea}
              value={text}
              onChangeText={setText}
              placeholder={t('createFlow.w_message_ph')}
              placeholderTextColor={COLORS.text3}
              multiline
              maxLength={500}
            />
            <MediaPicker media={media} onChange={setMedia} accent={accent} />
          </View>
        )}

        {step === 2 && (
          <View style={{ gap: SPACING.md }}>
            <LocationPicker value={loc} onChange={setLoc} accent={accent} />
            <TextInput
              style={styles.input}
              value={hint}
              onChangeText={setHint}
              placeholder={t('createFlow.w_hint_ph')}
              placeholderTextColor={COLORS.text3}
              maxLength={80}
            />
          </View>
        )}

        {step === 3 && (
          <TimeLock mode="locked" onModeChange={() => {}} date={openDate} onDateChange={setOpenDate} allowExpires={false} accent={accent} />
        )}

        {step === 4 && (
          <View style={styles.review}>
            <Row label={t('createFlow.r_to')} value={recipient[0]?.isSelf ? t('createFlow.you') : (recipient[0]?.display_name || `@${recipient[0]?.username}` || t('createFlow.someone'))} />
            <Row label={t('createFlow.r_opens')} value={openDate ? formatDate(openDate.toISOString()) : '—'} />
            <Row label={t('createFlow.r_location')} value={loc?.name || t('createFlow.pinnedLocation')} />
            <Row label={t('createFlow.r_message')} value={text ? (text.length > 40 ? text.slice(0, 40) + '…' : text) : (media ? t('createFlow.media_attached') : '—')} />
          </View>
        )}
      </WizardShell>

      <ExitWarningSheet
        visible={showExit}
        onCancel={() => setShowExit(false)}
        onDiscard={() => { setShowExit(false); onClose(); }}
        onSaveDraft={async () => {
          await DraftService.save('whisper', { text, hint, recipient: recipient[0]?.id, openDate: openDate?.toISOString() });
          setShowExit(false); onClose();
        }}
      />
    </>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.reviewRow}>
    <Text style={styles.reviewLabel}>{label}</Text>
    <Text style={styles.reviewValue} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  heading: { ...font('title'), color: COLORS.text, marginBottom: SPACING.lg },
  textArea: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, minHeight: 120, textAlignVertical: 'top' },
  input: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  review: { gap: SPACING.sm },
  reviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: SPACING.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: COLORS.border, gap: SPACING.lg },
  reviewLabel: { ...font('label'), color: COLORS.text2 },
  reviewValue: { ...font('bodyBold'), color: COLORS.text, flexShrink: 1, textAlign: 'right' },
});

export default WhisperCreate;
