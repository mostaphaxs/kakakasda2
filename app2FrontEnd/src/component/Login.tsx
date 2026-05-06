import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Cpu, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { apiFetch } from '../lib/api';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      localStorage.setItem('token', data.token);
      toast.success('Connexion réussie');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="animate-fade-in w-full max-w-md mx-auto p-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-2xl shadow-indigo-500/40 mb-4">
            <Cpu size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">TechStock <span className="text-indigo-400">ERP</span></h1>
          <p className="text-slate-500 text-sm mt-1">Gestion intelligente d'électronique</p>
        </div>

        {/* Card */}
        <div className="card card-glow p-8">
          <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <ShieldCheck size={18} className="text-indigo-400" />Connexion
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-dark"
                placeholder="admin@techstock.ma"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input-dark pr-10"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full justify-center py-3 mt-2" disabled={loading}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : 'Se connecter'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-slate-600 mt-6">TechStock ERP v1.0 — Powered by Gemini AI</p>
      </div>
    </div>
  );
}
