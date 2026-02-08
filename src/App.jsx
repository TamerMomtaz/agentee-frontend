// ═══════════════════════════════════════════════════════════════════════════════
// MADESAMARWRITESDREAM v3.0
// Meeting Intelligence Platform for DEVONEERS
// FIXED: Real-time transcription, proper workflow, timer persistence
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION & COLORS
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  goldPrimary: '#B8904A',
  goldCard: '#EDE0C8',
  cream: '#F5F1E8',
  teal: '#2A5C5C',
  tealDeep: '#1E4A4A',
  tealDarkBg: '#0D2626',
  champagne: '#F7E7CE',
  burgundy: '#722F37',
  borderPrimary: '#C9B896',
  textPrimary: '#1A1A1A',
  textSecondary: '#4A4A4A',
  textMuted: '#6A6A6A',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#F87171',
};

// Default Data
const DEFAULT_TEAM = [
  { id: '1', name: 'Alaa Fahmy', role: 'Founder' },
  { id: '2', name: 'Rouba Kharrat', role: 'Founder' },
  { id: '3', name: 'Doaa Alaa', role: 'BD Executive' },
  { id: '4', name: 'Tamer Momtaz', role: 'Product Strategist' },
  { id: '5', name: 'Ahmed Elgazzar', role: 'DevOps, MLOps & System Architect' },
  { id: '6', name: 'Amer Abdelhakeem', role: 'AI/ML Engineer & Full Stack' },
  { id: '7', name: 'Samar Kharrat', role: 'Office Manager' },
];

const DEFAULT_PROJECTS = [
  { id: '1', name: 'Funding Readiness Dashboard', color: '#B8904A' },
  { id: '2', name: 'RootRise Platform', color: '#2A5C5C' },
  { id: '3', name: 'CIARN Proposal', color: '#722F37' },
  { id: '4', name: 'DEVONEERS Platform', color: '#B8904A' },
  { id: '5', name: 'General Operations', color: '#6A6A6A' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE
// ═══════════════════════════════════════════════════════════════════════════════

const storage = {
  get: (key) => {
    try {
      const data = localStorage.getItem(`mswd_${key}`);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(`mswd_${key}`, JSON.stringify(value));
    } catch (e) { console.error(e); }
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// REAL-TIME SPEECH RECOGNITION (Browser API)
// ═══════════════════════════════════════════════════════════════════════════════

const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState('ar-EG'); // Egyptian Arabic default
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      
      if (final) {
        setTranscript(prev => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech error:', event.error);
      if (event.error === 'no-speech') {
        // Restart on no-speech
        setTimeout(() => {
          if (isListening) recognition.start();
        }, 100);
      } else {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        // Auto-restart if still supposed to be listening
        setTimeout(() => recognition.start(), 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language]);

  const startListening = useCallback(() => {
    if (recognitionRef.current) {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [language]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript('');
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    language,
    setLanguage,
    startListening,
    stopListening,
    clearTranscript,
    isSupported: !!recognitionRef.current
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// MEETING TIMER HOOK
// ═══════════════════════════════════════════════════════════════════════════════

const useMeetingTimer = (durationMinutes = 90) => {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [warning, setWarning] = useState(null);
  const intervalRef = useRef(null);
  const warningsRef = useRef(new Set());

  const totalSeconds = durationMinutes * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const progress = (elapsedSeconds / totalSeconds) * 100;
  const isOvertime = remainingSeconds <= 0;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          const newVal = prev + 1;
          const remaining = totalSeconds - newVal;
          
          // Check warnings
          if (remaining === 900 && !warningsRef.current.has('15')) {
            warningsRef.current.add('15');
            setWarning('15 minutes remaining');
            setTimeout(() => setWarning(null), 5000);
          }
          if (remaining === 300 && !warningsRef.current.has('5')) {
            warningsRef.current.add('5');
            setWarning('5 minutes remaining - Start wrapping up!');
            setTimeout(() => setWarning(null), 5000);
          }
          if (remaining === 60 && !warningsRef.current.has('1')) {
            warningsRef.current.add('1');
            setWarning('1 minute remaining - Final remarks!');
            setTimeout(() => setWarning(null), 5000);
          }
          
          return newVal;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning, totalSeconds]);

  const start = () => setIsRunning(true);
  const pause = () => setIsRunning(false);
  const reset = () => {
    setIsRunning(false);
    setElapsedSeconds(0);
    warningsRef.current.clear();
    setWarning(null);
  };

  return {
    isRunning,
    elapsed: formatTime(elapsedSeconds),
    remaining: formatTime(remainingSeconds),
    progress,
    isOvertime,
    warning,
    start,
    pause,
    reset
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

const Button = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '' }) => {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-200 disabled:opacity-50";
  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };
  const styles = {
    primary: { backgroundColor: COLORS.teal, color: 'white' },
    gold: { background: `linear-gradient(135deg, ${COLORS.goldPrimary}, #A07A3A)`, color: COLORS.tealDarkBg },
    secondary: { backgroundColor: 'transparent', color: COLORS.teal, border: `2px solid ${COLORS.teal}` },
    ghost: { backgroundColor: 'transparent', color: COLORS.textSecondary },
    danger: { backgroundColor: COLORS.danger, color: 'white' },
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${className}`} style={styles[variant]}>
      {children}
    </button>
  );
};

const Card = ({ children, className = '', onClick, style = {} }) => (
  <div onClick={onClick} className={`rounded-xl border overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-lg' : ''} ${className}`} 
       style={{ backgroundColor: COLORS.goldCard, borderColor: COLORS.borderPrimary, ...style }}>
    {children}
  </div>
);

const Badge = ({ children, color = 'teal' }) => {
  const colors = {
    teal: { bg: `${COLORS.teal}20`, text: COLORS.teal },
    gold: { bg: `${COLORS.goldPrimary}20`, text: COLORS.goldPrimary },
    success: { bg: `${COLORS.success}20`, text: '#22C55E' },
    warning: { bg: `${COLORS.warning}20`, text: '#D97706' },
    danger: { bg: `${COLORS.danger}20`, text: '#DC2626' },
  };
  const c = colors[color] || colors.teal;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: c.bg, color: c.text }}>{children}</span>;
};

const Modal = ({ isOpen, onClose, title, children, wide = false }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(13,38,38,0.9)' }} onClick={onClose}>
      <div className={`rounded-2xl p-6 max-h-[90vh] overflow-y-auto border-2 ${wide ? 'w-full max-w-4xl' : 'w-full max-w-xl'}`}
           style={{ backgroundColor: COLORS.goldCard, borderColor: COLORS.borderPrimary }} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5 pb-4 border-b" style={{ borderColor: COLORS.borderPrimary }}>
          <h2 className="text-xl font-semibold" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>{title}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/50 text-2xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, type = 'text', placeholder = '', required = false, multiline = false }) => (
  <div className="mb-4">
    {label && <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.textSecondary }}>{label} {required && <span className="text-red-500">*</span>}</label>}
    {multiline ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
                className="w-full px-3 py-2 rounded-lg border resize-none focus:outline-none focus:ring-2"
                style={{ backgroundColor: COLORS.cream, borderColor: COLORS.borderPrimary }} />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
             className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2"
             style={{ backgroundColor: COLORS.cream, borderColor: COLORS.borderPrimary }} />
    )}
  </div>
);

const Select = ({ label, value, onChange, options, required = false }) => (
  <div className="mb-4">
    {label && <label className="block text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: COLORS.textSecondary }}>{label} {required && <span className="text-red-500">*</span>}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border focus:outline-none"
            style={{ backgroundColor: COLORS.cream, borderColor: COLORS.borderPrimary }}>
      <option value="">Select...</option>
      {options.map(opt => <option key={opt.id || opt} value={opt.id || opt}>{opt.name || opt}</option>)}
    </select>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// TIMER DISPLAY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const TimerDisplay = ({ timer, compact = false }) => {
  const progressColor = timer.progress > 80 ? COLORS.danger : timer.progress > 60 ? COLORS.warning : COLORS.teal;
  const circumference = 2 * Math.PI * 45;
  const offset = circumference - (timer.progress / 100) * circumference;

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-lg" style={{ backgroundColor: COLORS.cream }}>
        <div className="relative w-10 h-10">
          <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke={COLORS.borderPrimary} strokeWidth="6" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={progressColor} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset} />
          </svg>
        </div>
        <div>
          <div className="font-mono text-lg font-bold" style={{ color: timer.isOvertime ? COLORS.danger : COLORS.teal }}>{timer.remaining}</div>
          <div className="text-[10px] uppercase" style={{ color: COLORS.textMuted }}>remaining</div>
        </div>
        {!timer.isRunning ? (
          <Button onClick={timer.start} variant="gold" size="sm">▶ Start</Button>
        ) : (
          <Button onClick={timer.pause} variant="secondary" size="sm">⏸ Pause</Button>
        )}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
        🕐 Meeting Timer
      </h3>
      {timer.warning && (
        <div className="mb-3 px-3 py-2 rounded-lg text-sm font-medium animate-pulse" 
             style={{ backgroundColor: `${COLORS.warning}30`, color: '#92400E' }}>
          ⚠️ {timer.warning}
        </div>
      )}
      <div className="text-center">
        <div className="relative w-32 h-32 mx-auto mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="50" cy="50" r="45" fill="none" stroke={COLORS.cream} strokeWidth="8" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={progressColor} strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold" style={{ color: timer.isOvertime ? COLORS.danger : COLORS.teal }}>
              {timer.remaining}
            </span>
            <span className="text-[10px] uppercase" style={{ color: COLORS.textMuted }}>remaining</span>
          </div>
        </div>
        <div className="flex justify-center gap-2">
          {!timer.isRunning ? (
            <Button onClick={timer.start} variant="gold" size="sm">▶ Start</Button>
          ) : (
            <Button onClick={timer.pause} variant="secondary" size="sm">⏸ Pause</Button>
          )}
          <Button onClick={timer.reset} variant="ghost" size="sm">↺ Reset</Button>
        </div>
        <div className="mt-2 text-xs" style={{ color: COLORS.textMuted }}>Elapsed: {timer.elapsed}</div>
      </div>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// LIVE TRANSCRIPTION PANEL
// ═══════════════════════════════════════════════════════════════════════════════

const LiveTranscriptionPanel = ({ onTranscriptChange }) => {
  const speech = useSpeechRecognition();
  
  useEffect(() => {
    if (onTranscriptChange && speech.transcript) {
      onTranscriptChange(speech.transcript);
    }
  }, [speech.transcript, onTranscriptChange]);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2" style={{ color: COLORS.textPrimary }}>
          🎙️ Live Transcription
        </h3>
        {speech.isListening && (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full animate-pulse" style={{ backgroundColor: `${COLORS.danger}20` }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.danger }} />
            <span className="text-xs font-medium" style={{ color: COLORS.danger }}>Recording...</span>
          </div>
        )}
      </div>

      {speech.error && (
        <div className="mb-3 px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: `${COLORS.danger}15`, color: COLORS.danger }}>
          {speech.error}
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs font-semibold uppercase mb-1" style={{ color: COLORS.textSecondary }}>Language</label>
        <select value={speech.language} onChange={e => speech.setLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm" style={{ backgroundColor: COLORS.cream, borderColor: COLORS.borderPrimary }}>
          <option value="ar-EG">العربية المصرية (Egyptian)</option>
          <option value="ar-LB">العربية اللبنانية (Lebanese)</option>
          <option value="ar-SA">العربية الفصحى (Standard)</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <div className="flex gap-2 mb-3">
        <Button onClick={speech.isListening ? speech.stopListening : speech.startListening} 
                variant={speech.isListening ? 'danger' : 'gold'} size="sm" className="flex-1">
          {speech.isListening ? '⏹ Stop' : '🎙️ Start Recording'}
        </Button>
        {speech.transcript && (
          <Button onClick={speech.clearTranscript} variant="ghost" size="sm">🗑️</Button>
        )}
      </div>

      {/* Live transcript display */}
      <div className="p-3 rounded-lg min-h-[100px] max-h-[200px] overflow-y-auto" style={{ backgroundColor: COLORS.cream }}>
        {speech.transcript || speech.interimTranscript ? (
          <p className="text-sm whitespace-pre-wrap" style={{ color: COLORS.textSecondary }} dir="auto">
            {speech.transcript}
            {speech.interimTranscript && (
              <span style={{ color: COLORS.textMuted, fontStyle: 'italic' }}>{speech.interimTranscript}</span>
            )}
          </p>
        ) : (
          <p className="text-sm italic" style={{ color: COLORS.textMuted }}>
            {speech.isListening ? 'Listening... speak now' : 'Click "Start Recording" and speak'}
          </p>
        )}
      </div>
    </Card>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIVE MEETING VIEW (The main workflow)
// ═══════════════════════════════════════════════════════════════════════════════

const ActiveMeetingView = ({ agenda, team, projects, onEndMeeting, onCancel }) => {
  const timer = useMeetingTimer(agenda.duration || 90);
  const [transcript, setTranscript] = useState('');
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [itemNotes, setItemNotes] = useState({});
  const [decisions, setDecisions] = useState([]);
  const [actions, setActions] = useState([]);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [newDecision, setNewDecision] = useState({ title: '', description: '' });
  const [newAction, setNewAction] = useState({ title: '', assignee: '', deadline: '' });

  const currentItem = agenda.items?.[currentItemIndex];

  const addDecision = () => {
    if (!newDecision.title) return;
    setDecisions([...decisions, {
      id: Date.now().toString(),
      ...newDecision,
      agendaItem: currentItem?.topic,
      project: agenda.project,
      date: new Date().toISOString()
    }]);
    setNewDecision({ title: '', description: '' });
    setShowDecisionModal(false);
  };

  const addAction = () => {
    if (!newAction.title || !newAction.assignee) return;
    setActions([...actions, {
      id: Date.now().toString(),
      ...newAction,
      agendaItem: currentItem?.topic,
      project: agenda.project,
      status: 'pending'
    }]);
    setNewAction({ title: '', assignee: '', deadline: '' });
    setShowActionModal(false);
  };

  const endMeeting = () => {
    const minutes = {
      id: Date.now().toString(),
      title: agenda.title,
      date: agenda.date,
      duration: timer.elapsed,
      attendees: agenda.attendees || [],
      transcript,
      itemNotes,
      decisions,
      actions,
      project: agenda.project,
      createdAt: new Date().toISOString()
    };
    onEndMeeting(minutes, decisions, actions);
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: COLORS.cream }}>
      {/* Header with Timer */}
      <div className="flex justify-between items-start mb-6 pb-4 border-b-2" style={{ borderColor: COLORS.borderPrimary }}>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Badge color="danger">● LIVE MEETING</Badge>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>{agenda.title}</h1>
          </div>
          <p style={{ color: COLORS.textMuted }}>{new Date(agenda.date).toLocaleDateString()} • {agenda.attendees?.length || 0} attendees</p>
        </div>
        <div className="flex items-center gap-4">
          <TimerDisplay timer={timer} compact />
          <Button onClick={onCancel} variant="ghost">Cancel</Button>
          <Button onClick={endMeeting} variant="gold">End & Save Meeting</Button>
        </div>
      </div>

      {timer.warning && (
        <div className="mb-4 px-4 py-3 rounded-lg text-center font-medium animate-pulse"
             style={{ backgroundColor: `${COLORS.warning}30`, color: '#92400E' }}>
          ⚠️ {timer.warning}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Agenda Items */}
        <div className="col-span-1">
          <Card className="p-4 mb-4">
            <h3 className="font-semibold mb-3" style={{ color: COLORS.teal }}>📋 Agenda Items</h3>
            <div className="space-y-2">
              {(agenda.items || []).map((item, idx) => (
                <div key={idx} onClick={() => setCurrentItemIndex(idx)}
                     className={`p-3 rounded-lg cursor-pointer transition-all ${idx === currentItemIndex ? 'ring-2' : ''}`}
                     style={{ 
                       backgroundColor: idx === currentItemIndex ? `${COLORS.teal}15` : COLORS.cream,
                       ringColor: COLORS.teal
                     }}>
                  <div className="font-medium text-sm" style={{ color: COLORS.textPrimary }}>{item.topic}</div>
                  <div className="text-xs" style={{ color: COLORS.textMuted }}>{item.duration || 15} min • {item.lead || 'TBD'}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Captured Decisions */}
          <Card className="p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold" style={{ color: COLORS.teal }}>✓ Decisions ({decisions.length})</h3>
              <Button onClick={() => setShowDecisionModal(true)} size="sm" variant="secondary">+ Add</Button>
            </div>
            {decisions.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: COLORS.textMuted }}>No decisions yet</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {decisions.map(d => (
                  <div key={d.id} className="p-2 rounded text-xs" style={{ backgroundColor: COLORS.cream }}>
                    <div className="font-medium">{d.title}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Captured Actions */}
          <Card className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold" style={{ color: COLORS.teal }}>📌 Actions ({actions.length})</h3>
              <Button onClick={() => setShowActionModal(true)} size="sm" variant="secondary">+ Add</Button>
            </div>
            {actions.length === 0 ? (
              <p className="text-xs text-center py-2" style={{ color: COLORS.textMuted }}>No actions yet</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {actions.map(a => (
                  <div key={a.id} className="p-2 rounded text-xs" style={{ backgroundColor: COLORS.cream }}>
                    <div className="font-medium">{a.title}</div>
                    <div style={{ color: COLORS.textMuted }}>→ {a.assignee}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Middle: Current Item + Notes */}
        <div className="col-span-1">
          <Card className="p-4 mb-4">
            <h3 className="font-semibold mb-2" style={{ color: COLORS.teal }}>
              Current: {currentItem?.topic || 'Select an item'}
            </h3>
            {currentItem && (
              <>
                <p className="text-sm mb-3" style={{ color: COLORS.textMuted }}>{currentItem.description || 'No description'}</p>
                <div className="mb-3">
                  <label className="block text-xs font-semibold uppercase mb-1" style={{ color: COLORS.textSecondary }}>Notes for this item</label>
                  <textarea 
                    value={itemNotes[currentItemIndex] || ''} 
                    onChange={e => setItemNotes({ ...itemNotes, [currentItemIndex]: e.target.value })}
                    placeholder="Type notes or use transcription..."
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border resize-none text-sm"
                    style={{ backgroundColor: COLORS.cream, borderColor: COLORS.borderPrimary }}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setShowDecisionModal(true)} size="sm" variant="gold">+ Decision</Button>
                  <Button onClick={() => setShowActionModal(true)} size="sm" variant="secondary">+ Action</Button>
                </div>
              </>
            )}
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))} variant="ghost" size="sm" 
                    disabled={currentItemIndex === 0}>← Previous</Button>
            <Button onClick={() => setCurrentItemIndex(Math.min((agenda.items?.length || 1) - 1, currentItemIndex + 1))} 
                    variant="ghost" size="sm" disabled={currentItemIndex >= (agenda.items?.length || 1) - 1}>Next →</Button>
          </div>
        </div>

        {/* Right: Transcription */}
        <div className="col-span-1">
          <LiveTranscriptionPanel onTranscriptChange={setTranscript} />
          
          {transcript && (
            <div className="mt-4">
              <Button onClick={() => setItemNotes({ ...itemNotes, [currentItemIndex]: (itemNotes[currentItemIndex] || '') + '\n\n[Transcription]\n' + transcript })} 
                      variant="secondary" size="sm" className="w-full">
                📝 Add Transcription to Current Item Notes
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal */}
      <Modal isOpen={showDecisionModal} onClose={() => setShowDecisionModal(false)} title="Record Decision">
        <Input label="Decision" value={newDecision.title} onChange={v => setNewDecision({...newDecision, title: v})} required placeholder="What was decided?" />
        <Input label="Details" value={newDecision.description} onChange={v => setNewDecision({...newDecision, description: v})} multiline placeholder="Context or rationale" />
        <p className="text-xs mb-4" style={{ color: COLORS.textMuted }}>Related to: {currentItem?.topic || 'General'}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDecisionModal(false)}>Cancel</Button>
          <Button variant="gold" onClick={addDecision}>Save Decision</Button>
        </div>
      </Modal>

      {/* Action Modal */}
      <Modal isOpen={showActionModal} onClose={() => setShowActionModal(false)} title="Create Action Item">
        <Input label="Action" value={newAction.title} onChange={v => setNewAction({...newAction, title: v})} required placeholder="What needs to be done?" />
        <Select label="Assignee" value={newAction.assignee} onChange={v => setNewAction({...newAction, assignee: v})} options={team.map(t => ({ id: t.name, name: t.name }))} required />
        <Input label="Deadline" type="date" value={newAction.deadline} onChange={v => setNewAction({...newAction, deadline: v})} />
        <p className="text-xs mb-4" style={{ color: COLORS.textMuted }}>From: {currentItem?.topic || 'General'}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowActionModal(false)}>Cancel</Button>
          <Button variant="gold" onClick={addAction}>Create Action</Button>
        </div>
      </Modal>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════

export default function App() {
  const [view, setView] = useState('dashboard'); // dashboard, agenda, meeting
  const [data, setData] = useState({
    team: DEFAULT_TEAM,
    projects: DEFAULT_PROJECTS,
    agendas: [],
    meetings: [],
    decisions: [],
    actions: []
  });
  const [activeAgenda, setActiveAgenda] = useState(null);
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [newAgenda, setNewAgenda] = useState({ title: '', date: '', project: '', items: [], attendees: [] });
  const [newItem, setNewItem] = useState({ topic: '', lead: '', duration: 15 });

  // Load data
  useEffect(() => {
    const saved = {
      agendas: storage.get('agendas') || [],
      meetings: storage.get('meetings') || [],
      decisions: storage.get('decisions') || [],
      actions: storage.get('actions') || []
    };
    setData(prev => ({ ...prev, ...saved }));
  }, []);

  // Save helpers
  const saveAgenda = (agenda) => {
    const updated = [...data.agendas, agenda];
    setData(prev => ({ ...prev, agendas: updated }));
    storage.set('agendas', updated);
  };

  const handleEndMeeting = (minutes, decisions, actions) => {
    // Save minutes
    const updatedMeetings = [...data.meetings, minutes];
    storage.set('meetings', updatedMeetings);
    
    // Save decisions
    const updatedDecisions = [...data.decisions, ...decisions];
    storage.set('decisions', updatedDecisions);
    
    // Save actions
    const updatedActions = [...data.actions, ...actions];
    storage.set('actions', updatedActions);
    
    // Remove used agenda
    const updatedAgendas = data.agendas.filter(a => a.id !== activeAgenda.id);
    storage.set('agendas', updatedAgendas);
    
    setData(prev => ({
      ...prev,
      meetings: updatedMeetings,
      decisions: updatedDecisions,
      actions: updatedActions,
      agendas: updatedAgendas
    }));
    
    setActiveAgenda(null);
    setView('dashboard');
  };

  const startMeeting = (agenda) => {
    setActiveAgenda(agenda);
    setView('meeting');
  };

  const createAgenda = () => {
    if (!newAgenda.title || !newAgenda.date) return;
    const agenda = {
      id: Date.now().toString(),
      ...newAgenda,
      createdAt: new Date().toISOString()
    };
    saveAgenda(agenda);
    setNewAgenda({ title: '', date: '', project: '', items: [], attendees: [] });
    setShowAgendaModal(false);
  };

  const addAgendaItem = () => {
    if (!newItem.topic) return;
    setNewAgenda({ ...newAgenda, items: [...newAgenda.items, { ...newItem, id: Date.now().toString() }] });
    setNewItem({ topic: '', lead: '', duration: 15 });
  };

  // Active Meeting View
  if (view === 'meeting' && activeAgenda) {
    return (
      <ActiveMeetingView 
        agenda={activeAgenda}
        team={data.team}
        projects={data.projects}
        onEndMeeting={handleEndMeeting}
        onCancel={() => { setActiveAgenda(null); setView('dashboard'); }}
      />
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: COLORS.cream }}>
      {/* Sidebar */}
      <aside className="w-64 fixed h-screen flex flex-col" style={{ backgroundColor: COLORS.tealDarkBg }}>
        <div className="p-5 border-b" style={{ borderColor: COLORS.teal }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold" 
                 style={{ background: `linear-gradient(135deg, ${COLORS.goldPrimary}, #8A6A35)`, color: COLORS.tealDarkBg }}>D</div>
            <div>
              <div className="text-sm font-semibold" style={{ fontFamily: 'Cinzel, serif', color: COLORS.champagne }}>MadeSamar<br/>WritesDream</div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: COLORS.goldPrimary }}>v3.0</div>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-3">
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'agendas', label: '📅 Agendas', badge: data.agendas.length },
            { id: 'meetings', label: '📝 Past Meetings', badge: data.meetings.length },
            { id: 'decisions', label: '✓ Decisions', badge: data.decisions.length },
            { id: 'actions', label: '📌 Actions', badge: data.actions.filter(a => a.status !== 'completed').length },
          ].map(item => (
            <div key={item.id} onClick={() => setView(item.id)}
                 className="flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer mb-1"
                 style={{ 
                   backgroundColor: view === item.id ? `${COLORS.teal}50` : 'transparent',
                   color: COLORS.cream,
                   borderLeft: view === item.id ? `3px solid ${COLORS.goldPrimary}` : '3px solid transparent'
                 }}>
              <span className="text-sm">{item.label}</span>
              {item.badge > 0 && <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: COLORS.teal }}>{item.badge}</span>}
            </div>
          ))}
        </nav>

        <div className="p-4 text-center text-xs" style={{ color: COLORS.textMuted }}>
          DEVONEERS © 2026
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-7">
        {view === 'dashboard' && (
          <div>
            <div className="flex justify-between items-start mb-7">
              <div>
                <h1 className="text-3xl font-semibold mb-1" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>Meeting Intelligence</h1>
                <p style={{ color: COLORS.textMuted }}>The correct workflow: Agenda → Meeting → Decisions & Actions</p>
              </div>
              <Button onClick={() => setShowAgendaModal(true)} variant="gold" size="lg">+ Create Agenda</Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Upcoming', value: data.agendas.length, color: COLORS.goldPrimary },
                { label: 'Meetings Held', value: data.meetings.length, color: COLORS.teal },
                { label: 'Decisions', value: data.decisions.length, color: COLORS.teal },
                { label: 'Open Actions', value: data.actions.filter(a => a.status !== 'completed').length, color: COLORS.warning },
              ].map((s, i) => (
                <Card key={i} className="p-5">
                  <div className="text-3xl font-bold mb-1" style={{ fontFamily: 'Cinzel, serif', color: s.color }}>{s.value}</div>
                  <div className="text-xs uppercase" style={{ color: COLORS.textMuted }}>{s.label}</div>
                </Card>
              ))}
            </div>

            {/* Upcoming Agendas */}
            <Card className="mb-6">
              <div className="p-4 border-b" style={{ borderColor: COLORS.borderPrimary }}>
                <h2 className="font-semibold" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>📅 Upcoming Meetings (Start from Agenda)</h2>
              </div>
              <div className="p-4">
                {data.agendas.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="mb-4" style={{ color: COLORS.textMuted }}>No agendas yet. Create one to start a meeting!</p>
                    <Button onClick={() => setShowAgendaModal(true)} variant="gold">+ Create Agenda</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.agendas.map(agenda => (
                      <div key={agenda.id} className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: COLORS.cream }}>
                        <div>
                          <div className="font-semibold" style={{ color: COLORS.textPrimary }}>{agenda.title}</div>
                          <div className="text-sm" style={{ color: COLORS.textMuted }}>
                            {new Date(agenda.date).toLocaleDateString()} • {agenda.items?.length || 0} items • {agenda.attendees?.length || 0} attendees
                          </div>
                        </div>
                        <Button onClick={() => startMeeting(agenda)} variant="gold">▶ Start Meeting</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            {/* Open Actions */}
            {data.actions.filter(a => a.status !== 'completed').length > 0 && (
              <Card>
                <div className="p-4 border-b" style={{ borderColor: COLORS.borderPrimary }}>
                  <h2 className="font-semibold" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>📌 Open Action Items</h2>
                </div>
                <div className="p-4 space-y-2">
                  {data.actions.filter(a => a.status !== 'completed').map(action => (
                    <div key={action.id} className="flex justify-between items-center p-3 rounded-lg" style={{ backgroundColor: COLORS.cream }}>
                      <div>
                        <div className="font-medium text-sm">{action.title}</div>
                        <div className="text-xs" style={{ color: COLORS.textMuted }}>→ {action.assignee} {action.deadline && `• Due: ${new Date(action.deadline).toLocaleDateString()}`}</div>
                      </div>
                      <select value={action.status} onChange={e => {
                        const updated = data.actions.map(a => a.id === action.id ? { ...a, status: e.target.value } : a);
                        setData(prev => ({ ...prev, actions: updated }));
                        storage.set('actions', updated);
                      }} className="text-xs px-2 py-1 rounded border" style={{ backgroundColor: 'white', borderColor: COLORS.borderPrimary }}>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {view === 'agendas' && (
          <div>
            <div className="flex justify-between items-start mb-7">
              <h1 className="text-3xl font-semibold" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>📅 Agendas</h1>
              <Button onClick={() => setShowAgendaModal(true)} variant="gold">+ Create Agenda</Button>
            </div>
            {data.agendas.length === 0 ? (
              <Card className="p-8 text-center">
                <p style={{ color: COLORS.textMuted }}>No agendas yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {data.agendas.map(a => (
                  <Card key={a.id} className="p-4">
                    <div className="flex justify-between">
                      <div>
                        <div className="font-semibold">{a.title}</div>
                        <div className="text-sm" style={{ color: COLORS.textMuted }}>{new Date(a.date).toLocaleDateString()}</div>
                      </div>
                      <Button onClick={() => startMeeting(a)} variant="gold" size="sm">Start Meeting</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'meetings' && (
          <div>
            <h1 className="text-3xl font-semibold mb-7" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>📝 Past Meetings</h1>
            {data.meetings.length === 0 ? (
              <Card className="p-8 text-center"><p style={{ color: COLORS.textMuted }}>No meetings recorded yet</p></Card>
            ) : (
              <div className="space-y-3">
                {data.meetings.map(m => (
                  <Card key={m.id} className="p-4">
                    <div className="font-semibold">{m.title}</div>
                    <div className="text-sm" style={{ color: COLORS.textMuted }}>
                      {new Date(m.date).toLocaleDateString()} • Duration: {m.duration} • {m.decisions?.length || 0} decisions • {m.actions?.length || 0} actions
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'decisions' && (
          <div>
            <h1 className="text-3xl font-semibold mb-7" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>✓ Decision Vault</h1>
            {data.decisions.length === 0 ? (
              <Card className="p-8 text-center"><p style={{ color: COLORS.textMuted }}>Decisions are created during meetings</p></Card>
            ) : (
              <div className="space-y-3">
                {data.decisions.map(d => (
                  <Card key={d.id} className="p-4">
                    <div className="font-semibold">{d.title}</div>
                    <div className="text-sm" style={{ color: COLORS.textMuted }}>{d.description}</div>
                    <div className="text-xs mt-2" style={{ color: COLORS.textMuted }}>From: {d.agendaItem || 'General'} • {new Date(d.date).toLocaleDateString()}</div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'actions' && (
          <div>
            <h1 className="text-3xl font-semibold mb-7" style={{ fontFamily: 'Cinzel, serif', color: COLORS.teal }}>📌 Action Items</h1>
            {data.actions.length === 0 ? (
              <Card className="p-8 text-center"><p style={{ color: COLORS.textMuted }}>Actions are created during meetings</p></Card>
            ) : (
              <div className="space-y-3">
                {data.actions.map(a => (
                  <Card key={a.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold">{a.title}</div>
                        <div className="text-sm" style={{ color: COLORS.textMuted }}>→ {a.assignee}</div>
                        {a.deadline && <div className="text-xs" style={{ color: COLORS.textMuted }}>Due: {new Date(a.deadline).toLocaleDateString()}</div>}
                      </div>
                      <Badge color={a.status === 'completed' ? 'success' : a.status === 'in_progress' ? 'warning' : 'teal'}>{a.status}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Agenda Modal */}
      <Modal isOpen={showAgendaModal} onClose={() => setShowAgendaModal(false)} title="Create Meeting Agenda" wide>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <Input label="Meeting Title" value={newAgenda.title} onChange={v => setNewAgenda({...newAgenda, title: v})} required placeholder="e.g., Weekly Team Sync" />
            <Input label="Date" type="date" value={newAgenda.date} onChange={v => setNewAgenda({...newAgenda, date: v})} required />
            <Select label="Project" value={newAgenda.project} onChange={v => setNewAgenda({...newAgenda, project: v})} options={data.projects} />
            
            <div className="mb-4">
              <label className="block text-xs font-semibold uppercase mb-2" style={{ color: COLORS.textSecondary }}>Attendees</label>
              <div className="flex flex-wrap gap-2">
                {data.team.map(member => (
                  <button key={member.id} onClick={() => {
                    const attendees = newAgenda.attendees.includes(member.name) 
                      ? newAgenda.attendees.filter(a => a !== member.name)
                      : [...newAgenda.attendees, member.name];
                    setNewAgenda({...newAgenda, attendees});
                  }} className="px-3 py-1 rounded-full text-sm border transition-all"
                    style={{ 
                      backgroundColor: newAgenda.attendees.includes(member.name) ? `${COLORS.teal}20` : COLORS.cream,
                      borderColor: newAgenda.attendees.includes(member.name) ? COLORS.teal : COLORS.borderPrimary,
                      color: newAgenda.attendees.includes(member.name) ? COLORS.teal : COLORS.textSecondary
                    }}>
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold uppercase mb-2" style={{ color: COLORS.textSecondary }}>Agenda Items</label>
            
            {newAgenda.items.length > 0 && (
              <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                {newAgenda.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: COLORS.cream }}>
                    <div>
                      <div className="text-sm font-medium">{item.topic}</div>
                      <div className="text-xs" style={{ color: COLORS.textMuted }}>{item.duration} min • {item.lead || 'TBD'}</div>
                    </div>
                    <button onClick={() => setNewAgenda({...newAgenda, items: newAgenda.items.filter((_, i) => i !== idx)})} 
                            className="text-red-500 text-xs">✕</button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: COLORS.cream }}>
              <Input label="Topic" value={newItem.topic} onChange={v => setNewItem({...newItem, topic: v})} placeholder="Discussion topic" />
              <div className="grid grid-cols-2 gap-2">
                <Select label="Lead" value={newItem.lead} onChange={v => setNewItem({...newItem, lead: v})} options={data.team.map(t => t.name)} />
                <Input label="Minutes" type="number" value={newItem.duration} onChange={v => setNewItem({...newItem, duration: parseInt(v) || 15})} />
              </div>
              <Button onClick={addAgendaItem} variant="secondary" size="sm" className="w-full">+ Add Item</Button>
            </div>
            
            <div className="text-sm" style={{ color: COLORS.textMuted }}>
              Total time: {newAgenda.items.reduce((sum, i) => sum + (i.duration || 0), 0)} minutes
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: COLORS.borderPrimary }}>
          <Button variant="ghost" onClick={() => setShowAgendaModal(false)}>Cancel</Button>
          <Button variant="gold" onClick={createAgenda}>Create Agenda</Button>
        </div>
      </Modal>
    </div>
  );
}
