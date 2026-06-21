import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, font } from '../../../constants/theme';
import GlassView from '../../../components/common/GlassView';
import { useT } from '../../../i18n';
import type { AchievementSummary } from '../../../services/achievementService';

const TIER_ORDER = ['explorer', 'keeper', 'wanderer', 'legend'];

interface Props {
  summary: AchievementSummary | null;
  onPress: () => void;
}

/** Compact, tappable gamification strip on a glass card: tier + points + progress. */
const AchievementStrip: React.FC<Props> = ({ summary, onPress }) => {
  const t = useT();

  // Highest tier with at least one unlocked achievement (falls back to first tier).
  let tier = summary?.tiers[0];
  if (summary) {
    const unlocked = new Set(summary.achievements.filter((a) => a.unlocked).map((a) => a.tier));
    for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
      if (unlocked.has(TIER_ORDER[i])) {
        tier = summary.tiers.find((x) => x.id === TIER_ORDER[i]) || tier;
        break;
      }
    }
  }
  const tierColor = tier?.color || COLORS.ember;
  const pct = summary && summary.totalCount ? summary.unlockedCount / summary.totalCount : 0;

  return (
    <TouchableOpacity style={styles.cardWrap} onPress={onPress} activeOpacity={0.85}>
      <GlassView radius={RADIUS.lg} sheen>
        <View style={styles.cardInner}>
          <View style={[styles.iconWrap, { backgroundColor: `${tierColor}22` }]}>
            <Ionicons name="trophy" size={18} color={tierColor} />
          </View>
          <View style={styles.body}>
            <View style={styles.topRow}>
              <Text style={[font('labelBold'), { color: COLORS.text }]}>
                {tier ? t('achievements.tier_' + tier.id) : t('profile.achievements')}
              </Text>
              {!!summary && (
                <Text style={[font('caption'), { color: COLORS.text2 }]}>
                  {t('profile.achPoints', { points: summary.points, max: summary.maxPoints })}
                </Text>
              )}
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: tierColor }]} />
            </View>
          </View>
          <Ionicons name="chevron-forward" size={16} color={COLORS.text3} />
        </View>
      </GlassView>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardWrap: { marginHorizontal: SPACING.lg, marginTop: SPACING.lg },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md },
  iconWrap: { width: 36, height: 36, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 7 },
  track: { height: 5, borderRadius: RADIUS.pill, backgroundColor: COLORS.bg3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: RADIUS.pill },
});

export default AchievementStrip;
