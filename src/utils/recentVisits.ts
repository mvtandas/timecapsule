import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_VISITS_KEY = '@recent_visits';
const MAX_RECENT_VISITS = 12; // Maximum number of recent visits to store

export interface RecentVisit {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  visited_at: string; // ISO date string
}

/**
 * Get recent visits from storage
 */
export const getRecentVisits = async (): Promise<RecentVisit[]> => {
  try {
    const data = await AsyncStorage.getItem(RECENT_VISITS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error getting recent visits:', error);
    return [];
  }
};

/**
 * Add a visit to recent visits
 * If user already exists, update the timestamp and move to front
 */
export const addRecentVisit = async (user: {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}): Promise<void> => {
  try {
    const visits = await getRecentVisits();
    
    // Remove if already exists
    const filtered = visits.filter(v => v.id !== user.id);
    
    // Add to front
    const newVisit: RecentVisit = {
      ...user,
      visited_at: new Date().toISOString(),
    };
    
    const updated = [newVisit, ...filtered].slice(0, MAX_RECENT_VISITS);
    
    await AsyncStorage.setItem(RECENT_VISITS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error adding recent visit:', error);
  }
};

/**
 * Clear all recent visits
 */
export const clearRecentVisits = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_VISITS_KEY);
  } catch (error) {
    console.error('Error clearing recent visits:', error);
  }
};

/**
 * Remove a specific visit
 */
export const removeRecentVisit = async (userId: string): Promise<void> => {
  try {
    const visits = await getRecentVisits();
    const filtered = visits.filter(v => v.id !== userId);
    await AsyncStorage.setItem(RECENT_VISITS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error removing recent visit:', error);
  }
};

