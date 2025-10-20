import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { CapsuleCardProps } from '../../types';

export const CapsuleCard: React.FC<CapsuleCardProps> = ({
  capsule,
  onPress,
  showLock = true,
}) => {
  const getIconForCapsule = () => {
    return 'folder';
  };

  const getIconColor = () => {
    return '#FAC638';
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
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <MaterialIcons 
            name={getIconForCapsule() as any} 
            size={24} 
            color={getIconColor()} 
          />
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
            color="#6B7280" 
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
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    backgroundColor: 'rgba(250, 198, 56, 0.1)',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontWeight: 'bold',
    color: '#111827',
    fontSize: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  lockContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
