import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MemoriesService, Memory } from '../../services/memoriesService';
import { getMediaUrl } from '../../utils/mediaUtils';
import { formatDate } from '../../utils/dateUtils';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';
import { SkeletonList } from '../../components/common/Skeleton';
import ScreenHeader from '../../components/common/ScreenHeader';
import { COLORS, GRADIENTS, font } from '../../constants/theme';
import { useT } from '../../i18n';

const { width } = Dimensions.get('window');

interface MemoriesScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

const MemoriesScreen = ({ onNavigate, onGoBack }: MemoriesScreenProps) => {
  const t = useT();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [recentMemories, setRecentMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCapsule, setSelectedCapsule] = useState<any>(null);

  useEffect(() => {
    loadMemories();
  }, []);

  const loadMemories = async () => {
    setLoading(true);
    const [today, recent] = await Promise.all([
      MemoriesService.getOnThisDay(),
      MemoriesService.getRecentMemories(),
    ]);
    setMemories(today);
    setRecentMemories(recent.filter(r => !today.find(t => t.capsule.id === r.capsule.id)));
    setLoading(false);
  };

  const renderMemoryCard = (memory: Memory) => {
    const mediaUrl = getMediaUrl(memory.capsule);

    return (
      <TouchableOpacity
        key={memory.capsule.id}
        style={styles.memoryCard}
        onPress={() => setSelectedCapsule(memory.capsule)}
        activeOpacity={0.85}
      >
        {mediaUrl ? (
          <Image source={{ uri: mediaUrl }} style={styles.memoryImage} resizeMode="cover" />
        ) : (
          <LinearGradient colors={GRADIENTS.ember} style={styles.memoryImage}>
            <Ionicons name="time" size={32} color="#fff" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.memoryOverlay}
        >
          <View style={styles.memoryBadge}>
            <Text style={styles.memoryBadgeText}>
              {memory.yearsAgo === 1
                ? t('memories.years_ago_one', { count: memory.yearsAgo })
                : t('memories.years_ago_other', { count: memory.yearsAgo })}
            </Text>
          </View>
          <Text style={styles.memoryTitle} numberOfLines={2}>{memory.capsule.title}</Text>
          <Text style={styles.memoryDate}>{formatDate(memory.capsule.created_at)}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title={t('memories.header_title')} onBack={onGoBack} borderBottom />

      {loading ? (
        <SkeletonList count={5} avatar="square" />
      ) : memories.length === 0 && recentMemories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="time-outline" size={48} color={COLORS.ember} />
          </View>
          <Text style={styles.emptyTitle}>{t('memories.empty_title')}</Text>
          <Text style={styles.emptyText}>
            {t('memories.empty_text')}
          </Text>
          <TouchableOpacity
            style={styles.emptyCtaButton}
            onPress={() => onNavigate('Create')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyCtaButtonText}>{t('memories.empty_cta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* On This Day */}
          {memories.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={20} color={COLORS.ember} />
                <Text style={styles.sectionTitle}>{t('memories.section_on_this_day')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {memories.map(renderMemoryCard)}
              </ScrollView>
            </>
          )}

          {/* This Week */}
          {recentMemories.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar-outline" size={20} color={COLORS.ember} />
                <Text style={styles.sectionTitle}>{t('memories.section_this_week')}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                {recentMemories.map(renderMemoryCard)}
              </ScrollView>
            </>
          )}
        </ScrollView>
      )}

      <CapsuleDetailModal
        visible={!!selectedCapsule}
        capsule={selectedCapsule}
        capsules={[...memories, ...recentMemories].map(m => m.capsule)}
        onClose={() => setSelectedCapsule(null)}
      />
    </View>
  );
};

const CARD_WIDTH = width * 0.7;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.emberSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { ...font('title'), color: COLORS.text, marginBottom: 8 },
  emptyText: { ...font('body'), fontSize: 15, color: COLORS.text3, textAlign: 'center', lineHeight: 22 },
  emptyCtaButton: {
    backgroundColor: COLORS.ember,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyCtaButtonText: {
    ...font('subtitle'),
    color: COLORS.white,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 14,
  },
  sectionTitle: { ...font('subtitle'), fontSize: 18, color: COLORS.text },
  horizontalScroll: { paddingHorizontal: 16, gap: 12 },
  memoryCard: {
    width: CARD_WIDTH, height: CARD_WIDTH * 1.2, borderRadius: 20,
    overflow: 'hidden', backgroundColor: COLORS.bg3,
  },
  memoryImage: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bg2,
  },
  memoryOverlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 16,
  },
  memoryBadge: {
    alignSelf: 'flex-start', backgroundColor: COLORS.ember,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8,
  },
  memoryBadgeText: { ...font('caption'), fontWeight: '700', color: '#fff' },
  memoryTitle: { ...font('subtitle'), fontSize: 18, color: '#fff', marginBottom: 4 },
  memoryDate: { ...font('caption'), fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});

export default MemoriesScreen;
