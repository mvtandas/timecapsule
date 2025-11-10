import { supabase } from '../lib/supabase';

export interface MediaUploadResult {
  url: string;
  path: string;
  type: 'image' | 'video';
}

export class MediaService {
  private static BUCKET_NAME = 'capsules_media';
  private static AVATARS_BUCKET_NAME = 'avatars';

  /**
   * Upload a single media file to Supabase Storage
   * @param uri - Local file URI from ImagePicker
   * @param userId - User ID for folder organization
   * @param capsuleId - Capsule ID for file naming
   * @returns Upload result with public URL and storage path
   */
  static async uploadMedia(
    uri: string,
    userId: string,
    capsuleId: string
  ): Promise<MediaUploadResult | null> {
    try {
      // Determine file type from URI
      const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const isVideo = ['mp4', 'mov', 'avi', 'mkv'].includes(fileExtension);
      const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

      // Generate unique file name
      const timestamp = Date.now();
      const fileName = `${capsuleId}_${timestamp}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`;

      // Determine content type
      const contentType = isVideo 
        ? `video/${fileExtension}` 
        : `image/${fileExtension}`;

      // Read file using fetch (works in React Native without deprecated warnings)
      console.log('📥 Fetching file...');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      console.log('🔄 Converting blob to base64...');
      // Convert blob to base64 using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (data:image/jpeg;base64,)
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log('✅ Base64 length:', base64.length);

      // Convert base64 to Uint8Array
      console.log('🔄 Converting to Uint8Array...');
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log('✅ Uint8Array size:', bytes.byteLength);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(filePath, bytes, {
          contentType,
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('✅ Media uploaded successfully:', urlData.publicUrl);

      return {
        url: urlData.publicUrl,
        path: filePath,
        type: mediaType,
      };
    } catch (error: any) {
      console.error('❌ Error uploading media:', error?.message || error);
      // Return null to allow capsule creation without media
      return null;
    }
  }

  /**
   * Upload multiple media files
   * @param uris - Array of local file URIs
   * @param userId - User ID
   * @param capsuleId - Capsule ID
   * @returns Array of upload results
   */
  static async uploadMultipleMedia(
    uris: string[],
    userId: string,
    capsuleId: string
  ): Promise<MediaUploadResult[]> {
    const uploads = await Promise.all(
      uris.map(uri => this.uploadMedia(uri, userId, capsuleId))
    );

    // Filter out failed uploads
    return uploads.filter((result): result is MediaUploadResult => result !== null);
  }

  /**
   * Upload profile avatar
   * @param uri - Local file URI from ImagePicker
   * @param userId - User ID for folder organization
   * @returns Upload result with public URL
   */
  static async uploadAvatar(
    uri: string,
    userId: string
  ): Promise<{ url: string | null; error: any }> {
    try {
      console.log('🔵 Starting avatar upload for user:', userId);
      
      // Determine file type from URI
      const fileExtension = uri.split('.').pop()?.toLowerCase() || 'jpg';
      
      // Generate unique file name
      const timestamp = Date.now();
      const fileName = `avatar_${userId}_${timestamp}.${fileExtension}`;
      const filePath = `${userId}/${fileName}`;

      // Determine content type
      const contentType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;

      // Read file using fetch (works in React Native without deprecated warnings)
      console.log('📥 Fetching file...');
      const response = await fetch(uri);
      const blob = await response.blob();
      
      console.log('🔄 Converting blob to base64...');
      // Convert blob to base64 using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          // Remove data URL prefix (data:image/jpeg;base64,)
          const base64String = result.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log('✅ Base64 length:', base64.length);

      // Convert base64 to Uint8Array
      console.log('🔄 Converting to Uint8Array...');
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      console.log('✅ Uint8Array size:', bytes.byteLength);

      // Upload to Supabase Storage
      console.log('☁️  Uploading to Supabase Storage...');
      const { data, error } = await supabase.storage
        .from(this.AVATARS_BUCKET_NAME)
        .upload(filePath, bytes, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw error;
      }

      console.log('✅ Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.AVATARS_BUCKET_NAME)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log('✅ Avatar uploaded successfully:', urlData.publicUrl);

      return { url: urlData.publicUrl, error: null };
    } catch (error: any) {
      console.error('❌ Error uploading avatar:', error?.message || error);
      return { url: null, error };
    }
  }

  /**
   * Delete media from storage
   * @param filePath - Storage path of the file
   */
  static async deleteMedia(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting media:', error);
      return false;
    }
  }

  /**
   * Get public URL for a storage path
   * @param filePath - Storage path
   * @returns Public URL
   */
  static getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * Extract storage path from public URL
   * @param publicUrl - Full public URL
   * @returns Storage path
   */
  static extractPathFromUrl(publicUrl: string): string | null {
    try {
      const url = new URL(publicUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.indexOf(this.BUCKET_NAME);
      
      if (bucketIndex !== -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting path from URL:', error);
      return null;
    }
  }

  /**
   * Check if a file exists in storage
   * @param filePath - Storage path
   * @returns True if file exists
   */
  static async fileExists(filePath: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .list(filePath.split('/').slice(0, -1).join('/'));

      if (error) return false;

      const fileName = filePath.split('/').pop();
      return data?.some(file => file.name === fileName) || false;
    } catch (error) {
      return false;
    }
  }
}

