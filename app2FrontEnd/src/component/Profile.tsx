import React, { useState, useEffect } from 'react';
import { User, Mail, Lock, KeyRound, Loader2, Save, ShieldCheck, Database, Upload, Download } from 'lucide-react';
import { apiFetch } from '../lib/api';
import toast from 'react-hot-toast';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';

const Profile: React.FC = () => {
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);
    const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [dbPath, setDbPath] = useState<string>('');

    // Profile form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');

    // Password form state
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleImportDatabase = async () => {
        try {
            const selected = await open({
                multiple: false,
                filters: [{
                    name: 'SQLite Database',
                    extensions: ['sqlite', 'db']
                }]
            });

            if (selected) {
                setIsImporting(true);
                const message = await invoke<string>('import_database', { sourcePath: selected });
                toast.success(message, { duration: 6000 });
            }
        } catch (err: any) {
            toast.error(err.toString() || "Erreur lors de l'importation.");
        } finally {
            setIsImporting(false);
        }
    };

    const handleExportDatabase = async () => {
        try {
            const selected = await save({
                defaultPath: 'backup_database.sqlite',
                filters: [{
                    name: 'SQLite Database',
                    extensions: ['sqlite', 'db']
                }]
            });

            if (selected) {
                setIsExporting(true);
                const message = await invoke<string>('export_database', { destinationPath: selected });
                toast.success(message);
            }
        } catch (err: any) {
            toast.error(err.toString() || "Erreur lors de l'exportation.");
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
            setName(parsed.name || '');
            setEmail(parsed.email || '');
        }

        // Fetch DB path
        const fetchDbPath = async () => {
            // Safety check for browser environment
            if (!(window as any).__TAURI_INTERNALS__) {
                setDbPath('Indisponible en mode navigateur');
                return;
            }
            try {
                const path = await invoke<string>('get_database_path');
                setDbPath(path);
            } catch (err) {
                console.error("Failed to fetch DB path", err);
                setDbPath('Erreur lors de la récupération');
            }
        };
        fetchDbPath();
    }, []);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingProfile(true);
        try {
            const res: any = await apiFetch('/user/update-profile', {
                method: 'POST',
                body: JSON.stringify({ name, email })
            });

            if (res.status === 'success') {
                toast.success('Profil mis à jour !');
                const updatedUser = { ...user, name, email };
                localStorage.setItem('user', JSON.stringify(updatedUser));
                setUser(updatedUser as any);
                // Trigger navbar refresh if needed
                window.dispatchEvent(new Event('storage'));
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors de la mise à jour du profil.');
        } finally {
            setIsSubmittingProfile(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas.');
            return;
        }

        setIsSubmittingPassword(true);
        try {
            const res: any = await apiFetch('/user/update-password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: currentPassword,
                    password: newPassword,
                    password_confirmation: confirmPassword
                })
            });

            if (res.status === 'success') {
                toast.success('Mot de passe mis à jour !');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err: any) {
            toast.error(err.message || 'Erreur lors du changement de mot de passe.');
        } finally {
            setIsSubmittingPassword(false);
        }
    };

    return (
        <div className="space-y-8 duration-500">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                    <User className="text-blue-600" size={32} />
                    Mon Profil
                </h2>
                <p className="text-slate-500 mt-1 font-medium">Gérez vos informations personnelles et la sécurité de votre compte.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Profile Settings */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
                        <div className="hidden">
                            <Mail size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-800 text-sm">Informations Générales</h3>
                    </div>

                    <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-slate-600">Nom Complet</label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="Votre nom"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-slate-600">Adresse E-mail</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="email@exemple.com"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingProfile}
                            className="w-full flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-lg transition font-medium text-sm shadow-sm disabled:opacity-50 bg-slate-900 hover:bg-slate-800"
                        >
                            {isSubmittingProfile ? <Loader2 size={18} className="animate-spin" /> : <><Save size={18} /> Enregistrer les modifications</>}
                        </button>
                    </form>
                </div>

                {/* Password Settings */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                    <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
                        <div className="hidden">
                            <ShieldCheck size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-800 text-sm">Sécurité du Compte</h3>
                    </div>

                    <form onSubmit={handleUpdatePassword} className="p-8 space-y-5">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-slate-600">Mot de passe actuel</label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="block text-xs font-medium mb-1.5 text-slate-600">Nouveau mot de passe</label>
                                <div className="relative group">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium mb-1.5 text-slate-600">Confirmer le mot de passe</label>
                                <div className="relative group">
                                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmittingPassword}
                            className="w-full flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-lg transition font-medium text-sm shadow-sm disabled:opacity-50 bg-slate-900 hover:bg-slate-800"
                        >
                            {isSubmittingPassword ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Mettre à jour la sécurité</>}
                        </button>
                    </form>
                </div>
            </div>
            {/* Database Management */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="hidden">
                            <Database size={20} />
                        </div>
                        <h3 className="font-semibold text-slate-800 text-sm">Gestion de la base de données</h3>
                    </div>
                </div>

                <div className="p-8">
                    <div className="bg-purple-50/50 rounded-xl p-6 border border-purple-100 mb-6">
                        <h4 className="text-purple-800 font-semibold text-xs mb-2">Importation de données</h4>
                        <p className="text-purple-600 text-sm font-medium leading-relaxed mb-4">
                            Vous pouvez importer une base de données existante (fichier .sqlite).
                            <span className="block mt-2 font-semibold text-purple-700">⚠️ Attention : Cette opération remplacera toutes vos données actuelles.</span>
                        </p>

                        <div className="pt-4 border-t border-purple-100">
                            <h4 className="text-purple-800 font-semibold text-xs mb-2 opacity-70">Emplacement de la base de données actuelle :</h4>
                            <div className="bg-white p-3 rounded-xl border border-purple-200 break-all">
                                <code className="text-xs font-mono font-medium text-purple-900 leading-tight">
                                    {dbPath || 'Chargement du chemin...'}
                                </code>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button
                            onClick={handleImportDatabase}
                            disabled={isImporting || isExporting}
                            className="flex items-center justify-center gap-2 text-white px-4 py-2 rounded-lg transition font-medium text-sm shadow-sm disabled:opacity-50 bg-slate-900 hover:bg-slate-800"
                        >
                            {isImporting ? <Loader2 size={18} className="animate-spin" /> : <><Upload size={18} /> Importer (.sqlite)</>}
                        </button>

                        <button
                            onClick={handleExportDatabase}
                            disabled={isImporting || isExporting}
                            className="flex items-center justify-center gap-3 bg-white text-purple-600 border-2 border-purple-100 px-4 py-2 rounded-lg hover:bg-purple-50 transition font-medium text-sm shadow-sm disabled:opacity-50"
                        >
                            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} /> Sauvegarder (.sqlite)</>}
                        </button>
                    </div>

                    <p className="text-center text-slate-400 text-xs font-medium mt-6">
                        L'importation remplacera vos données actuelles. La sauvegarde créera une copie de sécurité.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Profile;
