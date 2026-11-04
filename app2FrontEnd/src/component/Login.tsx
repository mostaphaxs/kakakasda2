import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api';
import { Mail, Lock, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

// Define the shape of your form data
type LoginFormInputs = {
  email: string;
  password: string;
};

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>();
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setLoading(true);
    setServerError('');

    try {
      const result = await apiFetch<{ token: string; user?: { name: string; email: string } }>('/login', {
        method: 'POST',
        public: true,       // No Bearer token for login
        body: JSON.stringify(data),
      });

      localStorage.setItem('token', result.token);
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
      navigate('/home');

    } catch (err: any) {
      setServerError(err.message || 'Server connection failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Subtle Background Accent */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-amber-50/50 rounded-full blur-[120px]"></div>

      <div className="max-w-[460px] w-full z-10 duration-500">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-14">

          {/* Brand Logo & Name */}
          <div className="flex flex-col items-center mb-12 group">
            <div className="mb-8 p-8 bg-slate-900 rounded-xl border border-slate-800 transition duration-500 hover:shadow-md">
              <img
                src="/assets/LogoNavbar.webp"
                alt="Société les cinq elements"
                className="h-40 w-auto"
              />
            </div>
            <div className="flex flex-col items-center">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center leading-none">
                LES CINQ <span className="text-amber-500">ELEMENTS</span>
              </h2>
              <p className="mt-3 text-xs font-semibold text-amber-600 text-center">Gestion Immobilière & Travaux</p>
            </div>
          </div>


          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <div className="p-4 bg-rose-50 border !border-rose-100 rounded-xl flex items-center gap-3 duration-300">
                <AlertCircle className="text-rose-500 shrink-0" size={18} />
                <p className="text-xs font-medium text-rose-600">{serverError}</p>
              </div>
            )}

            <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform duration-300">
              <label className="block text-xs font-medium text-slate-600">Adresse Email</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  {...register("email", {
                    required: "L'email est requis",
                    pattern: { value: /^\S+@\S+$/i, message: "Format d'email invalide" }
                  })}
                  className={`w-full ${errors.email ? '!border-rose-300 focus:ring-rose-200' : 'border-slate-100 focus:ring-blue-100'} pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                  placeholder="nom@exemple.com"
                />
              </div>
              {errors.email && <p className="ml-1 text-xs font-medium text-rose-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform duration-300">
              <label className="block text-xs font-medium text-slate-600">Mot de passe</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  {...register("password", { required: "Le mot de passe est requis" })}
                  className={`w-full ${errors.password ? '!border-rose-300 focus:ring-rose-200' : 'border-slate-100 focus:ring-blue-100'} pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="ml-1 text-xs font-medium text-rose-500">{errors.password.message}</p>}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition hover:shadow-md disabled:bg-slate-300 group active:scale-[0.98] bg-slate-900 hover:bg-slate-800"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    Connexion Admin
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-100"></div>
              </div>
              <div className="relative flex justify-center text-xs font-medium">
                <span className="bg-white px-4 text-slate-300">Ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/portal/login')}
              className="w-full bg-amber-50 hover:bg-amber-100 text-amber-700 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-3 transition border border-amber-100 group shadow-sm"
            >
              Accéder à l'Espace Acquéreur
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-xs font-medium text-slate-400">© 2026 Société les cinq elements. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </div>
  );
}