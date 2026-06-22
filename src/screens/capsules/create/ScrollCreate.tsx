import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert } from 'react-native';
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
import TimeLock, { TimeMode } from './TimeLock';
import ExitWarningSheet from './ExitWarningSheet';
import ScrollBlockEditor, { ScrollBlock } from './ScrollBlockEditor';
import { Heading, ReviewRow, CategoryPicker, SCROLL_CATEGORIES, uploadUri } from './CreateBits';

interface Props { onClose: () => void; onSealed: () => void }
const STEPS = 4; // About · Write · Location · Seal

/** Scroll wizard (demo SCreate): a blog/article sealed to a place. */
const ScrollCreate: React.FC<Props> = ({ onClose, onSealed }) => {
  const t = useT();
  const accent = getCapType('scroll').color;
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [cover, setCover] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<ScrollBlock[]>([{ id: 'first', type: 'text', text: '' }]);
  const [loc, setLoc] = useState<PickedLocation | null>(null);
  const [detail, setDetail] = useState('');
  const [mode, setMode] = useState<TimeMode>('locked');
  const [date, setDate] = useState<Date | null>(null);
  const [sealing, setSealing] = useState(false);
  const [showExit, setShowExit] = useState(false);

  const hasContent = blocks.some((b) => (b.text && b.text.trim()) || b.uri || (b.url && b.url.trim()));
  const dirty = !!(title || cover || hasContent || loc || detail);
  const canAdvance = step === 0 ? !!title.trim() : step === 1 ? hasContent : step === 2 ? !!loc : true;
  const headings = [t('createFlow.s_about'), t('createFlow.s_write'), t('createFlow.w_location'), t('createFlow.w_review')];

  const seal = async () => {
    try {
      setSealing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_must_be_logged_in')); setSealing(false); return; }
      let cover_photo_url: string | null = null;
      if (cover) { const up = await uploadUri(cover, user.id); if (up) cover_photo_url = up.url; }
      // upload any local block photos, swap uri → public url
      const body: ScrollBlock[] = [];
      for (const b of blocks) {
        if ((b.type === 'photo' || b.type === 'video') && b.uri && b.uri.startsWith('file')) {
          const up = await uploadUri(b.uri, user.id);
          body.push({ ...b, uri: up?.url || b.uri });
        } else body.push(b);
      }
      const excerpt = blocks.find((b) => b.type === 'text' && b.text)?.text?.slice(0, 160) || title;
      const locked = mode === 'locked' && !!date;
      const { error } = await CapsuleService.createCapsule({
        type: 'scroll', title: title || getCapType('scroll').name, description: excerpt, body,
        category: category || undefined, cover_photo_url,
        lat: loc!.lat, lng: loc!.lng, location_name: loc!.name || null, location_hint: detail || null,
        open_at: locked ? date!.toISOString() : null, expires_at: mode === 'expires' && date ? date.toISOString() : null,
        is_public: true, is_anonymous: false, is_locked: locked, status: locked ? 'sealed' : 'open',
      });
      if (error) { Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_create_failed')); setSealing(false); return; }
      onSealed();
    } catch { Alert.alert(t('createFlow.alert_error'), t('createFlow.alert_something_wrong')); setSealing(false); }
  };

  return (
    <>
      <WizardShell
        title={getCapType('scroll').name} accent={accent} stepIndex={step} steps={STEPS}
        onClose={() => (dirty ? setShowExit(true) : onClose())}
        onBack={() => setStep((s) => Math.max(0, s - 1))}
        primaryLabel={step === STEPS - 1 ? t('createFlow.publish') : t('createFlow.next')}
        primaryDisabled={!canAdvance} loading={sealing}
        onPrimary={() => (step === STEPS - 1 ? seal() : setStep((s) => s + 1))}
      >
        <Heading>{headings[step]}</Heading>

        {step === 0 && (
          <View style={{ gap: SPACING.md }}>
            <TextInput style={styles.titleInput} value={title} onChangeText={setTitle} placeholder={t('createFlow.s_title_ph')} placeholderTextColor={COLORS.text3} />
            <Text style={styles.label}>{t('createFlow.category')}</Text>
            <CategoryPicker options={SCROLL_CATEGORIES} value={category} onChange={setCategory} accent={accent} />
            <CoverPicker uri={cover} onChange={setCover} accent={accent} />
          </View>
        )}
        {step === 1 && <ScrollBlockEditor blocks={blocks} onChange={setBlocks} accent={accent} />}
        {step === 2 && (
          <View style={{ gap: SPACING.md }}>
            <LocationPicker value={loc} onChange={setLoc} accent={accent} />
            <TextInput style={styles.input} value={detail} onChangeText={setDetail} placeholder={t('createFlow.s_detail_ph')} placeholderTextColor={COLORS.text3} maxLength={80} />
          </View>
        )}
        {step === 3 && (
          <View style={{ gap: SPACING.lg }}>
            <TimeLock mode={mode} onModeChange={setMode} date={date} onDateChange={setDate} accent={accent} />
            <View>
              <ReviewRow label={t('createFlow.r_location')} value={loc?.name || t('createFlow.pinnedLocation')} />
              <ReviewRow label={t('createFlow.category')} value={category || '—'} />
              <ReviewRow label={t('createFlow.s_sections')} value={String(blocks.length)} />
            </View>
          </View>
        )}
      </WizardShell>

      <ExitWarningSheet
        visible={showExit}
        onCancel={() => setShowExit(false)}
        onDiscard={() => { setShowExit(false); onClose(); }}
        onSaveDraft={async () => { await DraftService.save('scroll', { title, blocks, detail }); setShowExit(false); onClose(); }}
      />
    </>
  );
};

const styles = StyleSheet.create({
  titleInput: { ...font('title'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  input: { ...font('body'), color: COLORS.text, backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12 },
  label: { ...font('eyebrow'), color: COLORS.text2 },
});

export default ScrollCreate;
