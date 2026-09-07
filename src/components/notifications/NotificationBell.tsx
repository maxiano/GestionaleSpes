import React, { useState, useEffect, useRef } from 'react';
import { AppNotification, UserProfile } from '../../types';
import {
  getNotificationPermission,
  requestPushPermission,
  showNativeNotification,
  markNotificationAsRead
} from '../../services/notificationService';
import {
  Bell,
  CheckCheck,
  Trophy,
  Calendar,
  Sparkles,
  Smartphone,
  X
} from 'lucide-react';

interface NotificationBellProps {
  userProfile: UserProfile | null;
  notifications: AppNotification[];
  onSelectTournament?: (teamId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  userProfile,
  notifications,
  onSelectTournament
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [requesting, setRequesting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPermission(getNotificationPermission());
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!userProfile) return null;

  const unreadCount = notifications.filter(
    (n) => !n.readBy || !n.readBy.includes(userProfile.uid)
  ).length;

  const handleEnablePush = async () => {
    setRequesting(true);
    try {
      const granted = await requestPushPermission();
      setPermission(granted ? 'granted' : 'denied');
    } finally {
      setRequesting(false);
    }
  };

  const handleTestNotification = () => {
    showNativeNotification('🏆 Test Notifica Spes Montesacro', {
      body: `Ciao ${userProfile.name}! Le notifiche push PWA funzionano correttamente sul tuo dispositivo.`,
      icon: './icon-192.png'
    });
  };

  const handleMarkAllRead = async () => {
    for (const notif of notifications) {
      if (!notif.readBy?.includes(userProfile.uid)) {
        await markNotificationAsRead(notif.id, userProfile.uid);
      }
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.readBy?.includes(userProfile.uid)) {
      await markNotificationAsRead(notif.id, userProfile.uid);
    }

    if (notif.type === 'tournament' && notif.targetTeamId && onSelectTournament) {
      onSelectTournament(notif.targetTeamId);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="btn-notifications-bell"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 transition flex items-center justify-center cursor-pointer"
        title="Centro Notifiche"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-slate-950 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-400" />
              <h3 className="font-bold text-sm">Notifiche Spes</h3>
              {unreadCount > 0 && (
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  {unreadCount} nuove
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-800 transition cursor-pointer"
                  title="Segna tutte come lette"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Tutte lette</span>
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PWA Push Permission Banner */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs">
            {permission === 'unsupported' ? (
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-amber-800 text-[11px]">
                <Smartphone className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Notifiche di sistema non disponibili in questo browser o iframe. Apri l&apos;app in una nuova scheda o installala come PWA.
                </span>
              </div>
            ) : permission !== 'granted' ? (
              <div className="flex flex-col gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="flex items-start gap-2 text-emerald-900">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Notifiche Push PWA</span>
                    <span className="text-[11px] text-emerald-700">
                      Ricevi le notifiche sullo schermo del telefono anche con l&apos;app chiusa.
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleEnablePush}
                  disabled={requesting}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-lg text-xs transition flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{requesting ? 'Attivazione...' : 'Attiva Notifiche Push'}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-600 px-1">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Notifiche Push PWA attive
                </span>
                <button
                  onClick={handleTestNotification}
                  className="text-[10px] text-slate-500 hover:text-slate-900 font-bold underline cursor-pointer"
                >
                  Invia prova
                </button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>Nessuna notifica presente al momento.</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isRead = notif.readBy?.includes(userProfile.uid);
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 transition flex gap-3 cursor-pointer hover:bg-slate-50 ${
                      !isRead ? 'bg-emerald-50/40 font-medium' : 'bg-white'
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">
                      {notif.type === 'tournament' ? (
                        <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                          <Trophy className="w-4 h-4" />
                        </div>
                      ) : notif.type === 'locker_room' ? (
                        <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                          <Calendar className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                          <Bell className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-bold text-slate-900 truncate">
                          {notif.title}
                        </h4>
                        {!isRead && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                      {notif.targetTeamId && (
                        <span className="inline-block mt-1 text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                          Cat. {notif.targetTeamId}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
