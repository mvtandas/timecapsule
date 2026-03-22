import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  Image, ActivityIndicator, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { MemoriesService, Memory } from '../../services/memoriesService';
import { getMediaUrl } from '../../utils/mediaUtils';
import { formatDate } from '../../utils/dateUtils';
import CapsuleDetailModal from '../../components/CapsuleDetailModal';

const { width } = Dimensions.get('window');

interface MemoriesScreenProps {
  onNavigate: (screen: string, data?: any) => void;
  onGoBack?: () => void;
}

const MemoriesScreen = ({ onNavigate, onGoBack }: MemoriesScreenProps) => {
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
          <LinearGradient colors={['#FAC638', '#F59E0B']} style={styles.memoryImage}>
            <Ionicons name="time" size={32} color="#fff" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.memoryOverlay}
        >
          <View style={styles.memoryBadge}>
            <Text style={styles.memoryBadgeText}>
              {memory.yearsAgo} {memory.yearsAgo === 1 ? 'year' : 'years'} ago
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memories</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FAC638" />
        </View>
      ) : memories.length === 0 && recentMemories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="time-outline" size={48} color="#FAC638" />
          </View>
          <Text style={styles.emptyTitle}>No Memories Yet</Text>
          <Text style={styles.emptyText}>
            Start creating capsules today, and relive them next year!
          </Text>
          <TouchableOpacity
            style={styles.emptyCtaButton}
            onPress={() => onNavigate('Create')}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyCtaButtonText}>Create a Memory</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          {/* On This Day */}
          {memories.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={20} color="#FAC638" />
                <Text style={styles.sectionTitle}>On This Day</Text>
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
                <Ionicons name="calendar-outline" size={20} color="#FAC638" />
                <Text style={styles.sectionTitle}>This Week in History</Text>
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
  container: { flex: 1, backgroundColor: '#fafaf8' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 0.5, borderBottomColor: '#e2e8f0',
  },
  backBtn: { width: 40, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF8E1',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#94a3b8', textAlign: 'center', lineHeight: 22 },
  emptyCtaButton: {
    backgroundColor: '#FAC638',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  emptyCtaButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingTop: 24, paddingBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  horizontalScroll: { paddingHorizontal: 16, gap: 12 },
  memoryCard: {
    width: CARD_WIDTH, height: CARD_WIDTH * 1.2, borderRadius: 20,
    overflow: 'hidden', backgroundColor: '#e2e8f0',
  },
  memoryImage: {
    width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  memoryOverlay: {
    ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 16,
  },
  memoryBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(250,198,56,0.9)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 8,
  },
  memoryBadgeText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  memoryTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  memoryDate: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
});

export default MemoriesScreen;
