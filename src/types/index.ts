export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  username: string | null;
  phone_number?: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Friend {
  id: string;
  name: string;
  username: string;
  avatar_url?: string;
  friends_since: string;
}

export interface Capsule {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  content_refs: any[] | null;
  open_at: string | null;
  lat: number | null;
  lng: number | null;
  is_public: boolean;
  allowed_users: any[] | null;
  blockchain_hash: string | null;
  created_at: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'none' | null;
  is_locked: boolean;
  view_count: number;
}

export interface CapsuleContent {
  id: string;
  capsule_id: string;
  content_type: 'image' | 'video' | 'audio' | 'text';
  file_url: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SharedCapsule {
  id: string;
  capsule_id: string;
  user_id: string;
  permission: 'view' | 'edit';
  created_at: string;
}

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface MediaFile {
  uri: string;
  type: string;
  name: string;
  size?: number;
}

export interface CreateCapsuleData {
  title: string;
  description?: string | null;
  open_at?: string | null;
  lat?: number | null;
  lng?: number | null;
  is_public: boolean;
  allowed_users: string[];
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'none';
  is_locked?: boolean;
  contents?: Omit<CapsuleContent, 'id' | 'capsule_id' | 'created_at'>[];
}

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}

export interface CapsulesState {
  capsules: Capsule[];
  loading: boolean;
  error: string | null;
  selectedCapsule: Capsule | null;
}

export interface UIState {
  theme: 'light' | 'dark';
  activeTab: string;
  networkStatus: 'online' | 'offline';
}

export interface NavigationProps {
  navigation: any;
  route: any;
}

export interface FormFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  secureTextEntry?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
}

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: any;
  textStyle?: any;
}

export interface CapsuleCardProps {
  capsule: Capsule;
  onPress: (capsule: Capsule) => void;
  showLock?: boolean;
}

export interface MediaUploadProps {
  onMediaSelected: (media: MediaFile[]) => void;
  maxFiles?: number;
  allowedTypes?: ('image' | 'video' | 'audio')[];
}

export interface LocationPickerProps {
  onLocationSelected: (location: Location) => void;
  initialLocation?: Location;
}

export interface DateTimePickerProps {
  onDateChange: (date: Date) => void;
  initialDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
}