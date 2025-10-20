import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { ButtonProps } from '../../types';

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    };

    const sizeStyles = {
      small: { paddingHorizontal: 12, paddingVertical: 8 },
      medium: { paddingHorizontal: 16, paddingVertical: 12 },
      large: { paddingHorizontal: 24, paddingVertical: 16 },
    };

    const variantStyles = {
      primary: {
        backgroundColor: '#FAC638',
      },
      secondary: {
        backgroundColor: '#f3f4f6',
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#FAC638',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      opacity: disabled ? 0.5 : 1,
      ...style,
    };
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
    };

    const sizeStyles = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    };

    const variantStyles = {
      primary: {
        color: '#000000',
      },
      secondary: {
        color: '#000000',
      },
      outline: {
        color: '#FAC638',
      },
    };

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...textStyle,
    };
  };

  return (
    <TouchableOpacity
      style={getButtonStyle()}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? '#FAC638' : '#000000'} 
        />
      ) : (
        <Text style={getTextStyle()}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};