import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AchievementService, type AchievementSummary, type Achievement } from '../../services/achievementService';
import { COLORS, font } from '../../constants/theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useT } from '../../i18n';

interface AchievementsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

const AchievementsScreen = ({ onGoBack }: AchievementsScreenProps) => {
  const t = useT();
  const [summary, setSummary] = useState<AchievementSummary | null>(null);

  useEffect(() => {
    AchievementService.compute().then(setSummary);
  }, []);

  const tierColor = (tierId: string) =>
    summary?.tiers.find((t) => t.id === tierId)?.color || COLORS.ember;

  const renderBadge = (a: Achievement) => {
    const color = tierColor(a.tier);
    const pct = Math.min(1, a.current / a.total);
    return (
      <View key={a.id} style={[styles.badge, !a.unlocked && styles.badgeLocked]}>
        <View style={[styles.badgeIcon, { backgroundColor: a.unlocked ? `${color}22` : COLORS.bg3 }]}>
          <Ionicons name={a.icon as any} size={22} color={a.unlocked ? color : COLORS.text3} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.badgeTop}>
            <Text style={[font('bodyBold'), { color: a.unlocked ? COLORS.text : COLORS.text2 }]}>{t('achievements.name_' + a.id)}</Text>
            <Text style={[font('micro'), { color }]}>{t('achievements.pts', { points: a.points })}</Text>
          </View>
          <Text style={[font('caption'), { color: COLORS.text3 }]}>{t('achievements.desc_' + a.id)}</Text>
          {!a.unlocked && a.total > 1 && (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
            </View>
          )}
        </View>
        {a.unlocked && <Ionicons name="checkmark-circle" size={20} color={color} />}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('achievements.title')} onBack={onGoBack} borderBottom />

      {!summary ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.ember} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={[font('display'), { color: COLORS.text }]}>
              {summary.unlockedCount}
              <Text style={{ color: COLORS.text3 }}> / {summary.totalCount}</Text>
            </Text>
            <Text style={[font('caption'), { color: COLORS.text2 }]}>
              {t('achievements.pointsEarned', { points: summary.points, max: summary.maxPoints })}
            </Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(summary.unlockedCount / summary.totalCount) * 100}%`, backgroundColor: COLORS.ember },
                ]}
              />
            </View>
          </View>

          {summary.tiers.map((tier) => {
            const items = summary.achievements.filter((a) => a.tier === tier.id);
            if (items.length === 0) return null;
            return (
              <View key={tier.id} style={{ marginTop: 22 }}>
                <View style={styles.tierHeader}>
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <Text style={[font('eyebrow'), { color: tier.color }]}>{t('achievements.tier_' + tier.id)}</Text>
                </View>
                <View style={{ gap: 10 }}>{items.map(renderBadge)}</View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    alignItems: 'center',
    gap: 6,
  },
  tierHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tierDot: { width: 8, height: 8, borderRadius: 4 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
  },
  badgeLocked: { opacity: 0.6 },
  badgeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  badgeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.bg3,
    overflow: 'hidden',
    marginTop: 8,
    width: '100%',
  },
  progressFill: { height: '100%', borderRadius: 3 },
});

export default AchievementsScreen;
