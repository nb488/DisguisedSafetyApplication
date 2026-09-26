import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export const STORAGE_KEYS = {
  PIN: 'app_settings_pin',
  CONTACTS: 'emergency_contacts',
  MESSAGE: 'emergency_message',
  ACTIVE_FACE: 'active_face',
  HAS_SEEN_TUTORIAL: 'has_seen_tutorial',
  HAS_SEEN_TUTORIAL_ALT: 'hasSeenTutorial',
} as const;

export async function getItemAsync(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  } else {
    return await SecureStore.getItemAsync(key);
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage error:', e);
    }
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage error:', e);
    }
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}
