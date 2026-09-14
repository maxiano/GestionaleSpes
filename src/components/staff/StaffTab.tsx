import React, { useState, useEffect } from 'react';
import { UserProfile } from '../../types';
import {
  fetchStaffUsers,
  createStaffAccount,
  deleteStaffUser
} from '../../services/authService';
import { TEAM_GROUPS } from '../../config/constants';
import {
  ShieldCheck,
  UserPlus,
  Mail,
  Lock,
  Trash2,
  Loader2,
  Users
} from 'lucide-react';

interface StaffTabProps {
  currentUserId?: string;
}

export const StaffTab: React.FC<StaffTabProps> = ({ currentUserId }) => {
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'coach' | 'admin'>('coach');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    try {
      const list = await fetchStaffUsers();
      setStaffList(list);
    } catch (err) {
      console.error('Errore caricamento staff:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (role === 'coach' && selectedTeams.length === 0) {
      setError('Seleziona almeno una squadra di competenza per il Coach!');
      return;
    }

    setSubmitting(true);
    try {
      await createStaffAccount({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        teams: selectedTeams
      });

      alert(`Account ${role.toUpperCase()} creato con successo per ${name}!`);
      setName('');
      setEmail('');
      setPassword('');
      setSelectedTeams([]);
      loadStaff();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Errore creazione account staff');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: string, staffName: string) => {
    if (!confirm(`Sei sicuro di voler eliminare ${staffName}? L'utente non potrà più accedere.`)) {
      return;
    }
    try {
      await deleteStaffUser(userId);
      alert('Profilo staff eliminato con successo!');
      loadStaff();
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  return (
    <div id="tab-staff" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8 print:hidden">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-rose-500" />
          <span>Gestione Staff Tecnico & Allenatori</span>
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Crea o rimuovi le credenziali di accesso per gli allenatori e la direzione tecnica Spes Montesacro.
        </p>
      </div>

      {/* Create new staff form */}
      <form onSubmit={handleSubmit} className="bg-slate-50 p-6 border border-slate-200 rounded-3xl space-y-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          <span>Registra Nuovo Allenatore / Staff</span>
        </h4>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-semibold">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome e Cognome *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Mister Mario Rossi"
              className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email di Accesso *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mister.rossi@spesmontesacro.it"
              className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password Iniziale *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="minimo 6 caratteri"
              className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Ruolo / Permessi *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'coach' | 'admin')}
              className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              <option value="coach">Coach / Allenatore</option>
              <option value="admin">Responsabile Tecnico (Admin)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Squadre Assegnate
            </label>
            <select
              multiple
              size={5}
              value={selectedTeams}
              onChange={(e) =>
                setSelectedTeams(
                  Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value)
                )
              }
              className="w-full bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
            >
              {TEAM_GROUPS.map((g) => (
                <optgroup key={g.category} label={g.category}>
                  {g.teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <p className="text-[10px] text-slate-400 mt-1">
              💡 Tieni premuto <b>CTRL</b> (o <b>CMD</b> su Mac) per selezionare più squadre.
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-slate-900 hover:bg-emerald-600 text-white font-bold text-xs px-6 py-3 rounded-xl tracking-wider uppercase transition shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Crea Account Coach</span>
          </button>
        </div>
      </form>

      {/* Staff list */}
      <div>
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>Staff Tecnico Registrato ({staffList.length})</span>
        </h4>

        {staffList.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">Nessun utente staff trovato.</p>
        ) : (
          <div id="staff-list-container" className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {staffList.map((user) => {
              const isSelf = currentUserId === user.uid;
              const teamsDisplay =
                user.teams && user.teams.length > 0 ? user.teams.join(', ') : 'Tutte';

              return (
                <div
                  key={user.uid}
                  className="border border-slate-200 p-4 rounded-2xl bg-white flex justify-between items-start text-xs shadow-sm"
                >
                  <div className="space-y-1">
                    <p className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                      <span>{user.name}</span>
                      {isSelf && <span className="text-[10px] text-emerald-600 font-bold">(Tu)</span>}
                    </p>
                    <p className="text-slate-600">
                      📧 <strong>Email:</strong> {user.email}
                    </p>
                    <p className="text-slate-600">
                      🛡️ <strong>Ruolo:</strong>{' '}
                      <span
                        className={`uppercase font-bold ${
                          user.role === 'admin' ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        {user.role}
                      </span>{' '}
                      | 🏆 <strong>Squadre:</strong> {teamsDisplay}
                    </p>
                  </div>

                  {!isSelf && (
                    <button
                      onClick={() => handleDelete(user.uid, user.name)}
                      className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl border border-rose-200 transition flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Elimina</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
