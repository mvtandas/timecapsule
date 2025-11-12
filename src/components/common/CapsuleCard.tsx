import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { CapsuleCardProps } from '../../types';
import { COLORS, GRADIENTS, OPACITY } from '../../constants/colors';

export const CapsuleCard: React.FC<CapsuleCardProps> = ({
  capsule,
  onPress,
  showLock = true,
}) => {
  const getIconForCapsule = () => {
    return 'folder';
  };

  const isOpen = () => {
    if (!capsule.open_at) return true;
    return new Date(capsule.open_at) <= new Date();
  };

  const getTimeUntilOpen = () => {
    if (!capsule.open_at) return null;
    
    const now = new Date();
    const openDate = new Date(capsule.open_at);
    const diff = openDate.getTime() - now.getTime();
    
    if (diff <= 0) return 'Opened';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `Opens in ${days}d ${hours}h`;
    if (hours > 0) return `Opens in ${hours}h`;
    return 'Opens soon';
  };

  return (
    <TouchableOpacity
      onPress={() => onPress(capsule)}
      style={styles.container}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <LinearGradient
            colors={[COLORS.gradient.pink, COLORS.gradient.purple]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconGradient}
          >
            <MaterialIcons 
              name={getIconForCapsule() as any} 
              size={24} 
              color={COLORS.text.primary} 
            />
          </LinearGradient>
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title}>
            {capsule.title}
          </Text>
          <Text style={styles.subtitle}>
            {capsule.description || getTimeUntilOpen()}
          </Text>
        </View>
      </View>
      
      {showLock && (
        <View style={styles.lockContainer}>
          <MaterialIcons 
            name={isOpen() ? "lock-open" : "lock"} 
            size={20} 
            color={isOpen() ? COLORS.status.success : COLORS.text.tertiary} 
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: COLORS.gradient.pink,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.border.primary,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  iconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    color: COLORS.text.primary,
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginTop: 2,
  },
  lockContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
