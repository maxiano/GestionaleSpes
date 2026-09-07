import {
  collection,
  doc,
  addDoc,
  updateDoc,
  arrayUnion,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { AppNotification, UserProfile } from '../types';

// Web Audio API chime for notifications
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second higher tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Non-critical if audio context blocked before interaction
  }
}

/**
 * Check if the browser supports notifications and its permission status
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestPushPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Le notifiche push native non sono supportate da questo browser/ambiente.');
    return false;
  }

  try {
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      // Send a confirmation test notification
      showNativeNotification('🔔 Notifiche Push Spes Attivate!', {
        body: 'Riceverai avvisi in tempo reale per nuovi tornei e programmazione della tua squadra.',
        icon: './icon-192.png'
      });
      return true;
    } else {
      return false;
    }
  } catch (err) {
    console.warn('Errore richiesta permessi notifiche:', err);
    return false;
  }
}

/**
 * Show a native system notification on the device
 */
export async function showNativeNotification(
  title: string,
  options?: NotificationOptions & { vibrate?: number[] }
) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  playNotificationChime();

  const defaultOptions: NotificationOptions = {
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'spes-notification-' + Date.now(),
    ...options
  };

  // Try service worker first (best for PWA & mobile background)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, defaultOptions);
        return;
      }
    } catch (e) {
      console.warn('Fallback a Notification API standard:', e);
    }
  }

  // Fallback to standard Window Notification
  try {
    new Notification(title, defaultOptions);
  } catch (e) {
    console.warn('Errore visualizzazione notifica nativa:', e);
  }
}

/**
 * Create and broadcast a new notification in Firestore
 */
export async function createPushNotification(
  payload: Omit<AppNotification, 'id' | 'createdAt'>
): Promise<string> {
  const newNotif = {
    ...payload,
    createdAt: new Date().toISOString(),
    readBy: []
  };

  try {
    const colRef = collection(db, 'notifications');
    const docRef = await addDoc(colRef, newNotif);
    return docRef.id;
  } catch (err) {
    console.warn('Errore scrittura notifica in Firestore:', err);
    // Fallback: save to local list in localStorage
    const local = JSON.parse(localStorage.getItem('spes_local_notifications') || '[]');
    const id = `local-${Date.now()}`;
    local.unshift({ id, ...newNotif });
    localStorage.setItem('spes_local_notifications', JSON.stringify(local.slice(0, 30)));
    return id;
  }
}

/**
 * Mark a notification as read by a specific user
 */
export async function markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    await updateDoc(docRef, {
      readBy: arrayUnion(userId)
    });
  } catch (err) {
    console.warn('Errore aggiornamento stato lettura notifica:', err);
  }
}

// Track IDs we have already shown native notifications for in this session
const seenNotificationIds = new Set<string>();

/**
 * Subscribe to real-time notifications for the current logged-in user
 */
export function subscribeToNotifications(
  userProfile: UserProfile,
  onNewNotification: (notif: AppNotification) => void,
  onListUpdate: (notifications: AppNotification[]) => void
) {
  const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(30));

  let isFirstLoad = true;

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const items: AppNotification[] = [];

      snapshot.forEach((d) => {
        const data = d.data() as Omit<AppNotification, 'id'>;
        const notif: AppNotification = {
          id: d.id,
          ...data
        };

        // Filter notifications relevant to current user:
        const isForRole =
          !notif.targetRole ||
          notif.targetRole === 'all' ||
          notif.targetRole === userProfile.role ||
          userProfile.role === 'admin';

        const isForTeam =
          !notif.targetTeamId ||
          notif.targetTeamId === 'ALL' ||
          userProfile.role === 'admin' ||
          userProfile.teams?.includes(notif.targetTeamId) ||
          userProfile.teamId === notif.targetTeamId;

        const isForUser =
          !notif.targetUserId ||
          notif.targetUserId === userProfile.uid ||
          userProfile.role === 'admin';

        if (isForRole && isForTeam && isForUser) {
          items.push(notif);

          // If this is a brand new incoming notification (not on initial page load)
          // and we haven't shown it yet in this session, trigger native notification!
          if (!isFirstLoad && !seenNotificationIds.has(notif.id)) {
            seenNotificationIds.add(notif.id);
            const isRead = notif.readBy?.includes(userProfile.uid);
            if (!isRead) {
              // Trigger native notification and chime
              showNativeNotification(notif.title, {
                body: notif.body,
                icon: './icon-192.png'
              });
              onNewNotification(notif);
            }
          } else {
            seenNotificationIds.add(notif.id);
          }
        }
      });

      isFirstLoad = false;
      onListUpdate(items);
    },
    (err) => {
      console.warn('Errore listener notifiche Firestore:', err);
    }
  );

  return unsubscribe;
}
