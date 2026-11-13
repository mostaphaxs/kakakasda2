import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff, Check } from 'lucide-react';
import { getAppSettings } from '../lib/appSettings';

type LoginFormInputs = {
  email: string;
  password: string;
};

const LAST_EMAIL_KEY = 'login:lastEmail';
const readLastEmail = () => { try { return localStorage.getItem(LAST_EMAIL_KEY) || ''; } catch { return ''; } };

const HIGHLIGHTS = [
  'Échéancier, relances WhatsApp et chèques suivis automatiquement',
  'Ventes, disponibilités et documents de vente en un clic',
  'Rentabilité par projet et rapport mensuel prêt à lire',
];

export default function Login() {
  const lastEmail = readLastEmail();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({ defaultValues: { email: lastEmail } });
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setLoading(true);
    setServerError('');
    try {
      const result = await apiFetch<{ token: string; user?: { name: string; email: string } }>('/login', {
        method: 'POST',
        public: true, // No Bearer token for login
        body: JSON.stringify(data),
      });
      localStorage.setItem('token', result.token);
      if (result.user) localStorage.setItem('user', JSON.stringify(result.user));
      try { localStorage.setItem(LAST_EMAIL_KEY, data.email); } catch { /* ignore */ }
      navigate('/home');
    } catch (err: any) {
      setServerError(err.message || 'Connexion au serveur impossible');
    } finally {
      setLoading(false);
    }
  };

  const inputBase = 'w-full pl-10 pr-3 py-2.5 bg-white border rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20';

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-white">
      {/* ── Brand side ─────────────────────────────────────────── */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 text-white p-12">
        <img src="/assets/hero.png" alt="" decoding="async" className="absolute inset-0 w-full h-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />

        <div className="relative flex items-center gap-3">
          <img src="/assets/logoLogin.png" alt="" className="h-10 w-auto rounded-md bg-white/90 p-1" />
          <div className="leading-tight">
            <p className="text-sm font-semibold">El Ouaha</p>
            <p className="text-xs text-white/60">Promotion immobilière & travaux</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-3xl xl:text-4xl font-semibold tracking-tight leading-tight">
            Tous vos projets, vos ventes et vos encaissements, <span className="text-brand-400">au même endroit.</span>
          </h1>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(h => (
              <li key={h} className="flex items-start gap-3 text-sm text-white/80">
                <Check size={16} className="mt-0.5 flex-shrink-0 text-brand-400" />
                {h}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} Amical El Ouaha</p>
      </aside>

      {/* ── Form side ──────────────────────────────────────────── */}
      <main className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <img src="/assets/logoLogin.png" alt="" className="h-10 w-auto" />
            <p className="text-sm font-semibold text-slate-900">El Ouaha</p>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{lastEmail ? `Bon retour${getAppSettings().preferences.owner_name ? `, ${getAppSettings().preferences.owner_name}` : ''}` : 'Connexion'}</h2>
          <p className="mt-1.5 text-sm text-slate-500">Connectez-vous pour accéder à votre espace de gestion.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            {serverError && (
              <div className="p-3 bg-red-50 ring-1 ring-inset ring-red-600/15 rounded-lg flex items-start gap-2.5">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                <p className="text-sm text-red-700">{serverError}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Adresse e-mail</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="username"
                  autoFocus={!lastEmail}
                  {...register('email', {
                    required: "L'e-mail est requis",
                    pattern: { value: /^\S+@\S+$/i, message: "Format d'e-mail invalide" },
                  })}
                  className={`${inputBase} ${errors.email ? 'border-red-300' : 'border-slate-200'}`}
                  placeholder="nom@exemple.com"
                />
              </div>
              {errors.email && <p className="mt-1.5 text-xs text-red-600">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  autoFocus={!!lastEmail}
                  {...register('password', { required: 'Le mot de passe est requis' })}
                  className={`${inputBase} pr-10 ${errors.password ? 'border-red-300' : 'border-slate-200'}`}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(s => !s)} tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700"
                  title={showPassword ? 'Masquer' : 'Afficher'}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="mt-1.5 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-60 transition-colors group"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>Se connecter <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => navigate('/portal/login')} className="group w-full flex items-center justify-between text-left">
              <span>
                <span className="block text-sm font-medium text-slate-900">Vous êtes acquéreur ?</span>
                <span className="block text-xs text-slate-500">Consultez votre dossier et vos paiements</span>
              </span>
              <ArrowRight size={16} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
