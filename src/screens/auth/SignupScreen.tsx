import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';

interface SignupScreenProps {
  onNavigate: (screen: 'Welcome' | 'Login' | 'Signup') => void;
  onSignup: () => void;
  onGoBack?: () => void;
}

const SignupScreen: React.FC<SignupScreenProps> = ({ onNavigate, onSignup, onGoBack }) => {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuthStore();

  // Refs for keyboard navigation
  const displayNameRef = useRef<TextInput>(null);
  const usernameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  const validateUsername = (username: string): { valid: boolean; message?: string } => {
    // Check length
    if (username.length < 3 || username.length > 20) {
      return { valid: false, message: 'Username must be between 3 and 20 characters' };
    }
    
    // Check allowed characters (letters, numbers, underscores, periods)
    const usernameRegex = /^[a-zA-Z0-9_.]+$/;
    if (!usernameRegex.test(username)) {
      return { valid: false, message: 'Username can only contain letters, numbers, underscores, and periods' };
    }
    
    // Check if it starts with a letter or number
    if (!/^[a-zA-Z0-9]/.test(username)) {
      return { valid: false, message: 'Username must start with a letter or number' };
    }
    
    return { valid: true };
  };

  const handleSignUp = async () => {
    // Validation
    if (!displayName || !username || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Validate username format
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      Alert.alert('Invalid Username', usernameValidation.message);
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    
    const { error } = await signUp(email, password, displayName, username);
    
    setLoading(false);
    
    if (error) {
      // Check for username uniqueness error
      const errorMessage = error.message || '';
      if (errorMessage.toLowerCase().includes('username') && errorMessage.toLowerCase().includes('already')) {
        Alert.alert('Username Taken', 'This username is already in use. Please choose a different one.');
      } else {
        Alert.alert('Error', errorMessage || 'Failed to create account. Please try again.');
      }
    } else {
      Alert.alert(
        'Success!', 
        'Your account has been created!\n\nNote: You can login immediately without email confirmation.',
        [
          {
            text: 'OK',
            onPress: onSignup
          }
        ]
      );
    }
  };
  
  const handleBack = () => {
    onGoBack && onGoBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <MaterialIcons name="arrow-back" size={24} color="#111827" />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialIcons name="person-add" size={64} color="#FAC638" />
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Join us to start capturing your memories
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <MaterialIcons name="person" size={24} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              ref={displayNameRef}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Full Name"
              placeholderTextColor="#9ca3af"
              autoCapitalize="words"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => usernameRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="alternate-email" size={24} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              ref={usernameRef}
              value={username}
              onChangeText={setUsername}
              placeholder="Username (3-20 characters)"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => emailRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={24} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              ref={emailRef}
              value={email}
              onChangeText={setEmail}
              placeholder="Email Address"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="none"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              ref={passwordRef}
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min. 6 characters)"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="no"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              style={styles.input}
              editable={!loading}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)} 
              style={styles.eyeIcon}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name={showPassword ? "visibility" : "visibility-off"} 
                size={24} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={24} color="#6b7280" style={styles.inputIcon} />
            <TextInput
              ref={confirmPasswordRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm Password"
              placeholderTextColor="#9ca3af"
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              autoComplete="off"
              textContentType="oneTimeCode"
              importantForAutofill="no"
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
              style={styles.input}
              editable={!loading}
            />
            <TouchableOpacity 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)} 
              style={styles.eyeIcon}
              activeOpacity={0.7}
            >
              <MaterialIcons 
                name={showConfirmPassword ? "visibility" : "visibility-off"} 
                size={24} 
                color="#6b7280" 
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <Text style={styles.buttonText}>Creating Account...</Text>
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.termsText}>
            By signing up, you agree to our{'\n'}
            <Text style={styles.termsLink} onPress={() => Alert.alert('Terms of Service', 'By using TimeCapsule, you agree to use the app responsibly. You must be at least 13 years old. Do not post harmful, illegal, or inappropriate content. We may remove content or suspend accounts that violate these terms. Your data is stored securely on our servers. We reserve the right to update these terms at any time.')}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink} onPress={() => Alert.alert('Privacy Policy', 'TimeCapsule collects your email, username, profile photo, and location data to provide the app service. Your capsule content (photos, videos, messages) is stored on secure servers. We do not sell your data to third parties. You can delete your account and all associated data at any time from Settings. We use location data only to place and discover capsules on the map. For questions, contact support@timecapsule.app')}>Privacy Policy</Text>
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => onNavigate('Login')}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.footerLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f5',
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(250, 198, 56, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    minHeight: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: '#111827',
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    width: '100%',
    height: 56,
    backgroundColor: '#FAC638',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#FAC638',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  termsText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#FAC638',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9ca3af',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footerLink: {
    color: '#FAC638',
    fontWeight: 'bold',
  },
});

export default SignupScreen;

