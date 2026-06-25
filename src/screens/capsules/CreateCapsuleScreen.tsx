import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS, font } from '../../constants/theme';
import { CAP_TYPES, CAP_TYPE_LIST, getCapType, type CapTypeId } from '../../constants/capTypes';
import CapTypeIcon from '../../components/common/CapTypeIcon';
import { useT } from '../../i18n';
import WhisperCreate from './create/WhisperCreate';
import PublicCreate from './create/PublicCreate';
import ScrollCreate from './create/ScrollCreate';
import GatheringCreate from './create/GatheringCreate';
import TrailCreate from './create/TrailCreate';

const LAUNCH = CAP_TYPE_LIST.filter((c) => c.enabled);

interface Props {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
  /** When resuming a draft, jump straight into that type's wizard. */
  initialType?: CapTypeId;
}

/** Create landing: pick a cap type → branch into that type's bespoke wizard. */
const CreateCapsuleScreen = ({ onNavigate, onGoBack, initialType }: Props) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  // Resume straight into the draft's wizard, but only for a recognized cap type;
  // an unknown/stale type falls back to the picker.
  const [type, setType] = useState<CapTypeId | null>(
    initialType && CAP_TYPES[initialType] ? initialType : null,
  );

  const close = () => onGoBack?.();
  const backToPicker = () => setType(null);
  const onSealed = () => onGoBack?.();

  if (type === 'whisper') return <WhisperCreate onClose={backToPicker} onSealed={onSealed} />;
  if (type === 'public') return <PublicCreate onClose={backToPicker} onSealed={onSealed} />;
  if (type === 'scroll') return <ScrollCreate onClose={backToPicker} onSealed={onSealed} />;
  if (type === 'gathering') return <GatheringCreate onClose={backToPicker} onSealed={onSealed} />;
  if (type === 'trail') return (
    <TrailCreate
      onClose={backToPicker}
      onCreated={(capsuleId, trailTitle, trailDesc) => onNavigate('TrailStops', { capsuleId, trailTitle, trailDesc, fromCreate: true })}
    />
  );
  if (type) return <ComingSoon type={type} onClose={backToPicker} />;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={close} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('a11y.close')}>
          <Ionicons name="close" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('createFlow.pick_title')}</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 124 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>{t('createFlow.pick_subtitle')}</Text>
        {LAUNCH.map((ct) => (
          <TouchableOpacity key={ct.id} style={styles.card} onPress={() => setType(ct.id)} activeOpacity={0.85}>
            <View style={[styles.iconWrap, { backgroundColor: `${ct.color}22` }]}>
              <CapTypeIcon size={26} color={ct.color} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.cardTop}>
                <Text style={styles.cardName}>{ct.name}</Text>
                <Text style={[styles.cardSoul, { color: ct.color }]}>{ct.soul}</Text>
              </View>
              <Text style={styles.cardDesc} numberOfLines={2}>{t('createFlow.desc_' + ct.id)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.text3} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const ComingSoon: React.FC<{ type: CapTypeId; onClose: () => void }> = ({ type, onClose }) => {
  const t = useT();
  const insets = useSafeAreaInsets();
  const ct = getCapType(type);
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityRole="button">
          <Ionicons name="chevron-back" size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{ct.name}</Text>
        <View style={styles.iconBtn} />
      </View>
      <View style={styles.soon}>
        <CapTypeIcon size={64} color={ct.color} />
        <Text style={styles.soonTitle}>{t('createFlow.coming_soon_title', { type: ct.name })}</Text>
        <Text style={styles.soonText}>{t('createFlow.coming_soon_text')}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingBottom: SPACING.sm },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { ...font('subtitle'), color: COLORS.text, flex: 1, textAlign: 'center' },
  subtitle: { ...font('body'), color: COLORS.text2, marginBottom: SPACING.lg },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bg3, borderWidth: 1, borderColor: COLORS.borderLight,
    borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.md,
  },
  iconWrap: { width: 48, height: 48, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', gap: SPACING.sm },
  cardName: { ...font('subtitle'), color: COLORS.text },
  cardSoul: { ...font('eyebrow') },
  cardDesc: { ...font('caption'), color: COLORS.text2, marginTop: 2 },
  soon: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, gap: SPACING.md },
  soonTitle: { ...font('title'), color: COLORS.text, textAlign: 'center' },
  soonText: { ...font('body'), color: COLORS.text2, textAlign: 'center' },
});

export default CreateCapsuleScreen;
