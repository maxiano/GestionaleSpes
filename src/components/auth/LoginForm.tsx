import React, { useState } from 'react';
import { loginUser } from '../../services/authService';
import { Lock, Mail, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { PWAInstallButton } from '../pwa/PWAInstallButton';
import { ClubLogo } from '../common/ClubLogo';

interface LoginFormProps {
  onSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleForceUpdate = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
        }
      }
    } catch (e) {
      console.error('Errore svuotamento cache:', e);
    }
    window.location.reload();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await loginUser(email, password);
      onSuccess();
    } catch (err: any) {
      console.error('Errore login:', err);
      setError(err?.message || 'Credenziali non valide o errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      id="section-login"
      className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100 max-w-md mx-auto mt-12 print:hidden"
    >
      <div className="flex justify-between items-center mb-2">
        <button
          type="button"
          onClick={handleForceUpdate}
          disabled={isUpdating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold transition cursor-pointer"
          title="Aggiorna alla versione più recente"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
          <span>Aggiorna App</span>
        </button>
        <PWAInstallButton />
      </div>

      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 bg-white rounded-3xl flex items-center justify-center p-3 shadow-xl shadow-slate-900/10 border border-slate-200 overflow-hidden">
          <ClubLogo className="w-full h-full object-contain text-black" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Spes Montesacro</h2>
          <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-700 border border-emerald-500/40 text-[9px] font-bold tracking-tight">
            v2.5
          </span>
        </div>
        <p className="text-xs text-slate-500 font-semibold tracking-wide">
          Fondata nel 1928 • Gestionale Pro
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3.5 rounded-xl font-semibold mb-5">
          ⚠️ {error}
        </div>
      )}

      <form id="form-login" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">
            Email di Accesso
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="email"
              id="login-email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="es. mister.rossi@spesmontesacro.it"
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 ml-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="password"
              id="login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-50 border border-slate-200 pl-10 pr-3.5 py-3 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 bg-slate-900 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-xs tracking-wider uppercase transition duration-200 shadow-lg shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifica in corso...</span>
            </>
          ) : (
            <>
              <span>Entra nel Sistema</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
