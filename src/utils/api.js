const BASE = import.meta.env.VITE_API_URL || 'https://agentee-backend-production.up.railway.app';

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
    const res = await fetch(`${BASE}/transcribe`, { method: 'POST', body: form });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    console.error('Transcribe error:', err);
    return { ok: false, data: null };
  }
};
