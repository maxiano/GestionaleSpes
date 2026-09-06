import React, { useState } from 'react';
import { loginUser } from '../../services/authService';
import { Lock, Mail, ArrowRight, Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSuccess: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-4 bg-slate-900 rounded-3xl flex items-center justify-center p-4 shadow-xl shadow-slate-900/20 text-3xl">
          ⚽
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Accesso Gestionale Pro</h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Spes Montesacro - Gestionale Tecnico & Portale Famiglie
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
