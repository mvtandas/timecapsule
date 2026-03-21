import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, FlatList,
  Dimensions, ViewToken, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

const PAGES = [
  {
    id: '1',
    bg: '#1a1a2e',
    accent: '#FAC638',
    icon: 'time' as const,
    emoji: '⏳',
    title: 'Create Time Capsules',
    subtitle: 'Preserve your memories',
    features: [
      { icon: 'camera' as const, text: 'Add photos & videos' },
      { icon: 'mic' as const, text: 'Record voice messages' },
      { icon: 'create' as const, text: 'Write letters to your future self' },
      { icon: 'pricetags' as const, text: 'Organize with categories' },
    ],
  },
  {
    id: '2',
    bg: '#0f172a',
    accent: '#06D6A0',
    icon: 'lock-closed' as const,
    emoji: '🔒',
    title: 'Lock Until Ready',
    subtitle: 'Set when & where it opens',
    features: [
      { icon: 'calendar' as const, text: 'Choose an exact date & time' },
      { icon: 'location' as const, text: 'Pin to a specific location' },
      { icon: 'timer' as const, text: 'From 1 hour to 50 years' },
      { icon: 'eye-off' as const, text: 'Contents hidden until unlocked' },
    ],
  },
  {
    id: '3',
    bg: '#1e1b4b',
    accent: '#818cf8',
    icon: 'map' as const,
    emoji: '🗺️',
    title: 'Explore & Discover',
    subtitle: 'Find capsules around you',
    features: [
      { icon: 'navigate' as const, text: 'See capsules on the map' },
      { icon: 'walk' as const, text: 'Go to the location to open' },
      { icon: 'globe' as const, text: 'Public capsules from everyone' },
      { icon: 'compass' as const, text: 'Discover nearby memories' },
    ],
  },
  {
    id: '4',
    bg: '#1a1a2e',
    accent: '#FF6B6B',
    icon: 'people' as const,
    emoji: '👫',
    title: 'Connect with Friends',
    subtitle: 'Share memories together',
    features: [
      { icon: 'heart' as const, text: 'React with emojis ❤️ 🔥 🎉' },
      { icon: 'chatbubble' as const, text: 'Comment & @mention friends' },
      { icon: 'flame' as const, text: 'Build sharing streaks' },
      { icon: 'notifications' as const, text: 'Get notified when tagged' },
    ],
  },
  {
    id: '5',
    bg: '#FAC638',
    accent: '#1a1a2e',
    icon: 'rocket' as const,
    emoji: '🚀',
    title: "You're Ready!",
    subtitle: 'Start capturing moments',
    features: [],
    isFinal: true,
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
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
    const isLight = item.bg === '#FAC638';
    const textColor = isLight ? '#1a1a2e' : '#fff';
    const subtextColor = isLight ? 'rgba(26,26,46,0.6)' : 'rgba(255,255,255,0.6)';

    return (
      <View style={[styles.page, { backgroundColor: item.bg }]}>
        {/* Content */}
        <View style={styles.content}>
          {/* Big emoji */}
          <Text style={styles.emoji}>{item.emoji}</Text>

          {/* Icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: item.accent + '25' }]}>
            <Ionicons name={item.icon} size={44} color={item.accent} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: textColor }]}>{item.title}</Text>
          <Text style={[styles.subtitle, { color: subtextColor }]}>{item.subtitle}</Text>

          {/* Feature list */}
          {item.features.length > 0 && (
            <View style={styles.featureList}>
              {item.features.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: item.accent + '20' }]}>
                    <Ionicons name={f.icon} size={18} color={item.accent} />
                  </View>
                  <Text style={[styles.featureText, { color: textColor }]}>{f.text}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Final page CTA */}
          {isFinal && (
            <View style={styles.finalContent}>
              <Text style={[styles.finalText, { color: textColor }]}>
                Create your first time capsule{'\n'}and start preserving memories
              </Text>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: item.accent }]}
                onPress={onComplete}
                activeOpacity={0.8}
              >
                <Text style={[styles.startButtonText, { color: '#FAC638' }]}>
                  Let's Go!
                </Text>
                <Ionicons name="arrow-forward" size={20} color="#FAC638" />
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
      <View style={styles.bottomBar}>
        {/* Skip */}
        {!isLast ? (
          <TouchableOpacity onPress={onComplete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.skipText}>Skip</Text>
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
            <Ionicons name="arrow-forward" size={22} color="#1a1a2e" />
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
    backgroundColor: '#1a1a2e',
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

  // Emoji
  emoji: {
    fontSize: 48,
    marginBottom: 16,
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
    bottom: 50,
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
    color: 'rgba(255,255,255,0.5)',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  nextButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAC638',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default OnboardingScreen;
