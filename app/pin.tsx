import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import * as SecureStore from '../utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const THEMES = {
  weather: {
    bg: ['#4A90E2', '#1A0B2E'],
    text: '#FFFFFF',
    dot: '#FFFFFF',
    dotFilled: '#FFFFFF',
    keyText: '#FFFFFF',
    backtext: 'rgba(255,255,255,0.8)',
    icon: '#FFFFFF'
  },
  period: {
    bg: ['#FFF5F7', '#FFF5F7'],
    text: '#D6336C',
    dot: 'rgba(214, 51, 108, 0.2)',
    dotFilled: '#D6336C',
    keyText: '#D6336C',
    backtext: '#868E96',
    icon: '#D6336C'
  }
};

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFace, setActiveFace] = useState<'weather' | 'period'>('weather');

  const checkPin = useCallback(async () => {
    try {
      const storedPin = await SecureStore.getItemAsync('app_settings_pin');
      const savedFace = await SecureStore.getItemAsync('active_face');
      
      if (savedFace === 'period') setActiveFace('period');
      else setActiveFace('weather');

      if (!storedPin) {
        router.replace('/settings');
      } else {
        setSavedPin(storedPin);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      checkPin();
    }, [checkPin])
  );

  const handlePress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === 4) {
        if (newPin === savedPin) {
          router.replace('/settings');
        } else {
          Alert.alert('Error', 'Incorrect PIN');
          setPin('');
        }
      }
    }
  };

  if (loading) return null;

  const theme = THEMES[activeFace];

  return (
    <LinearGradient colors={theme.bg as [string, string, ...string[]]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Enter PIN</Text>
        
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3].map((index) => (
            <View 
              key={index} 
              style={[
                styles.dot, 
                { borderColor: theme.dotFilled }, 
                pin.length > index && { backgroundColor: theme.dotFilled }
              ]} 
            />
          ))}
        </View>

        <View style={styles.keypad}>
          {['1','2','3','4','5','6','7','8','9','','0','<'].map((key, i) => (
            <TouchableOpacity 
              key={i} 
              style={[styles.key, key === '' && styles.keyEmpty]}
              onPress={() => {
                if (key === '<') setPin(pin.slice(0, -1));
                else if (key !== '') handlePress(key);
              }}
              disabled={key === ''}
            >
              {key === '<' ? (
                <Ionicons name="backspace-outline" size={32} color={theme.icon} />
              ) : (
                <Text style={[styles.keyText, { color: theme.keyText }]}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/')}>
          <Text style={[styles.backText, { color: theme.backtext }]}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 40 },
  dotsContainer: { flexDirection: 'row', gap: 20, marginBottom: 60 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', width: 280, justifyContent: 'space-between' },
  key: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  keyEmpty: { backgroundColor: 'transparent' },
  keyText: { fontSize: 32, fontWeight: '400' },
  backBtn: { marginTop: 40, padding: 20 },
  backText: { fontSize: 18, fontWeight: '500' }
});
