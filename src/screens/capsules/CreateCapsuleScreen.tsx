import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import DatePickerModal from '../../components/DatePickerModal';
import { CapsuleService } from '../../services/capsuleService';
import { MediaService } from '../../services/mediaService';
import { Friend } from '../../types';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

interface CreateCapsuleScreenProps {
  onNavigate: (screen: string) => void;
  onGoBack?: () => void;
}

const CreateCapsuleScreen = ({ onNavigate, onGoBack }: CreateCapsuleScreenProps) => {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [tempMapLocation, setTempMapLocation] = useState<any>(null);
  
  const [capsuleData, setCapsuleData] = useState({
    title: '',
    message: '',
    openDate: null as Date | null,
    location: null as { lat: number; lng: number; address: string } | null,
    media: [] as any[],
    isPublic: true,
    allowedUsers: [] as string[],
  });

  const [newUsername, setNewUsername] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  
  // Mock friends data - sorted by interaction frequency
  const [friends] = useState<Friend[]>([
    {
      id: '1',
      name: 'Elif Yılmaz',
      username: 'elifyilmaz',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
      friends_since: '2021',
    },
    {
      id: '2',
      name: 'Ahmet Demir',
      username: 'ahmetdemir',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      friends_since: '2022',
    },
    {
      id: '3',
      name: 'Zeynep Kaya',
      username: 'zeynepkaya',
      avatar_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
      friends_since: '2020',
    },
    {
      id: '4',
      name: 'Mehmet Öztürk',
      username: 'mehmetozturk',
      avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400',
      friends_since: '2023',
    },
    {
      id: '5',
      name: 'Ayşe Şahin',
      username: 'aysesahin',
      avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
      friends_since: '2021',
    },
  ]);

  useEffect(() => {
    // Get current location on mount
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location);
      
      // Set default location to current location
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address[0]) {
        setCapsuleData({
          ...capsuleData,
          location: {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            address: `${address[0].city || ''}, ${address[0].region || ''}`,
          },
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const handleNext = async () => {
    if (step === 1 && !capsuleData.title) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (step < 5) {
      Keyboard.dismiss();
      setStep(step + 1);
    } else {
      await handleSaveCapsule();
    }
  };

  const handleSaveCapsule = async () => {
    try {
      setSaving(true);

      // Check if capsule location is within 5km of current location
      if (currentLocation && capsuleData.location) {
        const distance = calculateDistance(
          currentLocation.coords.latitude,
          currentLocation.coords.longitude,
          capsuleData.location.lat,
          capsuleData.location.lng
        );

        if (distance > 5) {
          Alert.alert(
            'Location Too Far',
            'You can only create capsules within 5km of your current location.'
          );
          setSaving(false);
          return;
        }
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to create a capsule.');
        setSaving(false);
        return;
      }

      // Generate temporary capsule ID for media upload
      const tempCapsuleId = `temp_${Date.now()}`;

      // Upload media if exists
      let mediaUrl: string | null = null;
      let mediaType: 'image' | 'video' | 'none' = 'none';

      if (capsuleData.media.length > 0) {
        // Upload the first media item (you can extend this to support multiple)
        const firstMedia = capsuleData.media[0];
        const uploadResult = await MediaService.uploadMedia(
          firstMedia.uri,
          user.id,
          tempCapsuleId
        );

        if (uploadResult) {
          mediaUrl = uploadResult.url;
          mediaType = uploadResult.type;
        } else {
          // Silently continue without media if upload fails
          console.warn('Media upload failed, creating capsule without media');
        }
      }

      // Determine if capsule should be locked
      const isLocked = capsuleData.openDate ? new Date(capsuleData.openDate) > new Date() : false;

      const { data, error } = await CapsuleService.createCapsule({
        title: capsuleData.title,
        description: capsuleData.message || null,
        open_at: capsuleData.openDate?.toISOString() || null,
        lat: capsuleData.location?.lat || null,
        lng: capsuleData.location?.lng || null,
        is_public: capsuleData.isPublic,
        content_refs: capsuleData.media,
        media_url: mediaUrl,
        media_type: mediaType,
        is_locked: isLocked,
      });

      if (error) {
        console.error('Error creating capsule:', error);
        Alert.alert('Error', 'Failed to create capsule. Please try again.');
        
        // Clean up uploaded media if capsule creation failed
        if (mediaUrl) {
          const path = MediaService.extractPathFromUrl(mediaUrl);
          if (path) await MediaService.deleteMedia(path);
        }
      } else {
        Alert.alert('Success!', 'Your time capsule has been created!', [
          { text: 'OK', onPress: () => onNavigate('Dashboard') },
        ]);
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (deg: number) => deg * (Math.PI / 180);

  const handleBack = () => {
    Keyboard.dismiss();
    if (step > 1) {
      setStep(step - 1);
    } else {
      onGoBack && onGoBack();
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.7,
      });

      if (!result.canceled) {
        setCapsuleData({
          ...capsuleData,
          media: [...capsuleData.media, ...result.assets],
        });
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
      });

      if (!result.canceled) {
        setCapsuleData({
          ...capsuleData,
          media: [...capsuleData.media, ...result.assets],
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
    }
  };

  const handleSelectLocation = () => {
    if (!currentLocation) {
      Alert.alert('Error', 'Current location not available');
      return;
    }
    setTempMapLocation({
      latitude: capsuleData.location?.lat || currentLocation.coords.latitude,
      longitude: capsuleData.location?.lng || currentLocation.coords.longitude,
    });
    setShowMapModal(true);
  };

  const handleConfirmLocation = async () => {
    if (tempMapLocation) {
      const distance = calculateDistance(
        currentLocation.coords.latitude,
        currentLocation.coords.longitude,
        tempMapLocation.latitude,
        tempMapLocation.longitude
      );

      if (distance > 5) {
        Alert.alert('Too Far', 'Please select a location within 5km of your current position');
        return;
      }

      const address = await Location.reverseGeocodeAsync({
        latitude: tempMapLocation.latitude,
        longitude: tempMapLocation.longitude,
      });

      setCapsuleData({
        ...capsuleData,
        location: {
          lat: tempMapLocation.latitude,
          lng: tempMapLocation.longitude,
          address: address[0] ? `${address[0].city || ''}, ${address[0].region || ''}` : 'Selected location',
        },
      });
      setShowMapModal(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
  return (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Give your capsule a name</Text>
              <Text style={styles.stepSubtitle}>
                Choose something meaningful that captures the moment
        </Text>
              <TextInput
                style={styles.input}
                value={capsuleData.title}
                onChangeText={(text) => setCapsuleData({ ...capsuleData, title: text })}
                placeholder="e.g., Summer Memories 2024"
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
              />
      </View>
          </TouchableWithoutFeedback>
        );

      case 2:
        return (
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Add your message</Text>
              <Text style={styles.stepSubtitle}>
                Write a message to your future self or loved ones
          </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={capsuleData.message}
                onChangeText={(text) => setCapsuleData({ ...capsuleData, message: text })}
                placeholder="Dear future me..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit={true}
              />
                </View>
          </TouchableWithoutFeedback>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>When should it open?</Text>
            <Text style={styles.stepSubtitle}>Choose a date in the future</Text>
            
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={24} color="#FAC638" />
              <Text style={styles.dateButtonText}>
                {capsuleData.openDate 
                  ? capsuleData.openDate.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : 'Select Date'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color="#FAC638" />
              <Text style={styles.infoText}>
                Your capsule will be locked until this date
              </Text>
            </View>

            {/* Location Selection */}
            <Text style={[styles.stepTitle, styles.sectionTitle]}>
              Where is the Memory?
            </Text>
            <Text style={styles.stepSubtitle}>
              Choose the location where this capsule should be accessible
            </Text>
            
            <TouchableOpacity 
              style={styles.locationButton}
              onPress={handleSelectLocation}
            >
              <Ionicons name="location" size={24} color="#FAC638" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>
                  {capsuleData.location?.address || 'Select Location'}
                </Text>
                <Text style={styles.locationSubtext}>
                  Tap to choose on map (within 5km)
                </Text>
              </View>
              <Ionicons name="map-outline" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Access Control Section */}
            <View style={styles.accessControlSection}>
              <Text style={styles.subsectionTitle}>
                Who can open this capsule?
              </Text>

              {/* Public/Private Toggle */}
              <TouchableOpacity 
                style={styles.toggleContainer}
                onPress={() => setCapsuleData({ ...capsuleData, isPublic: !capsuleData.isPublic })}
                activeOpacity={0.7}
              >
                <View style={styles.toggleInfo}>
                  <Ionicons 
                    name={capsuleData.isPublic ? "globe-outline" : "lock-closed-outline"} 
                    size={24} 
                    color="#FAC638" 
                  />
                  <View style={styles.toggleTextContainer}>
                    <Text style={styles.toggleTitle}>
                      {capsuleData.isPublic ? 'Public Capsule' : 'Private Capsule'}
                    </Text>
                    <Text style={styles.toggleSubtext}>
                      {capsuleData.isPublic 
                        ? 'Anyone can open after unlock time' 
                        : 'Only selected people can open'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.switchToggle, capsuleData.isPublic && styles.switchToggleActive]}>
                  <View style={[styles.switchThumb, capsuleData.isPublic && styles.switchThumbActive]} />
                </View>
              </TouchableOpacity>

              {/* Authorized Users List - Only show when private */}
              {!capsuleData.isPublic && (
                <>
                  {/* Username Input */}
                  <View style={styles.addContactContainer}>
                    <View style={styles.usernameInputContainer}>
                      <Ionicons name="at-outline" size={20} color="#94a3b8" style={styles.usernameIcon} />
                      <TextInput
                        style={styles.usernameInput}
                        value={newUsername}
                        onChangeText={setNewUsername}
                        placeholder="Enter username"
                        placeholderTextColor="#94a3b8"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => {
                        if (newUsername.trim()) {
                          const username = newUsername.trim().toLowerCase();
                          if (!capsuleData.allowedUsers.includes(username)) {
                            setCapsuleData({
                              ...capsuleData,
                              allowedUsers: [...capsuleData.allowedUsers, username],
                            });
                          }
                          setNewUsername('');
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle" size={24} color="#FAC638" />
                    </TouchableOpacity>
                  </View>

                  {/* Friend Picker - Horizontal Scrollable */}
                  <View style={styles.friendPickerSection}>
                    <Text style={styles.friendPickerTitle}>Quick Select Friends</Text>
                    <ScrollView 
                      horizontal 
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.friendPickerScrollContent}
                    >
                      {friends.map((friend) => {
                        const isSelected = selectedFriends.includes(friend.username);
                        return (
                          <TouchableOpacity
                            key={friend.id}
                            style={styles.friendPickerItem}
                            onPress={() => {
                              let newSelectedFriends: string[];
                              let newAllowedUsers: string[];
                              
                              if (isSelected) {
                                // Deselect friend
                                newSelectedFriends = selectedFriends.filter(u => u !== friend.username);
                                newAllowedUsers = capsuleData.allowedUsers.filter(u => u !== friend.username);
                              } else {
                                // Select friend
                                newSelectedFriends = [...selectedFriends, friend.username];
                                newAllowedUsers = capsuleData.allowedUsers.includes(friend.username)
                                  ? capsuleData.allowedUsers
                                  : [...capsuleData.allowedUsers, friend.username];
                              }
                              
                              setSelectedFriends(newSelectedFriends);
                              setCapsuleData({
                                ...capsuleData,
                                allowedUsers: newAllowedUsers,
                              });
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={[
                              styles.friendPickerAvatar,
                              isSelected && styles.friendPickerAvatarSelected
                            ]}>
                              {friend.avatar_url ? (
                                <Image source={{ uri: friend.avatar_url }} style={styles.friendPickerAvatarImage} />
                              ) : (
                                <View style={styles.friendPickerAvatarPlaceholder}>
                                  <Ionicons name="person" size={32} color="#94a3b8" />
                                </View>
                              )}
                              {isSelected && (
                                <View style={styles.selectionCheckmark}>
                                  <Ionicons name="checkmark-circle" size={24} color="#FAC638" />
                                </View>
                              )}
                            </View>
                            <Text style={styles.friendPickerName} numberOfLines={1}>
                              {friend.name.split(' ')[0]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* List of Authorized Users */}
                  {capsuleData.allowedUsers.length > 0 && (
                    <View style={styles.authorizedUsersList}>
                      <Text style={styles.authorizedUsersTitle}>
                        Selected Users ({capsuleData.allowedUsers.length})
                      </Text>
                      {capsuleData.allowedUsers.map((username, index) => {
                        const friend = friends.find(f => f.username === username);
                        return (
                          <View key={index} style={styles.userItem}>
                            <View style={styles.userAvatar}>
                              {friend?.avatar_url ? (
                                <Image source={{ uri: friend.avatar_url }} style={styles.userAvatarImage} />
                              ) : (
                                <Ionicons name="person" size={20} color="#64748b" />
                              )}
                            </View>
                            <View style={styles.userInfo}>
                              <Text style={styles.userName}>
                                {friend?.name || username}
                              </Text>
                              <Text style={styles.userUsername}>@{username}</Text>
                            </View>
                            <TouchableOpacity
                              onPress={() => {
                                const newUsers = capsuleData.allowedUsers.filter(u => u !== username);
                                const newSelectedFriends = selectedFriends.filter(u => u !== username);
                                setSelectedFriends(newSelectedFriends);
                                setCapsuleData({ ...capsuleData, allowedUsers: newUsers });
                              }}
                              style={styles.removeButton}
                            >
                              <Ionicons name="close-circle" size={20} color="#FF6B6B" />
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {capsuleData.allowedUsers.length === 0 && (
                    <View style={styles.emptyState}>
                      <Ionicons name="people-outline" size={32} color="#cbd5e1" />
                      <Text style={styles.emptyStateText}>
                        No users selected yet. Select friends or enter a username to share with specific people.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Add photos & videos</Text>
            <Text style={styles.stepSubtitle}>Capture the moment visually</Text>
            
            {capsuleData.media.length > 0 && (
              <ScrollView horizontal style={styles.mediaPreview} showsHorizontalScrollIndicator={false}>
                {capsuleData.media.map((item, index) => (
                  <View key={index} style={styles.mediaPreviewItem}>
                    <Image source={{ uri: item.uri }} style={styles.mediaPreviewImage} />
                    <TouchableOpacity
                      style={styles.mediaRemoveButton}
                      onPress={() => {
                        const newMedia = [...capsuleData.media];
                        newMedia.splice(index, 1);
                        setCapsuleData({ ...capsuleData, media: newMedia });
                      }}
                    >
                      <Ionicons name="close-circle" size={24} color="#FF6B6B" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={styles.mediaGrid}>
              <TouchableOpacity style={styles.mediaButton} onPress={handleTakePhoto}>
                <Ionicons name="camera" size={32} color="#FAC638" />
                <Text style={styles.mediaButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mediaButton} onPress={handlePickImage}>
                <Ionicons name="images" size={32} color="#FAC638" />
                <Text style={styles.mediaButtonText}>Choose from Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review & Create</Text>
            <Text style={styles.stepSubtitle}>Make sure everything looks good</Text>
            <ScrollView style={styles.reviewContainer}>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Title:</Text>
                <Text style={styles.reviewValue}>{capsuleData.title || 'Not set'}</Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Message:</Text>
                <Text style={styles.reviewValue} numberOfLines={3}>
                  {capsuleData.message || 'No message'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Open Date:</Text>
                <Text style={styles.reviewValue}>
                  {capsuleData.openDate 
                    ? capsuleData.openDate.toLocaleDateString()
                    : 'Not set'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Location:</Text>
                <Text style={styles.reviewValue}>
                  {capsuleData.location?.address || 'Current location'}
                </Text>
              </View>
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Media:</Text>
                <Text style={styles.reviewValue}>{capsuleData.media.length} items</Text>
              </View>
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Capsule</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i <= step && styles.progressDotActive,
                i === step && styles.progressDotCurrent,
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>Step {step} of 5</Text>
      </View>

      {/* Content */}
      <ScrollView 
        style={styles.content} 
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        decelerationRate="normal"
        bounces={true}
        overScrollMode="auto"
        showsVerticalScrollIndicator={true}
      >
        {renderStep()}
      </ScrollView>

      {/* Next Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleNext}
          style={[styles.nextButton, saving && styles.nextButtonDisabled]}
          disabled={saving}
        >
          {saving ? (
            <>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.nextButtonText}>Creating...</Text>
            </>
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {step === 5 ? 'Create Capsule' : 'Continue'}
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </>
          )}
        </TouchableOpacity>
      </View>


      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectDate={(date) => {
          setCapsuleData({ ...capsuleData, openDate: date });
        }}
        minimumDate={new Date()}
      />

      {/* Map Location Picker Modal */}
      <Modal visible={showMapModal} animationType="slide">
        <View style={styles.mapModalContainer}>
          <View style={styles.mapHeader}>
            <TouchableOpacity onPress={() => setShowMapModal(false)} style={styles.mapCloseButton}>
              <Ionicons name="close" size={28} color="#333" />
            </TouchableOpacity>
            <Text style={styles.mapTitle}>Select Location</Text>
            <TouchableOpacity onPress={handleConfirmLocation} style={styles.mapConfirmButton}>
              <Ionicons name="checkmark" size={28} color="#FAC638" />
            </TouchableOpacity>
          </View>

          {currentLocation && (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
              }}
              onPress={(e) => setTempMapLocation(e.nativeEvent.coordinate)}
            >
              {/* Current Location */}
              <Marker
                coordinate={{
                  latitude: currentLocation.coords.latitude,
                  longitude: currentLocation.coords.longitude,
                }}
                title="You are here"
                pinColor="blue"
              />

              {/* 5km Radius Circle */}
              <Circle
                center={{
                  latitude: currentLocation.coords.latitude,
                  longitude: currentLocation.coords.longitude,
                }}
                radius={5000}
                strokeColor="rgba(250, 198, 56, 0.5)"
                fillColor="rgba(250, 198, 56, 0.1)"
                strokeWidth={2}
              />

              {/* Selected Location */}
              {tempMapLocation && (
                <Marker
                  coordinate={tempMapLocation}
                  title="Capsule Location"
                  pinColor="red"
                />
              )}
            </MapView>
          )}

          <View style={styles.mapInfo}>
            <Ionicons name="information-circle" size={20} color="#FAC638" />
            <Text style={styles.mapInfoText}>
              Tap anywhere within the yellow circle (5km radius)
            </Text>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  placeholder: {
    width: 40,
  },
  progressContainer: {
    padding: 20,
    backgroundColor: 'white',
  },
  progressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressDot: {
    width: 60,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: '#FFD166',
  },
  progressDotCurrent: {
    backgroundColor: '#FAC638',
  },
  progressText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  sectionTitle: {
    marginTop: 32,
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 32,
  },
  subsectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  textArea: {
    height: 160,
    textAlignVertical: 'top',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#FAC638',
    gap: 12,
    marginBottom: 16,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 198, 56, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    gap: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  locationSubtext: {
    fontSize: 12,
    color: '#94a3b8',
  },
  // Access Control Styles
  accessControlSection: {
    marginTop: 32,
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  toggleSubtext: {
    fontSize: 13,
    color: '#64748b',
  },
  switchToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#cbd5e1',
    padding: 2,
    justifyContent: 'center',
  },
  switchToggleActive: {
    backgroundColor: '#FAC638',
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
  },
  addContactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  usernameInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  usernameIcon: {
    marginRight: 12,
  },
  usernameInput: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  addButton: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAC63820',
    borderRadius: 12,
  },
  // Friend Picker Styles
  friendPickerSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  friendPickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  friendPickerScrollContent: {
    paddingRight: 20,
  },
  friendPickerItem: {
    alignItems: 'center',
    marginRight: 16,
    width: 72,
  },
  friendPickerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
    borderWidth: 3,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    position: 'relative',
  },
  friendPickerAvatarSelected: {
    borderColor: '#FAC638',
    borderWidth: 3,
  },
  friendPickerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  friendPickerAvatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCheckmark: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  friendPickerName: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    textAlign: 'center',
  },
  authorizedUsersList: {
    gap: 12,
    marginTop: 16,
  },
  authorizedUsersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  userUsername: {
    fontSize: 13,
    color: '#64748b',
  },
  removeButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyStateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  presetsContainer: {
    marginTop: 8,
  },
  presetsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 12,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetButton: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  mediaPreview: {
    marginBottom: 16,
  },
  mediaPreviewItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaPreviewImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  mediaRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  mediaGrid: {
    gap: 16,
  },
  mediaButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  mediaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginTop: 8,
  },
  reviewContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
  },
  reviewItem: {
    paddingBottom: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    color: '#1e293b',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  nextButton: {
    backgroundColor: '#FAC638',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  nextButtonDisabled: {
    opacity: 0.6,
  },
  mapModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  mapCloseButton: {
    padding: 8,
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  mapConfirmButton: {
    padding: 8,
  },
  map: {
    flex: 1,
  },
  mapInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(250, 198, 56, 0.1)',
    padding: 16,
    gap: 12,
  },
  mapInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#64748b',
  },
});

export default CreateCapsuleScreen;
