import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import { uuidv4 } from '../../../utils/uuid';
import { getCapType } from '../../../constants/capTypes';
import { CapsuleService } from '../../../services/capsuleService';
import { DraftService } from '../../../services/draftService';
import { supabase } from '../../../lib/supabase';
import { formatDate } from '../../../utils/dateUtils';
import { useT } from '../../../i18n';
import WizardShell from './WizardShell';
import CoverPicker from './CoverPicker';
import TimeLock, { TimeMode } from './TimeLock';
import ExitWarningSheet from './ExitWarningSheet';
import { Heading, ReviewRow, ToggleRow, CategoryPicker, TRAIL_CATEGORIES, uploadUri } from './CreateBits';

interface Props {
  onClose: () => void;
  /** Trail caps continue into the stop editor after the cap is created. */
  onCreated: (capsuleId: string, title: string, desc?: string) => void;
}
const STEPS = 2; // Name · Seal (stops added in the next screen)

/** Trail wizard (demo TCreate): name the trail, then continue to add stops. */
const TrailCreate: React.FC<Props> = ({ onClose, onCreated }) => {
  const t = useT();
  const accent = getCapType('trail').color;
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [mode, setMode] = useState<TimeMode>('locked');
  const [date, setDate] = useState<Date | null>(null);
  const [sealing, setSealing] = useState(false);
  const [showExit, setShowExit] = useState(false);
  const capIdRef = useRef(uuidv4());

  const dirty = !!(title || desc || cover);
  const canAdvance = step === 0 ? !!title.trim() : true;
  const headings = [t('createFlow.t_name'), t('createFlow.w_review')];

  const seal = async () => {
    try {
      setSealing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_must_be_logged_in')); setSealing(false); return; }
      let cover_photo_url: string | null = null;
      if (cover) { const up = await uploadUri(cover, user.id); if (up) cover_photo_url = up.url; }
      const locked = mode === 'locked' && !!date;
      const { data, error } = await CapsuleService.createCapsule({
        id: capIdRef.current,
        type: 'trail', title: title || getCapType('trail').name, description: desc || null,
        cover_photo_url, category: category || undefined, is_public: isPublic, is_anonymous: false,
        open_at: locked ? date!.toISOString() : null, expires_at: mode === 'expires' && date ? date.toISOString() : null,
        is_locked: locked, status: locked ? 'sealed' : 'open',
      });
      if (error || !data) { Alert.alert(t('createFlow.alert_error'), (error as any)?.message || t('createFlow.alert_create_failed')); setSealing(false); return; }
      // Clear the spinner before navigating so it can never stay stuck if the
      // push to the stop editor is delayed.
      setSealing(false);
      onCreated((data as any).id, title || getCapType('trail').name, desc || undefined);
    } catch (e: any) { Alert.alert(t('createFlow.alert_error'), e?.message || t('createFlow.alert_something_wrong')); setSealing(false); }
  };

  return (
    <>
      <WizardShell
        title={getCapType('trail').name} accent={accent} stepIndex={step} steps={STEPS}
        onClose={() => (dirty ? setShowExit(true) : onClose())}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        primaryLabel={step === STEPS - 1 ? t('createFlow.t_addStops') : t('createFlow.next')}
        primaryDisabled={!canAdvance} loading={sealing}
        onPrimary={() => (step === STEPS - 1 ? seal() : setStep((s) => s + 1))}
      >
        <Heading>{headings[step]}</Heading>

        {step === 0 && (
          <View style={{ gap: SPACING.md }}>
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder={t('createFlow.t_name_ph')} placeholderTextColor={COLORS.text3} />
            <TextInput style={styles.input} value={desc} onChangeText={setDesc} placeholder={t('createFlow.t_desc_ph')} placeholderTextColor={COLORS.text3} multiline maxLength={200} />
            <CoverPicker uri={cover} onChange={setCover} accent={accent} />
            <Text style={styles.label}>{t('createFlow.category')}</Text>
            <CategoryPicker options={TRAIL_CATEGORIES} value={category} onChange={setCategory} accent={accent} />
            <View style={styles.card}><ToggleRow label={t('createFlow.g_public')} desc={t('createFlow.g_public_desc')} value={isPublic} onChange={setIsPublic} accent={accent} /></View>
          </View>
        )}
        {step === 1 && (
          <View style={{ gap: SPACING.lg }}>
            <TimeLock mode={mode} onModeChange={setMode} date={date} onDateChange={setDate} accent={accent} />
            <View>
              <ReviewRow label={t('createFlow.r_message')} value={title || '—'} />
              <ReviewRow label={t('createFlow.category')} value={category || '—'} />
              <ReviewRow label={mode === 'locked' ? t('createFlow.lockedUntil') : t('createFlow.expiresOn')} value={date ? formatDate(date.toISOString()) : t('createFlow.now')} />
            </View>
            <Text style={styles.note}>{t('createFlow.t_next_note')}</Text>
          </View>
        )}
      </WizardShell>

      <ExitWarningSheet
        visible={showExit}
        onCancel={() => setShowExit(false)}
        onDiscard={() => { setShowExit(false); onClose(); }}
        onSaveDraft={async () => { await DraftService.save('trail', { title, desc, category }); setShowExit(false); onClose(); }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  titleInput: { ...font('title'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  input: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, minHeight: 80, textAlignVertical: 'top' },
  label: { ...font('eyebrow'), color: COLORS.text2 },
  card: { backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md },
  note: { ...font('caption'), color: COLORS.text3 },
});

export default TrailCreate;
