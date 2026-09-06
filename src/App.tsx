import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Player, ActiveTab } from './types';
import { subscribeToAuth, logoutUser } from './services/authService';
import { getPlayersByTeam, getAllPlayers, batchImportPlayers } from './services/playersService';
import {
  downloadDatabaseBackup,
  wipeAllDataExceptCoachesAndAdmins
} from './services/backupService';
import {
  exportPlayersToExcelFile,
  exportParentsToExcelFile,
  readExcelFile
} from './utils/exports';
import { fetchParentsUsers, createParentAccount } from './services/authService';

// Reusable Components
import { Header } from './components/common/Header';
import { TeamSelector } from './components/common/TeamSelector';
import { NavigationTabs } from './components/common/NavigationTabs';
import { PrintHeader } from './components/common/PrintHeader';
import { LoginForm } from './components/auth/LoginForm';
import { ChangePasswordModal } from './components/modals/ChangePasswordModal';
import { RosterTab } from './components/roster/RosterTab';
import { PlayerModal } from './components/roster/PlayerModal';
import { AttendanceTab } from './components/attendance/AttendanceTab';
import { MonthlyTab } from './components/monthly/MonthlyTab';
import { CallupsTab } from './components/callups/CallupsTab';
import { TournamentsTab } from './components/tournaments/TournamentsTab';
import { StaffTab } from './components/staff/StaffTab';
import { StaffAttendanceTab } from './components/staff/StaffAttendanceTab';
import { ParentsTab } from './components/parents/ParentsTab';
import { ParentPortal } from './components/parent-portal/ParentPortal';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // App active states
  const [activeTeamId, setActiveTeamId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('tab-roster');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  // Modals state
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [playerToEdit, setPlayerToEdit] = useState<Player | null>(null);

  // Hidden file inputs for Excel import
  const playersExcelInputRef = useRef<HTMLInputElement>(null);
  const parentsExcelInputRef = useRef<HTMLInputElement>(null);

  // 1. Auth subscription
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user, profile) => {
      setCurrentUser(user);
      setUserProfile(profile);
      setAuthChecked(true);

      // Auto-set coach's team if single team
      if (profile && profile.role === 'coach') {
        const teams = profile.teams || [];
        if (teams.length === 1) {
          setActiveTeamId(teams[0]);
        } else if (teams.length > 1) {
          setActiveTeamId(teams[0]);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Fetch players whenever activeTeamId changes
  const loadRoster = async () => {
    if (!activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM' || activeTeamId === 'NONE') {
      setPlayers([]);
      return;
    }

    setLoadingPlayers(true);
    try {
      const list = await getPlayersByTeam(activeTeamId);
      setPlayers(list);
    } catch (err) {
      console.error('Errore caricamento rosa:', err);
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [activeTeamId]);

  // Handler for opening add player modal
  const handleOpenAddPlayer = () => {
    if (!activeTeamId || activeTeamId === 'ALL' || activeTeamId === 'SELECT_TEAM') {
      alert('Seleziona prima una squadra!');
      return;
    }
    setPlayerToEdit(null);
    setPlayerModalOpen(true);
  };

  const handleEditPlayer = (player: Player) => {
    setPlayerToEdit(player);
    setPlayerModalOpen(true);
  };

  // Excel handlers
  const handleExportPlayersExcel = async () => {
    try {
      const allPlayers = await getAllPlayers();
      if (allPlayers.length === 0) return alert('Nessun giocatore da esportare!');
      exportPlayersToExcelFile(allPlayers);
    } catch (err: any) {
      alert('Errore export giocatori: ' + err.message);
    }
  };

  const handleImportPlayersExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile<any>(file);
      if (rows.length === 0) return alert('Il file Excel è vuoto.');

      const importedList = rows
        .map((row) => {
          const firstName = row['Nome'] || '';
          const lastName = row['Cognome'] || '';
          const teamId = row['Squadra / Gruppo'] || row['teamId'] || activeTeamId;
          if (!firstName && !lastName) return null;

          return {
            firstName,
            lastName,
            name: `${lastName} ${firstName}`.trim(),
            dob: row['Data di Nascita (YYYY-MM-DD)'] || row['Data di Nascita'] || null,
            role: row['Ruolo'] || 'Non specificato',
            jersey: String(row['Numero Maglia'] || ''),
            medicalExp: row['Scadenza Medica (YYYY-MM-DD)'] || row['Scadenza Medica'] || null,
            parentPhone: String(row['Telefono Genitore'] || '').trim(),
            teamId: teamId || activeTeamId
          };
        })
        .filter(Boolean) as any[];

      const count = await batchImportPlayers(importedList);
      alert(`✅ Importati con successo ${count} giocatori!`);
      loadRoster();
    } catch (err: any) {
      console.error(err);
      alert('Errore lettura Excel: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleExportParentsExcel = async () => {
    try {
      const parents = await fetchParentsUsers();
      if (parents.length === 0) return alert('Nessun genitore da esportare!');
      exportParentsToExcelFile(parents);
    } catch (err: any) {
      alert('Errore export genitori: ' + err.message);
    }
  };

  const handleImportParentsExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await readExcelFile<any>(file);
      if (rows.length === 0) return alert('Il file Excel è vuoto.');

      let count = 0;
      for (const row of rows) {
        const name = row['Nome'] || '';
        const email = row['Email'] || '';
        const phone = String(row['Telefono'] || '').trim();
        const password = row['Password'] || 'Spes2026!';

        if (!name || !phone) continue;

        await createParentAccount({
          name,
          email: email || `genitore_${Date.now()}_${count}@spes.local`,
          phone,
          password
        });
        count++;
      }

      alert(`✅ Importati con successo ${count} genitori!`);
    } catch (err: any) {
      console.error(err);
      alert('Errore import genitori: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleWipeDatabase = async () => {
    if (userProfile?.role !== 'admin') return alert('Accesso riservato agli amministratori.');
    const conf1 = confirm(
      '⚠️ ATTENZIONE: Stai per eliminare TUTTI i giocatori, lo storico partite, convocazioni, presenze, tornei e genitori registrati. Confermi?'
    );
    if (!conf1) return;

    const conf2 = prompt("Per confermare scrivi esattamente la parola 'ELIMINA' in maiuscolo:");
    if (conf2 !== 'ELIMINA') return alert('Operazione annullata.');

    try {
      await wipeAllDataExceptCoachesAndAdmins();
      alert('🗑️ Dati eliminati con successo (account coach e admin preservati).');
      window.location.reload();
    } catch (err: any) {
      alert('Errore svuotamento database: ' + err.message);
    }
  };

  // Loading indicator on initial auth check
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-bounce">⚽</div>
          <p className="text-sm font-bold tracking-wide text-slate-300">
            Avvio Gestionale Spes Montesacro...
          </p>
        </div>
      </div>
    );
  }

  // Not logged in: Show Login Screen
  if (!currentUser || !userProfile) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
        <LoginForm onSuccess={() => {}} />
        <footer className="text-center py-6 text-xs text-slate-500">
          &copy; 2026 Spes Montesacro - Tutti i diritti riservati. Sviluppato per la gestione tecnica.
        </footer>
      </div>
    );
  }

  // Logged in as Parent: Show Parent Portal
  if (userProfile.role === 'parent') {
    return (
      <div className="min-h-screen bg-slate-900/90 text-slate-800 flex flex-col justify-between">
        <Header
          userProfile={userProfile}
          onOpenPasswordModal={() => setPasswordModalOpen(true)}
          onLogout={logoutUser}
          onSelectAdminTab={() => {}}
          onExportPlayersExcel={() => {}}
          onImportPlayersExcel={() => {}}
          onExportParentsExcel={() => {}}
          onImportParentsExcel={() => {}}
          onDownloadBackup={() => {}}
          onWipeDatabase={() => {}}
        />

        <main className="flex-1 max-w-4xl w-full mx-auto py-6">
          <ParentPortal userProfile={userProfile} />
        </main>

        <footer className="text-center py-4 text-xs text-slate-400 print:hidden">
          &copy; 2026 Spes Montesacro - Portale Famiglie. Tutti i diritti riservati.
        </footer>

        <ChangePasswordModal
          isOpen={passwordModalOpen}
          onClose={() => setPasswordModalOpen(false)}
        />
      </div>
    );
  }

  // Logged in as Coach / Admin: Show Full Technical Dashboard
  const isAdmin = userProfile.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Hidden Excel File Inputs */}
      <input
        type="file"
        ref={playersExcelInputRef}
        onChange={handleImportPlayersExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />
      <input
        type="file"
        ref={parentsExcelInputRef}
        onChange={handleImportParentsExcel}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />

      {/* Main Top Header */}
      <Header
        userProfile={userProfile}
        onOpenPasswordModal={() => setPasswordModalOpen(true)}
        onLogout={logoutUser}
        onSelectAdminTab={(tab) => setActiveTab(tab as ActiveTab)}
        onExportPlayersExcel={handleExportPlayersExcel}
        onImportPlayersExcel={() => playersExcelInputRef.current?.click()}
        onExportParentsExcel={handleExportParentsExcel}
        onImportParentsExcel={() => parentsExcelInputRef.current?.click()}
        onDownloadBackup={downloadDatabaseBackup}
        onWipeDatabase={handleWipeDatabase}
      />

      {/* Official Print Header */}
      <PrintHeader
        teamId={activeTeamId}
        documentTitle={
          activeTab === 'tab-roster'
            ? 'Rosa Ufficiale Giocatori'
            : activeTab === 'tab-monthly'
            ? 'Registro Mensile Presenze'
            : activeTab === 'tab-callup'
            ? 'Modulo Convocazione Gara Ufficiale'
            : activeTab === 'tab-staff-attendance'
            ? 'Report Presenze & Sostituzioni Staff'
            : 'Documento Tecnico Ufficiale'
        }
      />

      {/* Main Container */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-6 flex-1 space-y-6 print:p-0">
        {/* Team Selector & Add Player action */}
        <TeamSelector
          userProfile={userProfile}
          activeTeamId={activeTeamId}
          onSelectTeam={(teamId) => setActiveTeamId(teamId)}
          onOpenAddPlayer={handleOpenAddPlayer}
        />

        {/* Navigation Tabs */}
        <NavigationTabs
          activeTab={activeTab}
          userRole={userProfile.role}
          onTabChange={(tab) => setActiveTab(tab)}
        />

        {/* Active Tab View */}
        <div id="main-content-area">
          {activeTab === 'tab-roster' && (
            <RosterTab
              players={players}
              activeTeamId={activeTeamId}
              isAdmin={isAdmin}
              onEditPlayer={handleEditPlayer}
              onRefresh={loadRoster}
            />
          )}

          {activeTab === 'tab-attendance' && (
            <AttendanceTab
              players={players}
              activeTeamId={activeTeamId}
              onAttendanceSaved={loadRoster}
            />
          )}

          {activeTab === 'tab-monthly' && (
            <MonthlyTab players={players} activeTeamId={activeTeamId} />
          )}

          {activeTab === 'tab-callup' && (
            <CallupsTab players={players} activeTeamId={activeTeamId} />
          )}

          {activeTab === 'tab-tournaments' && (
            <TournamentsTab activeTeamId={activeTeamId} />
          )}

          {activeTab === 'tab-staff' && isAdmin && (
            <StaffTab currentUserId={userProfile.uid} />
          )}

          {activeTab === 'tab-parents' && isAdmin && <ParentsTab />}

          {activeTab === 'tab-staff-attendance' && isAdmin && <StaffAttendanceTab />}
        </div>
      </main>

      {/* Global Modals */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      <PlayerModal
        isOpen={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
        playerToEdit={playerToEdit}
        activeTeamId={activeTeamId}
        onSaved={loadRoster}
      />

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-slate-500 print:hidden border-t border-slate-200 mt-8">
        &copy; 2026 Spes Montesacro - Tutti i diritti riservati. Sviluppato per la gestione tecnica scuola calcio.
      </footer>
    </div>
  );
}
