import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as SecureStore from '../../utils/storage';

const SYSTEM_PROMPT = `You are a compassionate safety planning assistant for people experiencing domestic abuse. 
Your role is to help users create personalized safety plans. Focus on:
- Financial safety (separate accounts, hidden savings)
- Location safety (shelters, trusted contacts, disabling tracking)
- Children's safety if applicable
- Document safety (ID, passport, bank cards)
- Digital safety (clearing history, monitored devices)
Always be empathetic, non-judgmental, and prioritize the user's immediate safety.
Keep responses concise and actionable. Remind users to clear browsing history if their device may be monitored.`;

const THEMES = {
  weather: {
    bg: ['#4A90E2', '#1A0B2E'],
    header: 'rgba(255, 255, 255, 0.1)',
    headerText: '#FFFFFF',
    userBubble: 'rgba(255, 255, 255, 0.2)',
    aiBubble: 'rgba(255, 255, 255, 0.15)',
    bubbleBorder: 'rgba(255, 255, 255, 0.2)',
    text: '#FFFFFF',
    inputBg: 'rgba(255, 255, 255, 0.1)',
    inputBorder: 'rgba(255, 255, 255, 0.2)',
    button: '#FFFFFF',
    buttonText: '#4A90E2',
    icon: '#FFFFFF'
  },
  period: {
    bg: ['#FFF5F7', '#FFF5F7'],
    header: '#FFFFFF',
    headerText: '#D6336C',
    userBubble: '#D6336C',
    aiBubble: '#FFFFFF',
    bubbleBorder: 'rgba(214, 51, 108, 0.1)',
    text: '#495057',
    inputBg: '#FFFFFF',
    inputBorder: 'rgba(214, 51, 108, 0.15)',
    button: '#D6336C',
    buttonText: '#FFFFFF',
    icon: '#D6336C'
  }
};

export default function ChatbotScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: 'Hello. I am here to help you form a safety plan. You can tell me about your current situation regarding finances, location, or safety, and I can give you advice on how to proceed.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  const PREDEFINED_OPTIONS = [
    "I need help with my finances",
    "I need a safe location to leave",
    "How can I protect my children?",
    "I need general advice"
  ];

  const sendMessageToAI = async (userMsg: string) => {
    if (isLoading) return;

    setIsLoading(true);
    setInput('');

    // Pre-populate UI with user message + empty AI bubble
    setMessages(prev => [
      ...prev,
      { role: 'user', text: userMsg },
      { role: 'ai', text: '' }
    ]);

    // Build history for API, formatting correctly for OpenRouter
    const historyToUse = messages.length > 0 && messages[0].role === 'ai' ? messages.slice(1) : messages;
    const conversationHistory = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...historyToUse.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      { role: 'user', content: userMsg }
    ];

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.EXPO_PUBLIC_OPENROUTER_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "openrouter/free",
          "messages": conversationHistory,
        })
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Received ${response.status} status from OpenRouter. Response body:`, errorBody);
        throw new Error(`OpenRouter API error: ${response.status} - ${errorBody}`);
      }

      const data = await response.json();
      const aiResponseText = data.choices[0]?.message?.content || "I couldn't process that response.";

      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'ai', text: aiResponseText };
        return updated;
      });
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (error: any) {
      const errorMessage = error.message || String(error);
      console.error('API integration error:', errorMessage);
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'ai',
          text: `[DEBUG API ERROR]: ${errorMessage}`
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (option: string) => {
    sendMessageToAI(option);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessageToAI(input.trim());
  };

  return (
    <LinearGradient colors={theme.bg as [string, string, ...string[]]} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.bubbleBorder }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={28} color={theme.icon} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.headerText }]}>AI Assistant</Text>
          </View>

          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              IMPORTANT: This is an AI assistant. While it can provide guidance, do not rely on it for critical safety or legal decisions. Always consult with professional resources.
            </Text>
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.chatArea}
            contentContainerStyle={{ paddingBottom: 20 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((msg, index) => (
              msg.text && msg.role !== 'ai' || (msg.role === 'ai' && msg.text !== '' && !msg.text.startsWith('[DEBUG')) ? (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user'
                      ? [styles.userBubble, { backgroundColor: theme.userBubble, borderColor: theme.bubbleBorder }]
                      : [styles.aiBubble, { backgroundColor: theme.aiBubble, borderColor: theme.bubbleBorder }]
                  ]}
                >
                  {msg.role === 'user' ? (
                    <Text style={[styles.messageText, { color: msg.role === 'user' ? '#fff' : activeFace === 'weather' ? '#fff' : '#495057' }]}>
                      {msg.text}
                    </Text>
                  ) : (
                    <Markdown style={Object.assign({}, markdownStyles, { body: { color: activeFace === 'weather' ? '#fff' : '#495057', fontSize: 16, lineHeight: 24 } })}>{msg.text}</Markdown>
                  )}
                </View>
              ) : msg.text && msg.text.startsWith('[DEBUG') ? (
                <View key={index} style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.aiBubble, borderColor: theme.bubbleBorder }]}>
                  <Text style={[styles.messageText, { color: activeFace === 'weather' ? '#fff' : '#495057' }]}>{msg.text}</Text>
                </View>
              ) : (
                // Loading bubble
                <View key={index} style={[styles.messageBubble, styles.aiBubble, { backgroundColor: theme.aiBubble, borderColor: theme.bubbleBorder }]}>
                  <Text style={[styles.messageText, { color: activeFace === 'weather' ? '#fff' : '#495057' }]}>...</Text>
                </View>
              )
            ))}
          </ScrollView>

          <View style={[styles.optionsWrapper, { backgroundColor: 'transparent', borderTopColor: theme.bubbleBorder, borderTopWidth: 1 }]}>
            {PREDEFINED_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.optionBtn, isLoading && styles.optionBtnDisabled, { backgroundColor: theme.aiBubble, borderColor: theme.bubbleBorder }]}
                onPress={() => handleOptionSelect(option)}
                disabled={isLoading}
              >
                <Text style={[styles.optionBtnText, { color: theme.buttonText }]}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.inputArea, { backgroundColor: theme.header, borderTopColor: theme.bubbleBorder }]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: activeFace === 'weather' ? '#fff' : '#495057' }]}
              value={input}
              onChangeText={setInput}
              placeholder="Ask for advice..."
              placeholderTextColor={activeFace === 'weather' ? 'rgba(255,255,255,0.4)' : '#ADB5BD'}
              onSubmitEditing={handleSend}
              editable={!isLoading}
            />
            <TouchableOpacity style={[styles.sendBtn, isLoading && styles.sendBtnDisabled, { backgroundColor: theme.button, shadowColor: theme.button }]} onPress={handleSend} disabled={isLoading}>
              <Text style={[styles.sendBtnText, { color: theme.buttonText }]}>{isLoading ? '...' : 'Send'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1.5,
  },
  backBtn: { padding: 10, marginLeft: -10 },
  headerTitle: {
    fontSize: 30,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: -1,
  },
  chatArea: { flex: 1, padding: 24 },
  messageBubble: {
    maxWidth: '85%',
    padding: 18,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '300',
  },
  optionsWrapper: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 10, justifyContent: 'center' },
  optionBtn: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1 },
  optionBtnDisabled: { opacity: 0.5 },
  optionBtnText: { fontSize: 14, textAlign: 'center', fontWeight: '500' },
  inputArea: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    borderTopWidth: 1.5,
  },
  input: {
    flex: 1,
    padding: 16,
    borderRadius: 25,
    fontSize: 16,
    marginRight: 10,
    borderWidth: 1.5,
    fontWeight: '400',
  },
  sendBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { fontWeight: '700', fontSize: 16 },
  warningBanner: {
    backgroundColor: 'rgba(61, 37, 37, 0.6)',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(110, 68, 68, 0.4)',
  },
  warningText: {
    color: '#ff9b9b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
    opacity: 0.9,
  },
});

const markdownStyles = StyleSheet.create({
  body: { color: '#fff', fontSize: 16, lineHeight: 24 },
  strong: { fontWeight: 'bold' },
  em: { fontStyle: 'italic' },
  paragraph: { marginTop: 0, marginBottom: 5 },
  list_item: { marginBottom: 5, flexDirection: 'row' },
  bullet_list_icon: { color: '#fff', fontSize: 16, marginRight: 5 },
});
