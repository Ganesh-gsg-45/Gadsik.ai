import { useState, useEffect, useRef, useCallback } from 'react';

// Declarations for browser Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

/**
 * Clean markdown and citations so speech synthesis sounds natural and human-like.
 */
export const cleanTextForSpeech = (markdown: string): string => {
  if (!markdown) return '';
  return markdown
    .replace(/```[\s\S]*?```/g, 'Code block omitted.') // skip code blocks
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[Page\s*\d+\]/gi, '') // remove citations like [Page 1]
    .replace(/\(Source:\s*Page\s*\d+\)/gi, '')
    .replace(/#{1,6}\s+/g, '') // remove markdown headings
    .replace(/\*\*([^*]+)\*\*/g, '$1') // remove bold
    .replace(/\*([^*]+)\*/g, '$1') // remove italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // replace markdown links with label
    .replace(/^[-*+]\s+/gm, '') // remove bullet list marks
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .trim();
};

export interface VoiceAssistantHook {
  // Speech to Text (Listening)
  isListening: boolean;
  isSttSupported: boolean;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
  toggleListening: (onResult: (text: string) => void) => void;

  // Text to Speech (Speaking)
  isSpeaking: boolean;
  speakingMessageId: string | null;
  isTtsSupported: boolean;
  speak: (text: string, messageId?: string) => void;
  stopSpeaking: () => void;
  toggleSpeaking: (text: string, messageId?: string) => void;
}

export const useVoiceAssistant = (): VoiceAssistantHook => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onResultCallbackRef = useRef<((text: string) => void) | null>(null);

  const isSttSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const isTtsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isSttSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript.trim() && onResultCallbackRef.current) {
        onResultCallbackRef.current(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[Voice Assistant] Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [isSttSupported]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (isTtsSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isTtsSupported]);

  // Start listening
  const startListening = useCallback((onResult: (text: string) => void) => {
    if (!recognitionRef.current) return;
    onResultCallbackRef.current = onResult;
    try {
      recognitionRef.current.start();
    } catch {
      // recognition may already be running
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
  }, []);

  // Toggle listening
  const toggleListening = useCallback((onResult: (text: string) => void) => {
    if (isListening) {
      stopListening();
    } else {
      startListening(onResult);
    }
  }, [isListening, startListening, stopListening]);

  // Speak text aloud
  const speak = useCallback((rawText: string, messageId?: string) => {
    if (!isTtsSupported) return;

    // Stop any existing speech
    window.speechSynthesis.cancel();

    const cleanText = cleanTextForSpeech(rawText);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Jenny') || v.name.includes('Zira')) && v.lang.startsWith('en')
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      if (messageId) setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    };

    window.speechSynthesis.speak(utterance);
  }, [isTtsSupported]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (!isTtsSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, [isTtsSupported]);

  // Toggle speaking
  const toggleSpeaking = useCallback((text: string, messageId?: string) => {
    if (isSpeaking && speakingMessageId === messageId) {
      stopSpeaking();
    } else {
      speak(text, messageId);
    }
  }, [isSpeaking, speakingMessageId, speak, stopSpeaking]);

  return {
    isListening,
    isSttSupported,
    startListening,
    stopListening,
    toggleListening,
    isSpeaking,
    speakingMessageId,
    isTtsSupported,
    speak,
    stopSpeaking,
    toggleSpeaking,
  };
};
