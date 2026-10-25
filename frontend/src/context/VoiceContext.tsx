import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

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

export interface VoiceContextType {
  // Speech-to-Text
  isListening: boolean;
  liveTranscript: string;
  isSttSupported: boolean;
  startListening: (onResult: (text: string) => void) => void;
  stopListening: () => void;
  toggleListening: (onResult: (text: string) => void) => void;

  // Text-to-Speech
  isSpeaking: boolean;
  speakingMessageId: string | null;
  isTtsSupported: boolean;
  speak: (text: string, messageId?: string) => void;
  stopSpeaking: () => void;
  toggleSpeaking: (text: string, messageId?: string) => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onResultCallbackRef = useRef<((text: string) => void) | null>(null);

  const isSttSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const isTtsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Initialize Speech Recognition singleton
  useEffect(() => {
    if (!isSttSupported) return;

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let final = '';
        let interim = '';

        for (let i = 0; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const combined = (final + interim).trim();
        setLiveTranscript(combined);

        if (combined && onResultCallbackRef.current) {
          onResultCallbackRef.current(combined);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Voice Assistant] Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setIsListening(false);
          setLiveTranscript('');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        setLiveTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('[Voice Assistant] Failed to initialize SpeechRecognition:', e);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, [isSttSupported]);

  // Clean up speech synthesis on window unload
  useEffect(() => {
    return () => {
      if (isTtsSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isTtsSupported]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (!isTtsSupported) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  }, [isTtsSupported]);

  // Start listening
  const startListening = useCallback((onResult: (text: string) => void) => {
    // If assistant is currently speaking, stop it so it doesn't talk over the user
    stopSpeaking();

    if (!recognitionRef.current) return;
    onResultCallbackRef.current = onResult;
    setLiveTranscript('');
    try {
      recognitionRef.current.start();
    } catch {
      // recognition may already be active
    }
  }, [stopSpeaking]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
    } catch {
      // ignore
    }
    setIsListening(false);
    setLiveTranscript('');
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

    // Stop speech recognition if listening
    if (isListening) {
      stopListening();
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const cleanText = cleanTextForSpeech(rawText);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-US';

    // Pick a natural English voice
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
  }, [isTtsSupported, isListening, stopListening]);

  // Toggle speaking
  const toggleSpeaking = useCallback((text: string, messageId?: string) => {
    if (isSpeaking && speakingMessageId === messageId) {
      stopSpeaking();
    } else {
      speak(text, messageId);
    }
  }, [isSpeaking, speakingMessageId, speak, stopSpeaking]);

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        liveTranscript,
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
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = (): VoiceContextType => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};
