import React, { useState } from 'react';
import { UserProfile, AppNotification } from '../../types';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { NotificationBell } from '../notifications/NotificationBell';
import {
  KeyRound,
  Settings,
  LogOut,
  Users,
  UserPlus,
  FileSpreadsheet,
  Download,
  CalendarCheck,
  Database,
  Trash2,
  ChevronDown,
  DoorClosed
} from 'lucide-react';

interface HeaderProps {
  userProfile: UserProfile | null;
  notifications?: AppNotification[];
  onSelectTournament?: (teamId: string) => void;
  onOpenPasswordModal: () => void;
  onLogout: () => void;
  onSelectAdminTab: (tabId: string) => void;
  onExportPlayersExcel: () => void;
  onImportPlayersExcel: () => void;
  onExportParentsExcel: () => void;
  onImportParentsExcel: () => void;
  onExportLockerRoomsExcel?: () => void;
  onDownloadBackup: () => void;
  onWipeDatabase: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  userProfile,
  notifications = [],
  onSelectTournament,
  onOpenPasswordModal,
  onLogout,
  onSelectAdminTab,
  onExportPlayersExcel,
  onImportPlayersExcel,
  onExportParentsExcel,
  onImportParentsExcel,
  onExportLockerRoomsExcel,
  onDownloadBackup,
  onWipeDatabase
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isAdmin = userProfile?.role === 'admin';

  return (
    <nav className="bg-slate-950/90 backdrop-blur-xl text-white px-4 sm:px-6 py-3 flex justify-between items-center shadow-xl shadow-black/30 border-b border-slate-800 sticky top-0 z-50 print:hidden">
      {/* Brand & User info */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-md ring-1 ring-emerald-500/30 overflow-hidden">
          <img
            src="./icon-192.png"
            alt="Spes Montesacro"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <div>
          <h1 className="text-sm sm:text-base font-black tracking-wider uppercase bg-gradient-to-r from-white via-slate-100 to-emerald-300 bg-clip-text text-transparent">
            Spes Montesacro
          </h1>
          <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {userProfile ? (
              <span>
                {userProfile.name} <strong className="text-emerald-400 uppercase">({userProfile.role})</strong>
              </span>
            ) : (
              'Caricamento...'
            )}
          </p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-2">
        <NotificationBell
          userProfile={userProfile}
          notifications={notifications}
          onSelectTournament={onSelectTournament}
        />

        <PWAInstallButton />

        {userProfile && (
          <button
            id="nav-btn-password"
            onClick={onOpenPasswordModal}
            className="bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs px-3 py-2 rounded-xl font-semibold border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5"
            title="Cambia Password"
          >
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Password</span>
          </button>
        )}

        {/* Club management dropdown for Admin */}
        {isAdmin && (
          <div className="relative">
            <button
              id="menu-toggle-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-100 text-xs px-3.5 py-2 rounded-xl font-bold transition border border-slate-700/60 shadow flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Gestione Club</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {dropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-2xl shadow-2xl bg-slate-900 border border-slate-800 py-2 z-50 divide-y divide-slate-800">
                  <div className="px-2 py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        onSelectAdminTab('tab-locker-rooms');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-amber-300 hover:bg-slate-800 hover:text-amber-200 rounded-xl flex items-center gap-2 transition"
                    >
                      <DoorClosed className="w-4 h-4 text-amber-400" />
                      Piano Spogliatoi &amp; Campi
                    </button>
                    <button
                      onClick={() => {
                        onSelectAdminTab('tab-staff');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl flex items-center gap-2 transition"
                    >
                      <Users className="w-4 h-4 text-blue-400" />
                      Gestione Staff / Allenatori
                    </button>
                    <button
                      onClick={() => {
                        onSelectAdminTab('tab-parents');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl flex items-center gap-2 transition"
                    >
                      <UserPlus className="w-4 h-4 text-purple-400" />
                      Gestione Genitori
                    </button>
                    <button
                      onClick={() => {
                        onSelectAdminTab('tab-staff-attendance');
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-emerald-400 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <CalendarCheck className="w-4 h-4" />
                      Presenze & Materiale Staff
                    </button>
                  </div>

                  <div className="px-2 py-1 space-y-0.5">
                    {onExportLockerRoomsExcel && (
                      <button
                        onClick={() => {
                          onExportLockerRoomsExcel();
                          setDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-amber-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                        Esporta Spogliatoi (Excel)
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onImportPlayersExcel();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      Importa Giocatori (Excel)
                    </button>
                    <button
                      onClick={() => {
                        onExportPlayersExcel();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      Esporta Giocatori (Excel)
                    </button>
                  </div>

                  <div className="px-2 py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        onImportParentsExcel();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-purple-400" />
                      Importa Genitori (Excel)
                    </button>
                    <button
                      onClick={() => {
                        onExportParentsExcel();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <Download className="w-4 h-4 text-purple-400" />
                      Esporta Genitori (Excel)
                    </button>
                  </div>

                  <div className="px-2 py-1 space-y-0.5">
                    <button
                      onClick={() => {
                        onDownloadBackup();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-emerald-400 hover:bg-slate-800 rounded-xl flex items-center gap-2 transition"
                    >
                      <Database className="w-4 h-4" />
                      Backup Database (JSON)
                    </button>
                    <button
                      onClick={() => {
                        onWipeDatabase();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-900/30 rounded-xl flex items-center gap-2 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                      Svuota Database
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {userProfile && (
          <button
            id="btn-logout"
            onClick={onLogout}
            className="bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white text-xs px-3.5 py-2 rounded-xl font-bold transition border border-rose-500/30 shadow-sm flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        )}
      </div>
    </nav>
  );
};
