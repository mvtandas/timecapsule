import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const CapsulePreviewScreen = () => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <MaterialIcons name="visibility" size={64} color="#FAC638" />
        <Text style={styles.title}>Capsule Preview</Text>
        <Text style={styles.text}>Preview view coming soon</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
});

export default CapsulePreviewScreen;
