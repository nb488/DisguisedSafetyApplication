import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as SMS from 'expo-sms';
import React, { useCallback, useEffect, useState } from 'react';
import { ImageBackground, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import TutorialOverlay, { TutorialStep } from '../components/TutorialOverlay';
import WeatherIcon from '../components/WeatherIcon';
import * as SecureStore from '../utils/storage';
import { fetchWeatherForLocation, mapIconCodeToIonicon, WeatherData, WEST_VANCOUVER_COORDS } from '../utils/weather';

export default function WeatherCoverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isTutorialVisible, setIsTutorialVisible] = useState(false);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(true);
  const [activeFace, setActiveFace] = useState<'weather' | 'period'>('weather');
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const checkTutorialStatus = useCallback(async () => {
    if (params.showTutorial === 'true') {
      setIsTutorialVisible(true);
      return;
    }

    try {
      const hasSeen = await SecureStore.getItemAsync('has_seen_tutorial');
      if (hasSeen !== 'true') {
        setIsTutorialVisible(true);
      }
    } catch (error) {
      console.error('Error checking tutorial status:', error);
    }
  }, [params.showTutorial]);

  useEffect(() => {
    checkTutorialStatus();
  }, [checkTutorialStatus]);

  useFocusEffect(
    useCallback(() => {
      async function loadSettings() {
        try {
          const face = await SecureStore.getItemAsync('active_face');
          if (face === 'period') {
            setActiveFace('period');
          } else {
            setActiveFace('weather');
          }
        } catch (err) {
          console.error('Error loading face settings:', err);
        }
      }
      loadSettings();
    }, [])
  );

  useEffect(() => {
    async function loadWeather() {
      setIsLoadingWeather(true);
      // Hardcoded to West Vancouver as requested
      const data = await fetchWeatherForLocation(WEST_VANCOUVER_COORDS.latitude, WEST_VANCOUVER_COORDS.longitude);
      setWeatherData(data);
      setIsLoadingWeather(false);
    }
    loadWeather();
  }, []);

  useEffect(() => {
    let timer: any;
    if (isCountingDown && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    } else if (isCountingDown && countdown === 0) {
      triggerSOS();
    }
    return () => clearTimeout(timer);
  }, [isCountingDown, countdown]);

  const handleTutorialComplete = async () => {
    try {
      await SecureStore.setItemAsync('has_seen_tutorial', 'true');
      setIsTutorialVisible(false);
    } catch (error) {
      console.error('Error saving tutorial status:', error);
      setIsTutorialVisible(false); // Hide anyway
    }
  };

  const tutorialSteps: TutorialStep[] = [
    {
      title: 'Welcome to Wing',
      description: `On the surface, this app blends in perfectly. Currently, it looks like a ${activeFace === 'weather' ? 'weather app' : 'period tracker'}, but you can customize it with different 'faces' in settings.`,
      top: 100,
    },
    {
      title: 'Emergency SOS',
      description: (
        <Text style={{ fontSize: 16, color: '#666', lineHeight: 24 }}>
          {activeFace === 'weather'
            ? 'Tapping this "Severe Weather Alert" card will immediately and silently send an SOS with your location to your saved emergency contacts. '
            : 'Tapping this "Health Advisory" card will immediately and silently send an SOS with your location to your saved emergency contacts. '}
          If no contacts are set, it defaults to <Text style={{ fontWeight: 'bold' }}>calling 911</Text>.
        </Text>
      ),
      top: 380,
      arrow: {
        direction: 'up',
        top: -45,
        left: '45%',
      },
      spotlight: activeFace === 'weather' ? {
        top: 300,
        left: '3%',
        width: '94%',
        height: 65,
        borderRadius: 12,
      } : {
        top: 480, // Positioned for periodSOSCard
        left: '3%',
        width: '94%',
        height: 65,
        borderRadius: 12,
      }
    },
    {
      title: 'Hidden Settings',
      description: 'This is the discreet app button. Tap the hand icon at the bottom right corner of the screen to enter your PIN and access the real settings.',
      bottom: 90,
      right: '2%',
      arrow: {
        direction: 'down-right',
        bottom: -45,
        right: 15,
      },
      spotlight: {
        bottom: 20,
        right: 15,
        width: 50,
        height: 50,
        borderRadius: 25,
      }
    }
  ];

  const handleSettingsPress = async () => {
    try {
      const storedPin = await SecureStore.getItemAsync('app_settings_pin');
      if (!storedPin) {
        router.push('/settings');
      } else {
        router.push('/pin');
      }
    } catch (error) {
      console.error('SecureStore error:', error);
      router.push('/settings');
    }
  };

  const handleSOSPress = () => {
    setIsCountingDown(true);
    setCountdown(5);
  };

  const handleCancelSOS = () => {
    setIsCountingDown(false);
    setCountdown(5);
  };

  const triggerSOS = async () => {
    setIsCountingDown(false);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      const lat = location.coords.latitude;
      const lon = location.coords.longitude;
      const appleMapsLink = `https://maps.apple.com/?q=${lat},${lon}`;
      const googleMapsLink = `https://maps.google.com/?q=${lat},${lon}`;
      const mapSnapshotLink = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lon}&zoom=15&size=600x400&markers=${lat},${lon},red-pushpin`;

      const customMessage = await SecureStore.getItemAsync('emergency_message');
      const messageText = customMessage || 'I need help. Please contact me or send assistance.';

      const contactsStr = await SecureStore.getItemAsync('emergency_contacts');
      let contacts: string[] = [];
      if (contactsStr) {
        try {
          const parsed = JSON.parse(contactsStr);
          if (Array.isArray(parsed)) {
            contacts = parsed
              .map((c: any) => {
                if (typeof c === 'string') return c.trim();
                if (c && typeof c === 'object' && c.phone) return String(c.phone).trim();
                return '';
              })
              .filter((p: string) => p.length > 0);
          }
        } catch (e) {
          console.error('Error parsing contacts JSON:', e);
        }
      }

      const message = `${messageText}\n\n📍 My Emergency Location:\nApple Maps: ${appleMapsLink}\nGoogle Maps: ${googleMapsLink}\nMap Snapshot: ${mapSnapshotLink}`;

      const isAvailable = await SMS.isAvailableAsync();
      if (isAvailable) {
        const recipients = contacts.length > 0 ? contacts : ['911'];
        await SMS.sendSMSAsync(recipients, message);
      }
    } catch (error) {
      console.error('SOS Error:', error);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/sunny_background.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <TutorialOverlay
        isVisible={isTutorialVisible}
        steps={tutorialSteps}
        onFinish={handleTutorialComplete}
        onExit={handleTutorialComplete}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {activeFace === 'weather' ? (
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.city}>West Vancouver</Text>
              <Text style={styles.temperature}>{weatherData ? Math.round(weatherData.temperature) : '--'}°</Text>
              <Text style={styles.condition}>Sunny</Text>
              <Text style={styles.highLow}>H:{weatherData?.high !== undefined ? Math.round(weatherData.high) : '--'}°  L:{weatherData?.low !== undefined ? Math.round(weatherData.low) : '--'}°</Text>
            </View>

            {/* SOS Alert Card */}
            <TouchableOpacity onPress={handleSOSPress} activeOpacity={0.8} style={styles.sosCard}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <Ionicons name="warning" size={20} color="#ff6b6b" style={{ marginTop: 2, marginRight: 8 }} />
                <View>
                  <Text style={styles.sosCardTitle}>Severe Weather Alert</Text>
                  <Text style={styles.sosCardSubtitle}>Air Quality Advisory until 11:00 PM</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Hourly Forecast */}
            <View style={styles.card}>
              <Text style={styles.cardDesc}>
                {weatherData?.dailyForecast && weatherData.dailyForecast.length > 0 ? weatherData.dailyForecast[0]?.condition : 'Fetching forecast details...'}
              </Text>
              <View style={styles.divider} />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hourlyList}>
                {weatherData?.hourlyForecast && weatherData.hourlyForecast.length > 0 ? (() => {
                  const enhancedHourly: any[] = [...weatherData.hourlyForecast];
                  const parseTimeStringToTodayDate = (timeStr: string) => {
                    if (!timeStr) return null;
                    const [time, modifier] = timeStr.split(' ');
                    if (!time || !modifier) return null;
                    let [hours, minutes] = time.split(':').map(Number);
                    if (modifier.toLowerCase() === 'pm' && hours < 12) hours += 12;
                    if (modifier.toLowerCase() === 'am' && hours === 12) hours = 0;
                    const d = new Date();
                    d.setHours(hours, minutes, 0, 0);
                    return d.getTime();
                  };

                  const sunriseTime = parseTimeStringToTodayDate(weatherData?.sunrise || '');
                  const sunsetTime = parseTimeStringToTodayDate(weatherData?.sunset || '');

                  if (sunriseTime) enhancedHourly.push({ isEntity: true, label: 'Sunrise', timestamp: sunriseTime, iconName: 'sunny' });
                  if (sunsetTime) enhancedHourly.push({ isEntity: true, label: 'Sunset', timestamp: sunsetTime, iconName: 'moon' });

                  enhancedHourly.sort((a, b) => {
                    const tA = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp;
                    const tB = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp;
                    return tA - tB;
                  });

                  const nowTime = Date.now();
                  const futureHourly = enhancedHourly.filter(item => {
                    const t = typeof item.timestamp === 'string' ? new Date(item.timestamp).getTime() : item.timestamp;
                    return t > nowTime - 3600000;
                  });

                  return futureHourly.map((item: any, idx: number) => {
                    const t = typeof item.timestamp === 'string' ? new Date(item.timestamp).getTime() : item.timestamp;
                    const date = new Date(t);
                    const timeString = idx === 0 && !item.isEntity ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric', minute: item.isEntity ? '2-digit' : undefined, hour12: true }).replace(' ', '');

                    if (item.isEntity) {
                       return (
                          <View key={`sun-${idx}`} style={styles.hourlyItem}>
                            <Text style={styles.hourlyTime}>{timeString}</Text>
                            <View style={styles.hourlyIconContainer}>
                              <WeatherIcon name={item.iconName} size={28} />
                            </View>
                            <View style={styles.hourlyTempContainer}>
                              <Text style={styles.hourlyTemp}>{item.label}</Text>
                            </View>
                          </View>
                       );
                    }

                    const iconName = mapIconCodeToIonicon(item.iconCode);
                    return (
                      <View key={`hourly-${idx}`} style={styles.hourlyItem}>
                        <Text style={styles.hourlyTime}>{timeString}</Text>
                        <View style={styles.hourlyIconContainer}>
                          <WeatherIcon name={iconName} size={28} />
                        </View>
                        <View style={styles.hourlyTempContainer}>
                          <Text style={styles.hourlyTemp}>{Math.round(item.temperature)}°</Text>
                        </View>
                      </View>
                    );
                  });
                })() : (
                  <View style={styles.hourlyItem}>
                    <Text style={styles.hourlyTime}>Now</Text>
                    <WeatherIcon name="cloud" size={24} />
                    <Text style={styles.hourlyTemp}>--°</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* 10-Day Forecast */}
            <View style={[styles.card, { marginBottom: 100 }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.6)" />
                <Text style={styles.cardTitle}>10-DAY FORECAST</Text>
              </View>
              <View style={styles.divider} />

              {weatherData?.dailyForecast && weatherData.dailyForecast.length > 0 ? (
                weatherData.dailyForecast.map((day: any, idx: number) => {
                  let displayDay = day.periodName.split(' ')[0];
                  const dayMap: { [key: string]: string } = {
                    'Monday': 'Mon', 'Tuesday': 'Tue', 'Wednesday': 'Wed', 'Thursday': 'Thu', 'Friday': 'Fri', 'Saturday': 'Sat', 'Sunday': 'Sun', 'Tonight': 'Today'
                  };
                  if (dayMap[displayDay]) displayDay = dayMap[displayDay];

                  return (
                    <React.Fragment key={`daily-${idx}`}>
                      {idx > 0 && <View style={styles.dividerInner} />}
                      <View style={styles.dailyRow}>
                        <Text style={styles.dailyDay} numberOfLines={1}>{displayDay}</Text>
                        <View style={styles.dailyIconGroup}>
                          <WeatherIcon name={mapIconCodeToIonicon(day.iconCode)} size={24} />
                        </View>
                        <Text style={styles.dailyTempLow}>{day.temperatureClass === 'low' ? Math.round(day.temperature) : '--'}°</Text>
                        <View style={styles.barBg}>
                          <LinearGradient
                            colors={['#5ac8fa', '#007aff']}
                            style={[styles.barFill, {
                              width: `${Math.max(20, Math.min(100, Math.abs(day.temperature) * 5))}%`,
                              alignSelf: day.temperatureClass === 'low' ? 'flex-start' : 'flex-end',
                              left: day.temperatureClass === 'low' ? '15%' : '0%'
                            }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                          />
                          {idx === 0 && <View style={[styles.dotActive, { position: 'absolute', right: '15%' }]} />}
                        </View>
                        <Text style={styles.dailyTempHigh}>{day.temperatureClass === 'high' ? Math.round(day.temperature) : '--'}°</Text>
                      </View>
                    </React.Fragment>
                  );
                })
              ) : (
                <View style={styles.dailyRow}>
                  <Text style={styles.dailyDay}>Today</Text>
                  <View style={styles.dailyIconGroup}>
                    <WeatherIcon name="cloud" size={20} />
                  </View>
                  <Text style={styles.dailyTempLow}>--°</Text>
                  <View style={styles.barBg}>
                    <LinearGradient colors={['#5ac8fa', '#66cc99']} style={[styles.barFill, { width: '50%' }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                  </View>
                  <Text style={styles.dailyTempHigh}>--°</Text>
                </View>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView style={[styles.scroll, { backgroundColor: '#FFF5F7' }]} showsVerticalScrollIndicator={false}>
            {/* Period Tracker Header */}
            <View style={[styles.header, { marginTop: Platform.OS === 'ios' ? 20 : 40 }]}>
              <Text style={[styles.city, { color: '#D6336C', fontWeight: 'bold' }]}>Your Cycle</Text>
              <Text style={[styles.subtext, { color: '#D6336C', opacity: 0.7 }]}>Day 12 - Follicular Phase</Text>
            </View>

            {/* Circular Progress (Hero) */}
            <View style={styles.periodHero}>
              <LinearGradient
                colors={['#FFD1DC', '#FFB7C5']}
                style={styles.periodCircle}
              >
                <View style={styles.periodCircleInner}>
                  <Text style={styles.periodMessage}>Period in</Text>
                  <Text style={styles.periodDays}>5 Days</Text>
                </View>
              </LinearGradient>
            </View>

            {/* Non-functional Edit Dates Button */}
            <TouchableOpacity activeOpacity={0.8} style={styles.logSymptomsBtn}>
              <LinearGradient
                colors={['#FFB7C5', '#FFD1DC']}
                style={styles.logSymptomsGradient}
              >
                <Text style={[styles.logSymptomsText, { color: '#D6336C' }]}>Edit Period Dates</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Separate SOS Trigger */}
            <TouchableOpacity onPress={handleSOSPress} activeOpacity={0.8} style={styles.periodSOSCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="medical" size={20} color="#D6336C" style={{ marginRight: 10 }} />
                <View>
                  <Text style={styles.periodSOSTitle}>Health Advisory</Text>
                  <Text style={styles.periodSOSSub}>Cycle regularity and wellness tips</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Cycle Milestones */}
            <View style={styles.periodCard}>
              <Text style={styles.periodCardTitle}>Predicted Milestones</Text>
              <View style={styles.periodRow}>
                <View style={[styles.periodDot, { backgroundColor: '#FF8787' }]} />
                <Text style={styles.periodRowText}>Fertile Window</Text>
                <Text style={styles.periodRowSub}>Starts tomorrow</Text>
              </View>
              <View style={styles.periodRow}>
                <View style={[styles.periodDot, { backgroundColor: '#4DABF7' }]} />
                <Text style={styles.periodRowText}>Ovulation</Text>
                <Text style={styles.periodRowSub}>In 4 days</Text>
              </View>
              <View style={[styles.periodRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.periodDot, { backgroundColor: '#D6336C' }]} />
                <Text style={styles.periodRowText}>Next Period</Text>
                <Text style={styles.periodRowSub}>March 14</Text>
              </View>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        )}

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, activeFace === 'period' && styles.periodBottomBar]}>
          <Ionicons name={activeFace === 'weather' ? "map-outline" : "calendar-outline"} size={28} color={activeFace === 'weather' ? "white" : "#D6336C"} />

          <View style={styles.pageControl}>
            <Ionicons name={activeFace === 'weather' ? "location-sharp" : "ellipse"} size={12} color={activeFace === 'weather' ? "white" : "#D6336C"} style={{ marginHorizontal: 2 }} />
            <View style={[activeFace === 'weather' ? styles.dotActive : styles.periodDotActive]} />
            <View style={[activeFace === 'weather' ? styles.dot : styles.periodDotInactive]} />
            <View style={[activeFace === 'weather' ? styles.dot : styles.periodDotInactive]} />
          </View>

          <TouchableOpacity onPress={handleSettingsPress} style={[styles.settingsButton, activeFace === 'period' && { backgroundColor: 'rgba(214, 51, 108, 0.1)' }]} activeOpacity={0.8}>
            <FontAwesome5 name="hand-rock" size={20} color={activeFace === 'weather' ? "white" : "#D6336C"} />
          </TouchableOpacity>
        </View>

        {isCountingDown && (
          <View style={styles.countdownOverlay}>
            <LinearGradient
              colors={activeFace === 'weather' ? ['rgba(15, 80, 150, 0.95)', 'rgba(0, 50, 120, 0.98)'] : ['rgba(255, 245, 247, 0.95)', 'rgba(255, 230, 235, 0.98)']}
              style={styles.countdownGradient}
            >
              <Text style={[styles.countdownTitle, activeFace === 'period' && { color: '#D6336C' }]}>Sending SOS...</Text>
              <View style={[styles.countdownCircle, activeFace === 'period' && { borderColor: '#D6336C' }]}>
                <Text style={[styles.countdownNumber, activeFace === 'period' && { color: '#D6336C' }]}>{countdown}</Text>
              </View>
              <Text style={[styles.countdownSubtext, activeFace === 'period' && { color: '#868E96' }]}>Your emergency contacts will be notified in {countdown} seconds.</Text>

              <TouchableOpacity onPress={handleCancelSOS} style={styles.cancelSOSBtn}>
                <Text style={styles.cancelSOSText}>CANCEL</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  scroll: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 60,
    marginBottom: 40,
  },
  city: {
    fontSize: 34,
    color: '#fff',
    fontWeight: '400',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  temperature: {
    fontSize: 96,
    color: '#fff',
    fontWeight: '200',
    marginVertical: -5,
    textAlign: 'center',
  },
  condition: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '500',
    textAlign: 'center',
  },
  highLow: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(0, 50, 120, 0.25)',
    borderRadius: 15,
    marginHorizontal: 20,
    padding: 15,
    marginBottom: 15,
  },
  cardDesc: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 15,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: -15,
    marginBottom: 10,
  },
  dividerInner: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 10,
  },
  hourlyList: {
    flexDirection: 'row',
  },
  hourlyItem: {
    alignItems: 'center',
    width: 70,
    marginRight: 10,
  },
  hourlyIconContainer: {
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  hourlyTempContainer: {
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hourlyTime: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  hourlyIconGroup: {
    marginBottom: 10,
    alignItems: 'center',
  },
  hourlyTemp: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 5,
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyDay: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    width: 65,
  },
  dailyIconGroup: {
    width: 30,
    alignItems: 'center',
  },
  dailyTempLow: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 20,
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  dailyTempHigh: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '500',
    width: 40,
    textAlign: 'right',
  },
  barBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 2,
    marginHorizontal: 15,
    justifyContent: 'center',
  },
  barFill: {
    position: 'absolute',
    height: 4,
    borderRadius: 2,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(15, 80, 150, 0.9)',
  },
  pageControl: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 28,
  },
  dotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
    marginHorizontal: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 3,
  },
  settingsButton: {
    padding: 2,
    marginRight: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 34,
    height: 34,
    overflow: 'hidden'
  },
  sosCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderRadius: 12,
    marginHorizontal: 20,
    padding: 15,
    marginBottom: 15,
  },
  sosCardTitle: {
    color: '#ffcccc',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  sosCardSubtitle: {
    color: 'rgba(255, 204, 204, 0.8)',
    fontSize: 13,
  },
  subtext: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 5,
  },
  periodHero: {
    alignItems: 'center',
    marginVertical: 40,
  },
  periodCircle: {
    width: 240,
    height: 240,
    borderRadius: 120,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#D6336C',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  periodCircleInner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  periodMessage: {
    color: '#D6336C',
    fontSize: 18,
    fontWeight: '500',
  },
  periodDays: {
    color: '#D6336C',
    fontSize: 42,
    fontWeight: 'bold',
  },
  logSymptomsBtn: {
    marginHorizontal: 40,
    marginBottom: 20,
    borderRadius: 25,
    overflow: 'hidden',
  },
  logSymptomsGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  logSymptomsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  periodCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    marginHorizontal: 20,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  periodCardTitle: {
    color: '#343A40',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  periodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  periodDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  periodRowText: {
    flex: 1,
    color: '#495057',
    fontSize: 16,
    fontWeight: '500',
  },
  periodRowSub: {
    color: '#ADB5BD',
    fontSize: 14,
  },
  periodBottomBar: {
    backgroundColor: '#FFF5F7',
    borderTopColor: 'rgba(214, 51, 108, 0.1)',
  },
  periodDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D6336C',
    marginHorizontal: 3,
  },
  periodDotInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFD1DC',
    marginHorizontal: 3,
  },
  periodSOSCard: {
    backgroundColor: 'rgba(214, 51, 108, 0.05)',
    borderRadius: 15,
    marginHorizontal: 20,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(214, 51, 108, 0.1)',
  },
  periodSOSTitle: {
    color: '#D6336C',
    fontSize: 15,
    fontWeight: '600',
  },
  periodSOSSub: {
    color: '#868E96',
    fontSize: 13,
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  countdownGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  countdownTitle: {
    fontSize: 28,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 40,
  },
  countdownCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  countdownNumber: {
    fontSize: 72,
    color: '#fff',
    fontWeight: 'bold',
  },
  countdownSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 60,
    paddingHorizontal: 40,
  },
  cancelSOSBtn: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  cancelSOSText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  }
});
