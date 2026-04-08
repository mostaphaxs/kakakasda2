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

      <div className="max-w-[460px] w-full z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[40px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100 p-10 md:p-14">

          {/* Brand Logo & Name */}
          <div className="flex flex-col items-center mb-12 group">
            <div className="mb-8 p-6 bg-slate-50 rounded-[40px] border border-slate-100 transition-all duration-500 group-hover:scale-105">
              <img
                src="/assets/logoLogin.png"
                alt="Société les cinq elements"
                className="h-32 w-auto"
              />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight text-center uppercase">
              Les cinq <span className="text-amber-600">elements</span>
            </h2>
          
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {serverError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="text-rose-500 shrink-0" size={18} />
                <p className="text-xs font-bold text-rose-600">{serverError}</p>
              </div>
            )}

            <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform duration-300">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Adresse Email</label>
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
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50/50 border ${errors.email ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-100 focus:ring-blue-100'} rounded-2xl focus:ring-4 focus:bg-white focus:border-blue-300 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium`}
                  placeholder="nom@exemple.com"
                />
              </div>
              {errors.email && <p className="ml-1 text-[10px] font-bold text-rose-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5 focus-within:translate-y-[-2px] transition-transform duration-300">
              <label className="block text-[11px] font-black text-slate-400 uppercase tracking-wider ml-1">Mot de passe</label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  {...register("password", { required: "Le mot de passe est requis" })}
                  className={`w-full pl-12 pr-4 py-4 bg-slate-50/50 border ${errors.password ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-100 focus:ring-blue-100'} rounded-2xl focus:ring-4 focus:bg-white focus:border-blue-300 outline-none transition-all font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && <p className="ml-1 text-[10px] font-bold text-rose-500">{errors.password.message}</p>}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:shadow-[0_15px_30px_rgba(0,0,0,0.15)] disabled:bg-slate-300 group active:scale-[0.98]"
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    Connexion
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">© 2026 Société les cinq elements. Tous droits réservés.</p>
          </div>
        </div>
      </div>
    </div>
  );
}