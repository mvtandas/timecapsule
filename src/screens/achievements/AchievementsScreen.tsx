import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { AchievementService, type AchievementSummary, type Achievement } from '../../services/achievementService';
import { COLORS, font } from '../../constants/theme';
import ScreenHeader from '../../components/common/ScreenHeader';
import { useT } from '../../i18n';

interface AchievementsScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

const SEEN_KEY = 'voorcap.seenAchievements';

const AchievementsScreen = ({ onGoBack }: AchievementsScreenProps) => {
  const t = useT();
  const [summary, setSummary] = useState<AchievementSummary | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    AchievementService.compute().then(async (result) => {
      if (cancelled) return;
      setSummary(result);
      try {
        const unlockedIds = result.achievements.filter((a) => a.unlocked).map((a) => a.id);
        const raw = await AsyncStorage.getItem(SEEN_KEY);
        const seen: string[] = raw ? JSON.parse(raw) : [];
        const seenSet = new Set(seen);
        const fresh = unlockedIds.filter((id) => !seenSet.has(id));
        // Persist the current unlocked set as seen.
        await AsyncStorage.setItem(SEEN_KEY, JSON.stringify(unlockedIds));
        // Only celebrate when we've stored a set before (avoid spamming on first view).
        if (raw !== null && fresh.length > 0 && !cancelled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setShowToast(true);
          Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
          toastTimer.current = setTimeout(() => {
            Animated.timing(toastOpacity, { toValue: 0, duration: 280, useNativeDriver: true }).start(() => setShowToast(false));
          }, 2500);
        }
      } catch {
        // ignore
      }
    });
    return () => {
      cancelled = true;
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
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

  const tierChips = summary
    ? [{ id: 'all', label: t('achievements.filter_all') }, ...summary.tiers.map((tier) => ({ id: tier.id, label: t('achievements.tier_' + tier.id) }))]
    : [];
  const recentlyUnlocked = summary ? summary.achievements.filter((a) => a.unlocked).slice(0, 8) : [];

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('achievements.title')} onBack={onGoBack} borderBottom />

      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Ionicons name="sparkles" size={16} color="#fff" />
          <Text style={[font('labelBold'), { color: '#fff' }]}>{t('achievements.unlockedToast')}</Text>
        </Animated.View>
      )}

      {!summary ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.ember} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {/* Summary */}
          <View style={styles.summaryCard}>
            {(() => {
              const order = ['explorer', 'keeper', 'wanderer', 'legend'];
              const unlocked = new Set(summary.achievements.filter((a) => a.unlocked).map((a) => a.tier));
              let rank = summary.tiers[0];
              for (let i = order.length - 1; i >= 0; i--) { if (unlocked.has(order[i])) { rank = summary.tiers.find((x) => x.id === order[i]) || rank; break; } }
              const rc = rank?.color || COLORS.ember;
              return (
                <View style={[styles.rankPill, { backgroundColor: `${rc}22` }]}>
                  <Ionicons name="trophy" size={15} color={rc} />
                  <Text style={[font('labelBold'), { color: rc }]}>{rank ? t('achievements.tier_' + rank.id) : ''}</Text>
                </View>
              );
            })()}
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

          {/* Recently Unlocked carousel */}
          {recentlyUnlocked.length > 0 && (
            <View style={{ marginTop: 22 }}>
              <Text style={[font('eyebrow'), { color: COLORS.text3, marginBottom: 12 }]}>{t('achievements.recentlyUnlocked')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingRight: 4 }}>
                {recentlyUnlocked.map((a) => {
                  const color = tierColor(a.tier);
                  return (
                    <View key={a.id} style={styles.recentItem}>
                      <View style={[styles.recentIcon, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
                        <Ionicons name={a.icon as any} size={24} color={color} />
                      </View>
                      <Text style={[font('micro'), { color: COLORS.text3, maxWidth: 56, textAlign: 'center' }]} numberOfLines={1}>
                        {t('achievements.name_' + a.id)}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Tier filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 2 }}
            style={{ marginTop: 18 }}
          >
            {tierChips.map((chip) => {
              const active = tierFilter === chip.id;
              const chipColor = chip.id === 'all' ? COLORS.ember : tierColor(chip.id);
              return (
                <TouchableOpacity
                  key={chip.id}
                  onPress={() => setTierFilter(chip.id)}
                  activeOpacity={0.8}
                  style={[styles.filterChip, active ? { backgroundColor: chipColor, borderColor: chipColor } : null]}
                >
                  <Text style={[font('label'), { color: active ? '#fff' : COLORS.text3 }]}>{chip.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {summary.tiers.filter((tier) => tierFilter === 'all' || tier.id === tierFilter).map((tier) => {
            const items = summary.achievements.filter((a) => a.tier === tier.id);
            if (items.length === 0) return null;
            return (
              <View key={tier.id} style={{ marginTop: 22 }}>
                <View style={styles.tierHeader}>
                  <View style={[styles.tierDot, { backgroundColor: tier.color }]} />
                  <Text style={[font('eyebrow'), { color: tier.color, flex: 1 }]}>{t('achievements.tier_' + tier.id)}</Text>
                  <Text style={[font('caption'), { color: COLORS.text3 }]}>{items.filter((a) => a.unlocked).length}/{items.length}</Text>
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
  rankPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginBottom: 4 },
  toast: {
    position: 'absolute',
    top: 70,
    alignSelf: 'center',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.ember,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  recentItem: { alignItems: 'center', gap: 6, width: 56 },
  recentIcon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  filterChip: { height: 30, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bg3, alignItems: 'center', justifyContent: 'center' },
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
