// src/utils/api.js — A-GENTEE Backend Bridge
// Corrected: Feb 9 2026 — Aligned with backend OpenAPI v6.0.0 schema
// Fixes: field names (query not message, idea not content),
//        transcribe route (/think/audio not /transcribe),
//        voice URL construction from voice_id

const BASE = import.meta.env.VITE_API_URL || 'https://agentee.up.railway.app/api/v1';

// --- Core fetch wrapper ---
async function api(path, opts = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opts,
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error('API error:', path, err);
    return { ok: false, data: null, error: err.message };
  }
}

// --- Health check ---
export const healthCheck = () => api('/health');

// --- Think (text) ---
// Backend ThinkRequest: { query: string, language?: "auto", context_window?: 5 }
// Backend ThinkResponse: { response, engine, category, cost, transcript?, voice_id?, timestamp }
export const think = async (message, { modelOverride } = {}) => {
  const result = await api('/think', {
    method: 'POST',
    body: JSON.stringify({
      query: message,                // ← was "message", backend expects "query"
      language: 'auto',
      context_window: 5,
    }),
  });

  // If backend returned a voice_id, build the full audio URL for the frontend
  if (result.ok && result.data?.voice_id) {
    result.data.audio_url = `${BASE}/voice/${result.data.voice_id}`;
  }

  return result;
};

// --- Ideas ---
// Backend IdeaRequest: { idea: string, category?: "general" }
export const saveIdea = (content, category = 'general') =>
  api('/ideas', {
    method: 'POST',
    body: JSON.stringify({
      idea: content,                 // ← was "content", backend expects "idea"
      category: category,
    }),
  });

// Backend returns: { items/ideas array }
export const getLibrary = () => api('/ideas');

// --- History (conversation log from Supabase) ---
export const getHistory = (limit = 20, offset = 0) =>
  api(`/history?limit=${limit}&offset=${offset}`);

// --- Export (kept for compatibility, may need backend endpoint) ---
export const exportAll = () => api('/ideas/export');

// --- Audio transcription + think (Whisper → AI response) ---
// Backend endpoint: POST /think/audio  (NOT /transcribe)
// Accepts: FormData with "audio" field + optional "language" and "context_window"
// Returns: same ThinkResponse (with transcript field populated)
export const transcribe = async (blob) => {
  try {
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    form.append('language', 'auto');
    const res = await fetch(`${BASE}/think/audio`, {  // ← was /transcribe
      method: 'POST',
      body: form,
      // Note: do NOT set Content-Type header — browser sets it with boundary for FormData
    });
    const data = await res.json();

    // Build audio URL from voice_id if present
    if (res.ok && data?.voice_id) {
      data.audio_url = `${BASE}/voice/${data.voice_id}`;
    }

    return { ok: res.ok, data };
  } catch (err) {
    console.error('Transcribe error:', err);
    return { ok: false, data: null };
  }
};

// --- Stats ---
export const getStats = () => api('/stats');

// --- Mode (behavioral mode + voice personality) ---
export const setMode = (mode = 'default', voicePersonality = 'default', voiceEnabled = true) =>
  api('/mode', {
    method: 'POST',
    body: JSON.stringify({
      mode,
      voice_personality: voicePersonality,
      voice_enabled: voiceEnabled,
    }),
  });
