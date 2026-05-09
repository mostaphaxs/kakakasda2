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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#f97316] shadow-xl shadow-[#f97316]/20 mb-4">
            <Cpu size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-[#0f172a] tracking-tighter uppercase italic">TechStock <span className="text-[#f97316]">ERP</span></h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Professional ERP Solution</p>
        </div>

        {/* Card */}
        <div className="card p-8 border-slate-200">
          <h2 className="text-xs font-black text-slate-400 mb-6 flex items-center gap-2 uppercase tracking-[0.2em]">
            <ShieldCheck size={16} className="text-[#f97316]" /> Authentification
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
        <p className="text-center text-[9px] font-bold text-slate-300 mt-8 uppercase tracking-[0.4em]">Integrated Logistics v1.0</p>
      </div>
    </div>
  );
}
