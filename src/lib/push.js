// src/lib/push.js — A-GENTEE Push Subscription Helper (Phase 3)
// VAPID key fetch, notification permission, push subscribe/unsubscribe.

const BASE = import.meta.env.VITE_API_URL || 'https://agentee.up.railway.app/api/v1';

/**
 * Fetch the VAPID public key from the backend.
 */
export async function getVapidKey() {
  try {
    const res = await fetch(`${BASE}/push/vapid`);
    const data = await res.json();
    return data.public_key || null;
  } catch (err) {
    console.error('[Push] Failed to fetch VAPID key:', err);
    return null;
  }
}

/**
 * Convert a VAPID key string to a Uint8Array for the subscribe call.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from(rawData, (char) => char.charCodeAt(0));
}

/**
 * Request notification permission from the user.
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications not supported');
    return 'denied';
  }
  return await Notification.requestPermission();
}

/**
 * Subscribe to push notifications.
 * Returns the subscription object or null on failure.
 */
export async function subscribeToPush() {
  try {
    // 1. Permission
    const permission = await requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push] Permission not granted:', permission);
      return null;
    }

    // 2. Service worker must be ready
    const registration = await navigator.serviceWorker.ready;

    // 3. VAPID key
    const vapidKey = await getVapidKey();
    if (!vapidKey) return null;

    // 4. Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    });

    // 5. Send subscription to backend
    const subJson = subscription.toJSON();
    await fetch(`${BASE}/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subJson.endpoint,
        p256dh: subJson.keys?.p256dh,
        auth: subJson.keys?.auth,
        user_agent: navigator.userAgent,
      }),
    });

    console.log('[Push] Subscribed successfully ✅');
    return subscription;
  } catch (err) {
    console.error('[Push] Subscription failed:', err);
    return null;
  }
}

/**
 * Check if push is currently subscribed.
 */
export async function isSubscribed() {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

/**
 * Unsubscribe from push notifications.
 * Unsubscribes from browser AND tells backend to remove the subscription.
 */
export async function unsubscribeFromPush() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      // Get endpoint before unsubscribing (needed for backend cleanup)
      const endpoint = subscription.endpoint;

      // Unsubscribe from browser
      await subscription.unsubscribe();

      // Tell backend to remove this subscription
      try {
        await fetch(`${BASE}/push/unsubscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        });
      } catch (backendErr) {
        // Backend cleanup failed — not critical, subscription is already
        // removed from browser. Backend will clean up on next push (410 Gone).
        console.warn('[Push] Backend cleanup failed:', backendErr);
      }

      console.log('[Push] Unsubscribed ✅');
      return true;
    }
    // No subscription found — still return true so UI resets
    return true;
  } catch (err) {
    console.error('[Push] Unsubscribe failed:', err);
    return false;
  }
}
