import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User, Save, ArrowLeft, Phone, MapPin, FileText, Briefcase, FileSearch, Upload } from 'lucide-react';

const AddSupplier: React.FC = () => {
    const navigate = useNavigate();
    const [contractFile, setContractFile] = useState<File | null>(null);
    const { register, handleSubmit, formState: { isSubmitting } } = useForm();

    const onSubmit = async (data: any) => {
        try {
            const formData = new FormData();

            // Append all fields explicitly
            formData.append('nom_societe', data.nom_societe || '');
            formData.append('nom_gerant', data.nom_gerant || '');
            formData.append('adresse', data.adresse || '');
            formData.append('tel', data.tel || '');
            formData.append('ice', data.ice || '');
            formData.append('if', data.if || '');
            formData.append('rc', data.rc || '');
            formData.append('description', data.description || '');

            if (contractFile) {
                formData.append('scan_contrat', contractFile);
            }

            await apiFetch('/suppliers', {
                method: 'POST',
                body: formData
            });
            toast.success('Fournisseur enregistré avec succès !');
            navigate('/suppliers');
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la création.');
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 font-sans">
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-400 hover:text-gray-800 mb-6 transition-colors font-black text-xs uppercase tracking-widest">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-gray-50">
                    <div className="p-3 bg-slate-900 rounded-2xl">
                        <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Nouveau Partenaire</h2>
                        <p className="text-gray-400 text-sm font-medium italic">Enregistrement d'un nouveau fournisseur ou prestataire.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <Briefcase size={14} className="mr-2" /> Nom / Raison Sociale
                            </label>
                            <input
                                {...register('nom_societe', { required: true })}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all font-bold text-sm shadow-sm outline-none"
                                placeholder="Nom de l'entreprise"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <User size={14} className="mr-2" /> Responsable
                            </label>
                            <input
                                {...register('nom_gerant')}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all font-bold text-sm shadow-sm outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <Phone size={14} className="mr-2" /> Téléphone
                            </label>
                            <input
                                {...register('tel')}
                                className="w-full h-12 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-slate-800 transition-all font-bold text-sm shadow-sm outline-none"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <FileSearch size={14} className="mr-2" /> Scan du Contrat (PDF/Image)
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="add-contract-upload"
                                />
                                <label
                                    htmlFor="add-contract-upload"
                                    className="w-full flex items-center justify-between px-4 h-14 bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50 cursor-pointer transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <Upload size={20} className="text-indigo-500" />
                                        <span className="text-xs font-black text-indigo-700 uppercase">
                                            {contractFile ? contractFile.name : 'Choisir le fichier du contrat'}
                                        </span>
                                    </div>
                                    <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100">Parcourir</div>
                                </label>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <MapPin size={14} className="mr-2" /> Adresse
                            </label>
                            <textarea
                                {...register('adresse')}
                                className="w-full p-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm shadow-sm outline-none h-20 resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4 md:col-span-2">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ICE</label>
                                <input {...register('ice')} className="w-full h-12 px-3 rounded-xl border-gray-200 bg-gray-50 font-mono text-xs outline-none shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">I.F</label>
                                <input {...register('if')} className="w-full h-12 px-3 rounded-xl border-gray-200 bg-gray-50 font-mono text-xs outline-none shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">R.C</label>
                                <input {...register('rc')} className="w-full h-12 px-3 rounded-xl border-gray-200 bg-gray-50 font-mono text-xs outline-none shadow-sm" />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center">
                                <FileText size={14} className="mr-2" /> Observations
                            </label>
                            <textarea
                                {...register('description')}
                                className="w-full p-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm shadow-sm outline-none h-20 resize-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-16 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center space-x-3 shadow-slate-100"
                    >
                        {isSubmitting ? '...' : <><Save size={20} /><span>Enregistrer le fournisseur</span></>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddSupplier;
