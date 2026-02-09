// src/utils/api.js — A-GENTEE Backend Bridge
// Corrected: Feb 9 2026 — URL fix + fetch syntax fix

const BASE = import.meta.env.VITE_API_URL || 'https://agentee.up.railway.app'; // ← FIX #1: correct Railway URL

async function api(path, opts = {}) {
  try {
    const res = await fetch(`${BASE}${path}`, {  // ← FIX #2: parentheses, not tagged template
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

export const healthCheck = () => api('/health');

export const think = (message, { modelOverride } = {}) =>
  api('/think', {
    method: 'POST',
    body: JSON.stringify({
      message,
      ...(modelOverride && { model_override: modelOverride }),
    }),
  });

export const saveIdea = (content) =>
  api('/ideas', { method: 'POST', body: JSON.stringify({ content }) });

export const getLibrary = () => api('/ideas');

export const exportAll = () => api('/ideas/export');

// Audio transcription via Whisper (fallback when Web Speech API unavailable)
export const transcribe = async (blob) => {
  try {
    const form = new FormData();
    form.append('audio', blob, 'recording.webm');
    const res = await fetch(`${BASE}/transcribe`, { method: 'POST', body: form }); // ← FIX #2 again
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error('Transcribe error:', err);
    return { ok: false, data: null };
  }
};
