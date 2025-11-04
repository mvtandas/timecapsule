import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CapsuleService } from '../../services/capsuleService';

type Screen = 'Dashboard' | 'MyCapsules' | 'Create' | 'Explore' | 'Profile';

interface MyCapsulesScreenProps {
  onNavigate: (screen: Screen) => void;
  onLogout?: () => void;
}

const MyCapsulesScreen = ({ onNavigate }: MyCapsulesScreenProps) => {
  const [activeTab, setActiveTab] = useState<'created' | 'shared'>('created');
  const [capsules, setCapsules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCapsules();
  }, [activeTab]);

  const loadCapsules = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'created') {
        const { data, error } = await CapsuleService.getUserCapsules();
        if (error) {
          console.error('Error loading capsules:', error);
          Alert.alert('Error', 'Failed to load capsules');
        } else {
          setCapsules(data || []);
        }
      } else {
        const { data, error } = await CapsuleService.getSharedCapsules();
        if (error) {
          console.error('Error loading shared capsules:', error);
        } else {
          setCapsules(data || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCapsules();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No open date';
    
    const openDate = new Date(dateString);
    const now = new Date();
    const diff = openDate.getTime() - now.getTime();
    
    if (diff < 0) {
      return `Opened on ${openDate.toLocaleDateString()}`;
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `Opens in ${days}d ${hours}h`;
    } else {
      return `Opens in ${hours}h`;
    }
  };

  const isLocked = (dateString: string | null) => {
    if (!dateString) return false;
    return new Date(dateString).getTime() > new Date().getTime();
  };

  const getRandomIcon = () => {
    const icons = ['🏖️', '👨‍👩‍👧‍👦', '🎓', '🎉', '🎂', '🌴', '🎸', '📸', '✈️', '🎨'];
    return icons[Math.floor(Math.random() * icons.length)];
  };

  const getRandomColor = () => {
    const colors = ['#FFD166', '#06D6A0', '#FF6B6B', '#4ECDC4', '#95E1D3'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleDeleteCapsule = (capsuleId: string, title: string) => {
    Alert.alert(
      'Delete Capsule',
      `Are you sure you want to delete "${title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await CapsuleService.deleteCapsule(capsuleId);
            if (error) {
              Alert.alert('Error', 'Failed to delete capsule');
            } else {
              Alert.alert('Success', 'Capsule deleted successfully');
              loadCapsules(); // Reload the list
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => onNavigate('Dashboard')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Capsules</Text>
        <TouchableOpacity onPress={() => onNavigate('Create')} style={styles.addButton}>
          <Ionicons name="add-circle" size={32} color="#FAC638" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => setActiveTab('created')}
            style={[styles.tab, activeTab === 'created' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>
              Created
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('shared')}
            style={[styles.tab, activeTab === 'shared' && styles.activeTab]}
          >
            <Text style={[styles.tabText, activeTab === 'shared' && styles.activeTabText]}>
              Shared
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Capsules List */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FAC638']} />
        }
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        overScrollMode="auto"
        showsVerticalScrollIndicator={true}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FAC638" />
            <Text style={styles.loadingText}>Loading capsules...</Text>
          </View>
        ) : capsules.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="file-tray-outline" size={80} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>
              {activeTab === 'created' ? 'No Capsules Yet' : 'No Shared Capsules'}
            </Text>
            <Text style={styles.emptyText}>
              {activeTab === 'created' 
                ? 'Tap the + button to create your first time capsule!'
                : 'Capsules shared with you will appear here'}
            </Text>
          </View>
        ) : (
          capsules.map((capsule) => (
            <View key={capsule.id} style={styles.capsuleCard}>
              <View style={styles.capsuleContent}>
                <View style={[styles.iconWrapper, { backgroundColor: getRandomColor() }]}>
                  <Text style={styles.iconText}>{getRandomIcon()}</Text>
                </View>
                <View style={styles.capsuleInfo}>
                  <Text style={styles.capsuleTitle}>{capsule.title}</Text>
                  <Text style={styles.capsuleTime}>{formatDate(capsule.open_at)}</Text>
                  {capsule.description && (
                    <Text style={styles.capsuleDescription} numberOfLines={1}>
                      {capsule.description}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.capsuleActions}>
                <Ionicons
                  name={isLocked(capsule.open_at) ? 'lock-closed' : 'lock-open'}
                  size={24}
                  color={isLocked(capsule.open_at) ? '#FF6B6B' : '#06D6A0'}
                  style={styles.lockIcon}
                />
                {activeTab === 'created' && (
                  <TouchableOpacity
                    onPress={() => handleDeleteCapsule(capsule.id, capsule.title)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#f8f8f5',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    padding: 4,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8f8f5',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    paddingHorizontal: 16,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FAC638',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
  },
  activeTabText: {
    fontWeight: '700',
    color: '#FAC638',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  capsuleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  capsuleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  iconText: {
    fontSize: 28,
  },
  capsuleInfo: {
    flex: 1,
  },
  capsuleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  capsuleTime: {
    fontSize: 14,
    color: '#94a3b8',
  },
  capsuleDescription: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  capsuleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockIcon: {
    marginRight: 0,
  },
  deleteButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#94a3b8',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MyCapsulesScreen;
