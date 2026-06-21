import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Dimensions, ViewToken, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS, SPACING, font } from '../../constants/theme';
import { VoorcapMark } from '../../components/common/VoorcapLogo';
import { useT } from '../../i18n';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const PAGES = [
  {
    id: '1',
    bg: COLORS.bg,
    accent: COLORS.ember,
    icon: 'time' as const,
    emoji: '⏳',
    titleKey: 'onboarding.p1Title',
    subKey: 'onboarding.p1Sub',
    features: [
      { icon: 'camera' as const, textKey: 'onboarding.p1f1' },
      { icon: 'mic' as const, textKey: 'onboarding.p1f2' },
      { icon: 'create' as const, textKey: 'onboarding.p1f3' },
      { icon: 'pricetags' as const, textKey: 'onboarding.p1f4' },
    ],
  },
  {
    id: '2',
    bg: COLORS.bg,
    accent: COLORS.moss,
    icon: 'lock-closed' as const,
    emoji: '🔒',
    titleKey: 'onboarding.p2Title',
    subKey: 'onboarding.p2Sub',
    features: [
      { icon: 'calendar' as const, textKey: 'onboarding.p2f1' },
      { icon: 'location' as const, textKey: 'onboarding.p2f2' },
      { icon: 'timer' as const, textKey: 'onboarding.p2f3' },
      { icon: 'eye-off' as const, textKey: 'onboarding.p2f4' },
    ],
  },
  {
    id: '3',
    bg: COLORS.bg,
    accent: COLORS.purple,
    icon: 'map' as const,
    emoji: '🗺️',
    titleKey: 'onboarding.p3Title',
    subKey: 'onboarding.p3Sub',
    features: [
      { icon: 'navigate' as const, textKey: 'onboarding.p3f1' },
      { icon: 'walk' as const, textKey: 'onboarding.p3f2' },
      { icon: 'globe' as const, textKey: 'onboarding.p3f3' },
      { icon: 'compass' as const, textKey: 'onboarding.p3f4' },
    ],
  },
  {
    id: '4',
    bg: COLORS.bg,
    accent: COLORS.blue,
    icon: 'people' as const,
    emoji: '👫',
    titleKey: 'onboarding.p4Title',
    subKey: 'onboarding.p4Sub',
    features: [
      { icon: 'heart' as const, textKey: 'onboarding.p4f1' },
      { icon: 'chatbubble' as const, textKey: 'onboarding.p4f2' },
      { icon: 'flame' as const, textKey: 'onboarding.p4f3' },
      { icon: 'notifications' as const, textKey: 'onboarding.p4f4' },
    ],
  },
  {
    id: '5',
    bg: COLORS.bg,
    accent: COLORS.ember,
    icon: 'rocket' as const,
    emoji: '🚀',
    titleKey: 'onboarding.p5Title',
    subKey: 'onboarding.p5Sub',
    features: [],
    isFinal: true,
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const t = useT();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const goNext = () => {
    if (currentIndex < PAGES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      onComplete();
    }
  };

  const renderPage = ({ item, index }: { item: typeof PAGES[0]; index: number }) => {
    const isFinal = (item as any).isFinal;
    const textColor = COLORS.text;
    const subtextColor = COLORS.text2;

    return (
      <View style={[styles.page, { backgroundColor: item.bg }]}>
        {/* Content */}
        <View style={styles.content}>
          {/* Single brand/icon mark (no stacked emoji) */}
          {index === 0 ? (
            <View style={styles.markWrap}>
              <VoorcapMark size={76} />
            </View>
          ) : (
            <View style={[styles.iconCircle, { backgroundColor: item.accent + '25' }]}>
              <Ionicons name={item.icon} size={44} color={item.accent} />
            </View>
          )}

          {/* Title */}
          <Text style={[styles.title, font('display'), { color: textColor }]}>{t(item.titleKey)}</Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>{t(item.subKey)}</Text>

          {/* Feature list */}
          {item.features.length > 0 && (
            <View style={styles.featureList}>
              {item.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: item.accent + '20' }]}>
                    <Ionicons name={f.icon} size={18} color={item.accent} />
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>{t(f.textKey)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Final page CTA */}
          {isFinal && (
            <View style={styles.finalContent}>
              <Text style={[styles.finalText, { color: textColor }]}>
                {t('onboarding.p5Body')}
              </Text>
              <TouchableOpacity
                style={styles.startButton}
                onPress={onComplete}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={GRADIENTS.ember as readonly [string, string]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.startButtonGradient}
                >
                  <Text style={[styles.startButtonText, { color: COLORS.white }]}>
                    {t('onboarding.letsGo')}
                  </Text>
                  <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const isLast = currentIndex === PAGES.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={PAGES}
        renderItem={renderPage}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
      />

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { bottom: insets.bottom + SPACING.xl }]}>
        {/* Skip */}
        {!isLast ? (
          <TouchableOpacity onPress={onComplete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skipText}>{t('common.skip')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}

        {/* Dots */}
        <View style={styles.dots}>
          {PAGES.map((_, i) => {
            const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
            const dotWidth = scrollX.interpolate({
              inputRange,
              outputRange: [8, 24, 8],
              extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange,
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp',
            });
            return (
              <Animated.View
                key={i}
                style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]}
              />
            );
          })}
        </View>

        {/* Next */}
        {!isLast ? (
          <TouchableOpacity onPress={goNext} style={styles.nextButton}>
            <Ionicons name="arrow-forward" size={22} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  page: {
    width,
    height,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },

  // Brand mark
  markWrap: {
    marginBottom: 28,
  },

  // Icon
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },

  // Text
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Features
  featureList: {
    width: '100%',
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },

  // Final page
  finalContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  finalText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    opacity: 0.7,
  },
  startButton: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 28,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text2,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.ember,
  },
  nextButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.ember,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default OnboardingScreen;
