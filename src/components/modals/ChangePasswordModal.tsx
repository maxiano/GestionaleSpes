import React, { useState } from 'react';
import { changeUserPassword } from '../../services/authService';
import { KeyRound, X, Loader2 } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose
}) => {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setLoading(true);

    try {
      await changeUserPassword(currentPass, newPass);
      setMessage({ text: 'Password aggiornata con successo!', type: 'success' });
      setTimeout(() => {
        setCurrentPass('');
        setNewPass('');
        setMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err?.message || 'Errore durante il cambio password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="modal-change-password"
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 print:hidden"
    >
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl max-w-md w-full border border-slate-100">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-800">
              <KeyRound className="w-4 h-4" />
            </div>
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Modifica Password
            </h3>
          </div>
          <button
            id="btn-close-modal-password"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-slate-500 mb-5">
          Inserisci la tua password attuale e scegline una nuova di almeno 6 caratteri.
        </p>

        {message && (
          <div
            className={`p-3 rounded-xl text-xs font-semibold mb-4 ${
              message.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form id="form-change-password" onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Password Attuale *
            </label>
            <input
              type="password"
              id="current-password"
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Inserisci password attuale"
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nuova Password *
            </label>
            <input
              type="password"
              id="new-password"
              minLength={6}
              required
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Minimo 6 caratteri"
              className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-4 py-2.5 rounded-xl font-bold transition"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-slate-900 hover:bg-emerald-600 text-white text-xs px-5 py-2.5 rounded-xl font-bold tracking-wider uppercase transition shadow disabled:opacity-50 flex items-center gap-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Aggiorna Password</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
