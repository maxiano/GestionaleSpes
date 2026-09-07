import React from 'react';
import { AppNotification } from '../../types';
import { Trophy, X } from 'lucide-react';

interface NotificationToastProps {
  notification: AppNotification | null;
  onClose: () => void;
  onClick?: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onClose,
  onClick
}) => {
  if (!notification) return null;

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        onClick={onClick}
        className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-emerald-500/40 flex items-start gap-3 cursor-pointer hover:bg-slate-850 transition"
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Notifica Push PWA
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <h4 className="text-xs font-bold text-white mt-0.5 truncate">
            {notification.title}
          </h4>
          <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
        </div>
      </div>
    </div>
  );
};
