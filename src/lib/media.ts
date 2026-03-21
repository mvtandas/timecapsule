import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from './supabase';
import { MediaFile } from '../types';

export class MediaService {
  // Pick images from gallery
  static async pickImages(maxFiles: number = 10): Promise<MediaFile[]> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: maxFiles,
      });

      if (result.canceled) {
        return [];
      }

      const mediaFiles: MediaFile[] = [];

      for (const asset of result.assets) {
        if (asset.uri) {
          const fileInfo = await FileSystem.getInfoAsync(asset.uri);
          mediaFiles.push({
            uri: asset.uri,
            type: asset.mimeType || 'image/jpeg',
            name: asset.fileName || `image_${Date.now()}.jpg`,
            size: (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0),
          });
        }
      }

      return mediaFiles;
    } catch (error) {
      console.error('Error picking images:', error);
      return [];
    }
  }

  // Take photo with camera
  static async takePhoto(): Promise<MediaFile | null> {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return null;
      }

      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);

      return {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || `photo_${Date.now()}.jpg`,
        size: (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0),
      };
    } catch (error) {
      console.error('Error taking photo:', error);
      return null;
    }
  }

  // Pick video from gallery
  static async pickVideo(): Promise<MediaFile | null> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return null;
      }

      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);

      return {
        uri: asset.uri,
        type: asset.mimeType || 'video/mp4',
        name: asset.fileName || `video_${Date.now()}.mp4`,
        size: (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0),
      };
    } catch (error) {
      console.error('Error picking video:', error);
      return null;
    }
  }

  // Record video with camera
  static async recordVideo(): Promise<MediaFile | null> {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (result.canceled || !result.assets[0]?.uri) {
        return null;
      }

      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);

      return {
        uri: asset.uri,
        type: asset.mimeType || 'video/mp4',
        name: asset.fileName || `video_${Date.now()}.mp4`,
        size: (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0),
      };
    } catch (error) {
      console.error('Error recording video:', error);
      return null;
    }
  }

  // Upload file to Supabase Storage
  static async uploadFile(
    file: MediaFile,
    bucket: string = 'capsule-media',
    path?: string
  ): Promise<{ url: string | null; error: any }> {
    try {
      const fileName = path ? `${path}/${file.name}` : file.name;
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}.${fileExt}`;

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: 'base64' as any,
      });

      // Upload to Supabase
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, this.base64ToArrayBuffer(base64), {
          contentType: file.type,
          upsert: true,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return { url: publicUrl, error: null };
    } catch (error) {
      console.error('Error uploading file:', error);
      return { url: null, error };
    }
  }

  // Upload profile avatar (optimized for profile photos)
  static async uploadAvatar(
    imageUri: string,
    userId: string
  ): Promise<{ url: string | null; error: any }> {
    try {

      const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Check if FileSystem is available
      if (!FileSystem || !FileSystem.readAsStringAsync) {
        throw new Error('FileSystem module not available');
      }

      // Read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });

      if (!base64) {
        throw new Error('Failed to read file as base64');
      }


      // Convert base64 to array buffer
      const arrayBuffer = this.base64ToArrayBuffer(base64);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('capsule-media')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
          upsert: true,
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
      }


      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('capsule-media')
        .getPublicUrl(filePath);


      return { url: publicUrl, error: null };
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      console.error('Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      });
      return { url: null, error };
    }
  }

  // Delete file from Supabase Storage
  static async deleteFile(
    url: string,
    bucket: string = 'capsule-media'
  ): Promise<{ error: any }> {
    try {
      // Extract file path from URL
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];

      const { error } = await supabase.storage
        .from(bucket)
        .remove([fileName]);

      return { error };
    } catch (error) {
      console.error('Error deleting file:', error);
      return { error };
    }
  }

  // Get file info
  static async getFileInfo(uri: string): Promise<{
    size: number;
    exists: boolean;
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      return {
        size: (fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0),
        exists: fileInfo.exists,
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      return { size: 0, exists: false };
    }
  }

  // Convert base64 to ArrayBuffer
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Validate file type
  static isValidMediaType(type: string): boolean {
    const validTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
    ];
    return validTypes.includes(type);
  }

  // Get file type category
  static getFileTypeCategory(type: string): 'image' | 'video' | 'audio' | 'unknown' {
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    return 'unknown';
  }

  // Compress image (placeholder - would need additional library)
  static async compressImage(uri: string): Promise<string | null> {
    // This is a placeholder for image compression
    // In a real app, you might use a library like react-native-image-resizer
    try {
      // For now, just return the original URI
      return uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return null;
    }
  }

  // Generate thumbnail for video (placeholder)
  static async generateVideoThumbnail(uri: string): Promise<string | null> {
    // This is a placeholder for video thumbnail generation
    // In a real app, you might use a library like react-native-video-thumbnail
    try {
      // For now, return null
      return null;
    } catch (error) {
      console.error('Error generating video thumbnail:', error);
      return null;
    }
  }
}