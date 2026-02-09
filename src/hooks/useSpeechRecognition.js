/**
 * useSpeechRecognition — Robust Web Speech API hook
 * 
 * FIXES from the original WritingSession:
 * 1. Never calls .abort() — it's unreliable on mobile Chrome
 * 2. Language switch does a clean stop → wait → restart cycle
 * 3. Uses a state machine (idle/starting/listening/stopping) to prevent race conditions
 * 4. Proper cleanup on unmount — no orphaned listeners
 * 5. Restart backoff to prevent infinite loops when speech service hiccups
 */
import { useState, useRef, useCallback, useEffect } from 'react';

const STATES = { IDLE: 'idle', STARTING: 'starting', LISTENING: 'listening', STOPPING: 'stopping' };
const MAX_RESTART_DELAY = 2000;
const BASE_RESTART_DELAY = 150;

function getSpeechAPI() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function isSupported() {
  return getSpeechAPI() !== null;
}

export default function useSpeechRecognition({ onResult, onFinal, onError }) {
  const [state, setState] = useState(STATES.IDLE);
  const [lang, setLang] = useState('ar-EG');

  const recRef = useRef(null);
  const stateRef = useRef(STATES.IDLE);
  const langRef = useRef('ar-EG');
  const restartCount = useRef(0);
  const pendingRestart = useRef(null);
  const mountedRef = useRef(true);

  // Keep refs in sync
  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { langRef.current = lang; }, [lang]);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (pendingRestart.current) {
      clearTimeout(pendingRestart.current);
      pendingRestart.current = null;
    }
    if (recRef.current) {
      try {
        recRef.current.onresult = null;
        recRef.current.onerror = null;
        recRef.current.onend = null;
        recRef.current.onstart = null;
        recRef.current.stop();
      } catch (e) { /* already stopped */ }
      recRef.current = null;
    }
  }, []);

  const createRecognition = useCallback((speechLang) => {
    const SpeechRecognition = getSpeechAPI();
    if (!SpeechRecognition) return null;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = speechLang;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      if (!mountedRef.current) return;
      restartCount.current = 0;
      setState(STATES.LISTENING);
    };

    rec.onresult = (event) => {
      if (!mountedRef.current) return;
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      if (interim) onResult?.(interim);
      if (final.trim()) onFinal?.(final.trim());
    };

    rec.onerror = (event) => {
      if (!mountedRef.current) return;
      console.warn('Speech error:', event.error);
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        onError?.('Microphone access denied. Allow mic in browser settings.');
        setState(STATES.IDLE);
        return;
      }
      if (event.error === 'no-speech') {
        // Normal — user paused. onend will handle restart.
        return;
      }
      if (event.error === 'network') {
        onError?.('Network error. Check your connection.');
      }
      // For aborted/other errors, let onend handle restart
    };

    rec.onend = () => {
      if (!mountedRef.current) return;
      
      // If we're in STOPPING state, we intended to stop
      if (stateRef.current === STATES.STOPPING || stateRef.current === STATES.IDLE) {
        setState(STATES.IDLE);
        recRef.current = null;
        return;
      }

      // Otherwise, auto-restart with backoff
      recRef.current = null;
      restartCount.current++;
      const delay = Math.min(BASE_RESTART_DELAY * restartCount.current, MAX_RESTART_DELAY);

      pendingRestart.current = setTimeout(() => {
        pendingRestart.current = null;
        if (!mountedRef.current || stateRef.current === STATES.IDLE || stateRef.current === STATES.STOPPING) return;
        
        try {
          const newRec = createRecognition(langRef.current);
          if (newRec) {
            recRef.current = newRec;
            newRec.start();
          }
        } catch (e) {
          console.error('Restart failed:', e);
          if (mountedRef.current) setState(STATES.IDLE);
        }
      }, delay);
    };

    return rec;
  }, [onResult, onFinal, onError]);

  const start = useCallback((speechLang) => {
    if (stateRef.current === STATES.LISTENING || stateRef.current === STATES.STARTING) return;
    
    cleanup();
    const targetLang = speechLang || langRef.current;
    setLang(targetLang);

    setState(STATES.STARTING);
    
    try {
      const rec = createRecognition(targetLang);
      if (!rec) {
        onError?.('Speech recognition not supported. Use Chrome on your Samsung.');
        setState(STATES.IDLE);
        return;
      }
      recRef.current = rec;
      rec.start();
    } catch (e) {
      console.error('Start failed:', e);
      setState(STATES.IDLE);
      onError?.('Could not start speech recognition: ' + e.message);
    }
  }, [cleanup, createRecognition, onError]);

  const stop = useCallback(() => {
    setState(STATES.STOPPING);
    cleanup();
    setState(STATES.IDLE);
  }, [cleanup]);

  const switchLanguage = useCallback((newLang) => {
    const speechLang = newLang === 'en' ? 'en-US' : 'ar-EG';
    setLang(speechLang);
    
    // If currently listening, do a clean restart with new language
    if (stateRef.current === STATES.LISTENING || stateRef.current === STATES.STARTING) {
      setState(STATES.STOPPING);
      cleanup();
      // Brief pause to let the old recognition fully release the mic
      setTimeout(() => {
        if (mountedRef.current) {
          start(speechLang);
        }
      }, 300);
    }
  }, [cleanup, start]);

  return {
    state,
    lang,
    isListening: state === STATES.LISTENING,
    isStarting: state === STATES.STARTING,
    start,
    stop,
    switchLanguage,
    isSupported: isSupported(),
  };
}
