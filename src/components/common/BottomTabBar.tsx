import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, GRADIENTS } from '../../constants/colors';

interface BottomTabBarProps {
  activeTab: string;
  onNavigate: (screen: string, data?: any, replace?: boolean) => void;
}

const BottomTabBar: React.FC<BottomTabBarProps> = ({ activeTab, onNavigate }) => {
  const insets = useSafeAreaInsets();
  
  const tabs = [
    { id: 'Friends', label: 'Friends', icon: 'people' as const },
    { id: 'Dashboard', label: 'Map', icon: 'map' as const },
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
              {isActive && (
                <View style={styles.activeIndicator}>
                  <LinearGradient
                    colors={GRADIENTS.primaryHorizontal}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.activeGradient}
                  />
                </View>
              )}
              <Ionicons
                name={tab.icon}
                size={24}
                color={isActive ? COLORS.gradient.pink : COLORS.text.muted}
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
    backgroundColor: COLORS.background.secondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.primary,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    left: '25%',
    right: '25%',
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  activeGradient: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.muted,
    marginTop: 4,
  },
  activeLabel: {
    color: COLORS.gradient.pink,
    fontWeight: '700',
  },
});

export default BottomTabBar;

