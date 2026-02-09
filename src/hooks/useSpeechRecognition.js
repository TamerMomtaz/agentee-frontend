import { useState, useRef, useCallback, useEffect } from 'react';

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

export default function useSpeechRecognition({ lang = 'en-US', onResult, onInterim, continuous = true } = {}) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const recRef = useRef(null);
  const stopping = useRef(false);
  const supported = !!SpeechRecognition;

  const stop = useCallback(() => {
    stopping.current = true;
    if (recRef.current) {
      try { recRef.current.stop(); } catch (_) {}
    }
    setListening(false);
    setInterim('');
  }, []);

  const start = useCallback((language) => {
    if (!SpeechRecognition) return;
    // Clean up any existing instance
    if (recRef.current) {
      try { recRef.current.stop(); } catch (_) {}
    }

    const rec = new SpeechRecognition();
    rec.lang = language || lang;
    rec.continuous = continuous;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    stopping.current = false;

    rec.onresult = (e) => {
      let interimText = '';
      let finalText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (interimText) {
        setInterim(interimText);
        if (onInterim) onInterim(interimText);
      }
      if (finalText) {
        setInterim('');
        if (onResult) onResult(finalText);
      }
    };

    rec.onerror = (e) => {
      // Language change or abort — NOT a crash, just stop gracefully
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      console.warn('SpeechRecognition error:', e.error);
      setListening(false);
      setInterim('');
    };

    rec.onend = () => {
      // Auto-restart if we didn't intentionally stop (for continuous listening)
      if (!stopping.current && continuous) {
        try { rec.start(); } catch (_) {
          setListening(false);
          setInterim('');
        }
      } else {
        setListening(false);
        setInterim('');
      }
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
    }
  }, [lang, continuous, onResult, onInterim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopping.current = true;
      if (recRef.current) {
        try { recRef.current.stop(); } catch (_) {}
      }
    };
  }, []);

  return { listening, interim, start, stop, supported };
}
