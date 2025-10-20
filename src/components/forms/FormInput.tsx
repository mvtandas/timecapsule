import React from 'react';
import { TextInput, View, Text, StyleSheet } from 'react-native';
import { FormFieldProps } from '../../types';

export const FormInput: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureTextEntry = false,
  multiline = false,
  numberOfLines = 1,
}) => {
  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        numberOfLines={numberOfLines}
        style={[
          styles.input,
          error && styles.inputError,
          multiline && { minHeight: numberOfLines * 24, textAlignVertical: 'top' }
        ]}
      />
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    fontSize: 16,
    color: '#111827',
    minHeight: 48,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
});
