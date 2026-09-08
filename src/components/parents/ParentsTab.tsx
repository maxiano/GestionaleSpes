import React, { useState, useEffect } from 'react';
import { UserProfile, Player } from '../../types';
import {
  fetchParentsUsers,
  createParentAccount,
  deleteParentUser,
  syncAllParentsWithRoster
} from '../../services/authService';
import { getAllPlayers } from '../../services/playersService';
import { arePhonesMatching } from '../../utils/formatters';
import { UserCheck, UserPlus, Phone, Mail, Trash2, Loader2, Baby, RefreshCw } from 'lucide-react';

export const ParentsTab: React.FC = () => {
  const [parents, setParents] = useState<UserProfile[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [parentsList, playersList] = await Promise.all([
        fetchParentsUsers(),
        getAllPlayers()
      ]);
      setParents(parentsList);
      setAllPlayers(playersList);
    } catch (err) {
      console.error('Errore caricamento genitori e giocatori:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncAllParentsWithRoster();
      alert(`Sincronizzazione completata!\n${result.parentsCount} account genitori analizzati.\n${result.totalLinks} nuovi collegamenti effettuati.`);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Errore sincronizzazione: ' + (err?.message || 'Errore sconosciuto'));
    } finally {
      setSyncing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createParentAccount({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password
      });

      alert('Profilo genitore creato e collegato ai figli con successo!');
      setName('');
      setEmail('');
      setPhone('');
      setPassword('');
      loadData();
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Errore creazione genitore');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (parentId: string, parentName: string) => {
    if (!confirm(`Eliminare il profilo di ${parentName}? Perderà l'accesso al Portale Famiglia.`)) {
      return;
    }
    try {
      await deleteParentUser(parentId);
      alert('Genitore rimosso con successo!');
      loadData();
    } catch (err: any) {
      alert('Errore eliminazione: ' + err.message);
    }
  };

  // Ottieni i figli collegati per ciascun genitore (tramite childIds o corrispondenza telefonica padre/madre)
  const getLinkedPlayersForParent = (p: UserProfile): Player[] => {
    const directIds = Array.isArray(p.childIds) ? p.childIds : [];
    const parentPhone = p.phone ? p.phone.trim() : '';

    return allPlayers.filter((player) => {
      if (directIds.includes(player.id)) return true;
      if (player.parentId === p.uid || (Array.isArray(player.parentIds) && player.parentIds.includes(p.uid))) return true;
      if (parentPhone) {
        if (arePhonesMatching(player.parentPhone, parentPhone)) return true;
        if (arePhonesMatching(player.parentPhone2, parentPhone)) return true;
        if (Array.isArray(player.parentPhones) && player.parentPhones.some((ph) => arePhonesMatching(ph, parentPhone))) return true;
      }
      return false;
    });
  };

  return (
    <div id="tab-parents" className="tab-content bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8 print:hidden">
      <div className="border-b border-slate-100 pb-4">
        <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          <span>Gestione Anagrafica Genitori</span>
        </h3>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Gestisci gli accessi al Portale Famiglia per le convocazioni e le presenze dei ragazzi.
        </p>
      </div>

      {/* Form creazione genitore */}
      <form onSubmit={handleSubmit} className="bg-slate-50 p-6 border border-slate-200 rounded-3xl space-y-4">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-emerald-600" />
          <span>Crea Nuovo Profilo Genitore</span>
        </h4>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-semibold">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nome Genitore *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. Mario Rossi"
              className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@esempio.it"
              className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Telefono (Padre o Madre) *
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="es. 3331234567"
              className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">
              💡 Riconoscimento automatico: collegando questo numero (padre o madre), l'account vedrà tutti i figli associati.
            </span>
          </div>

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
              placeholder="Minimo 6 caratteri"
              className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-3 rounded-xl tracking-wider uppercase transition shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Crea Profilo Genitore</span>
          </button>
        </div>
      </form>

      {/* Parents list */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-slate-600" />
            <span>Genitori Registrati ({parents.length})</span>
          </h4>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || loading}
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition flex items-center gap-1.5 w-fit disabled:opacity-50"
            title="Associa automaticamente tutti i figli ai genitori controllando i numeri di telefono di padre e madre"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizzazione in corso...' : 'Sincronizza Figli per Telefono'}</span>
          </button>
        </div>

        {parents.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4">Nessun genitore registrato.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parents.map((p) => {
              const linked = getLinkedPlayersForParent(p);
              const childrenCount = linked.length;
              return (
                <div
                  key={p.uid}
                  className="border border-slate-200 p-4 rounded-2xl bg-white flex justify-between items-start text-xs shadow-sm hover:shadow transition"
                >
                  <div className="space-y-1.5 flex-1 pr-3">
                    <p className="font-extrabold text-sm text-slate-900">{p.name || 'Genitore'}</p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{p.email || 'N/D'}</span>
                    </p>
                    <p className="text-slate-600 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-800">{p.phone || 'N/D'}</span>
                    </p>
                    <div className="pt-1">
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <Baby className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="font-bold text-emerald-800">
                          {childrenCount} {childrenCount === 1 ? 'figlio associato' : 'figli associati'}:
                        </span>
                      </div>
                      {childrenCount > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {linked.map((k) => (
                            <span
                              key={k.id}
                              className="bg-emerald-50 text-emerald-900 border border-emerald-200 px-2 py-0.5 rounded-lg text-[11px] font-bold"
                            >
                              {k.lastName ? `${k.lastName} ${k.firstName || ''}`.trim() : k.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic block mt-0.5">
                          Nessun ragazzo ha questo telefono come Padre o Madre nel roster.
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(p.uid, p.name)}
                    className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl border border-rose-200 transition flex items-center gap-1 shrink-0"
                  >
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Elimina</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
