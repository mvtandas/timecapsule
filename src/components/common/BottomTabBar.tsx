import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomTabBarProps {
  activeTab: string;
  onNavigate: (screen: string, data?: any, replace?: boolean) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onNavigate }) => {
  const insets = useSafeAreaInsets();
  
  const tabs = [
    { id: 'Friends', label: 'Friends', icon: 'people' as const },
    { id: 'Dashboard', label: 'Map', icon: 'map' as const },
    { id: 'Notifications', label: 'Notifications', icon: 'notifications' as const },
    { id: 'Profile', label: 'Profile', icon: 'person' as const },
  ];

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => onNavigate(tab.id, undefined, true)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={tab.icon}
                size={24}
                color={isActive ? '#FAC638' : '#94a3b8'}
              />
              <Text style={[styles.label, isActive && styles.activeLabel]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 1000,
  },
  tabRow: {
    flexDirection: 'row',
    height: 52,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 4,
  },
  activeLabel: {
    color: '#FAC638',
  },
});

export default BottomTabBar;

