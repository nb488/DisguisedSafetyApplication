import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import * as SecureStore from '../../utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const THEMES = {
  weather: {
    bg: ['#4A90E2', '#1A0B2E'],
    headerText: '#FFFFFF',
    subtext: 'rgba(255,255,255,0.8)',
    card: 'rgba(255, 255, 255, 0.1)',
    cardBorder: 'rgba(255, 255, 255, 0.2)',
    title: '#FFFFFF',
    desc: 'rgba(255,255,255,0.9)',
    icon: '#FFFFFF'
  },
  period: {
    bg: ['#FFF5F7', '#FFF5F7'],
    headerText: '#D6336C',
    subtext: '#868E96',
    card: '#FFFFFF',
    cardBorder: 'rgba(214, 51, 108, 0.15)',
    title: '#D6336C',
    desc: '#495057',
    icon: '#D6336C'
  }
};

export default function ResourcesScreen() {
  const router = useRouter();
  const [activeFace, setActiveFace] = useState<'weather' | 'period'>('weather');

  useFocusEffect(
    useCallback(() => {
      const loadFace = async () => {
        const savedFace = await SecureStore.getItemAsync('active_face');
        if (savedFace === 'period') setActiveFace('period');
        else setActiveFace('weather');
      };
      loadFace();
    }, [])
  );

  const theme = THEMES[activeFace];

  const resources = [
    {
      title: 'VictimLinkBC',
      description: '24/7 confidential, multilingual crisis support and referrals.',
      url: 'tel:18005630808'
    },
    {
      title: 'Vancouver Rape Relief & Women’s Shelter',
      description: '24-hour crisis line and emergency shelter for women.',
      url: 'tel:6042556344'
    },
    {
      title: 'Battered Women’s Support Services (BWSS)',
      description: 'Support, advocacy, and crisis lines for women in Metro Vancouver.',
      url: 'tel:18556871868'
    },
    {
      title: 'Legal Aid BC (Vancouver)',
      description: 'Free legal help for low-income residents for family and criminal law.',
      url: 'https://legalaid.bc.ca/'
    },
    {
      title: 'Canadian Human Trafficking Hotline',
      description: 'Confidential 24/7 hotline for support and reporting.',
      url: 'tel:18339001010'
    }
  ];

  return (
    <LinearGradient colors={theme.bg as [string, string, ...string[]]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={theme.icon} />
          </TouchableOpacity>
        </View>
        <ScrollView style={{ paddingHorizontal: 24 }}>
          <Text style={[styles.header, { color: theme.headerText }]}>Help Resources</Text>
          <Text style={[styles.subtext, { color: theme.subtext }]}>Quick links to organizations that can assist you in Vancouver and British Columbia.</Text>

          {resources.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}
              onPress={() => Linking.openURL(item.url)}
            >
              <Text style={[styles.cardTitle, { color: theme.title }]}>{item.title}</Text>
              <Text style={[styles.cardDesc, { color: theme.desc }]}>{item.description}</Text>
            </TouchableOpacity>
          ))}
          
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerContainer: { marginTop: 10, marginBottom: 10, paddingHorizontal: 20 },
  header: { fontSize: 32, fontWeight: 'bold', marginTop: 10 },
  subtext: { marginBottom: 30, fontSize: 16, lineHeight: 22 },
  card: { padding: 22, borderRadius: 20, marginBottom: 16, borderWidth: 1.5 },
  cardTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  cardDesc: { fontSize: 15, lineHeight: 20 },
  backBtn: { paddingVertical: 10, marginLeft: -10 },
  bottomSpacer: { height: 50 }
});
