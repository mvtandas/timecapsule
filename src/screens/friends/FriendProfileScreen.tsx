import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Friend } from '../../types';

const { width, height } = Dimensions.get('window');

interface FriendProfileScreenProps {
  onNavigate: (screen: string) => void;
  friend: Friend;
}

const FriendProfileScreen = ({ onNavigate, friend }: FriendProfileScreenProps) => {
  const [activeTab, setActiveTab] = useState<'shared' | 'public' | 'activity'>('shared');

  // Mock capsule data shared with this friend
  const mockSharedCapsules = [
    {
      id: '1',
      location: 'Istanbul, Turkey',
      title: 'Summer Memories 2023',
      openDate: 'August 15, 2024',
      image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?w=400',
    },
    {
      id: '2',
      location: 'Ankara, Turkey',
      title: 'University Graduation',
      openDate: 'June 20, 2025',
      image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
    },
    {
      id: '3',
      location: 'Izmir, Turkey',
      title: 'Coffee Date',
      openDate: 'December 1, 2024',
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400',
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => onNavigate('Dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#1e293b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{friend.name}</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          {friend.avatar_url ? (
            <Image source={{ uri: friend.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={60} color="#94a3b8" />
            </View>
          )}
          <Text style={styles.name}>{friend.name}</Text>
          <Text style={styles.username}>@{friend.username}</Text>
          <Text style={styles.friendsSince}>Friends since {friend.friends_since}</Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.messageButton}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pokeButton}>
              <Text style={styles.pokeButtonText}>Poke</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'shared' && styles.activeTab]}
            onPress={() => setActiveTab('shared')}
          >
            <Text style={[styles.tabText, activeTab === 'shared' && styles.activeTabText]}>
              Shared With You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'public' && styles.activeTab]}
            onPress={() => setActiveTab('public')}
          >
            <Text style={[styles.tabText, activeTab === 'public' && styles.activeTabText]}>
              Public Capsules
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
              Recent Activity
            </Text>
          </TouchableOpacity>
        </View>

        {/* Capsules List */}
        <View style={styles.capsulesSection}>
          {mockSharedCapsules.map((capsule) => (
            <TouchableOpacity key={capsule.id} style={styles.capsuleCard}>
              <Image source={{ uri: capsule.image }} style={styles.capsuleImage} />
              <View style={styles.capsuleInfo}>
                <Text style={styles.capsuleLocation}>{capsule.location}</Text>
                <Text style={styles.capsuleTitle}>{capsule.title}</Text>
                <Text style={styles.capsuleOpenDate}>Opens on: {capsule.openDate}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#f8f9fa',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  menuButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f8f9fa',
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 16,
  },
  avatarPlaceholder: {
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 8,
  },
  friendsSince: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
  },
  messageButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  messageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  pokeButton: {
    flex: 1,
    backgroundColor: '#FAC638',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: 'center',
  },
  pokeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FAC638',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
  },
  activeTabText: {
    color: '#FAC638',
    fontWeight: '600',
  },
  capsulesSection: {
    padding: 20,
    gap: 16,
  },
  capsuleCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  capsuleImage: {
    width: 120,
    height: 120,
    backgroundColor: '#e2e8f0',
  },
  capsuleInfo: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  capsuleLocation: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  capsuleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  capsuleOpenDate: {
    fontSize: 13,
    color: '#64748b',
  },
});

export default FriendProfileScreen;

