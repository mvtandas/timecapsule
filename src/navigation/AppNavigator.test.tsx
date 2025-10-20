import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Simple test component to verify navigation works
const TestScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>🎉 Navigation Works!</Text>
      <Text style={styles.subtext}>If you see this, the app is running correctly.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f5',
    padding: 24,
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 18,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default TestScreen;

