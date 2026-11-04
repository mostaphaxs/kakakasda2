import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { apiFetch } from '../../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { User, Save, ArrowLeft, Phone, MapPin, FileText, Briefcase, FileSearch, Upload, Boxes, Plus, Trash2, Check, Banknote } from 'lucide-react';
import { useFieldArray } from 'react-hook-form';

interface GuaranteeCheckInput {
    check_number: string;
    amount: string;
    bank_name?: string;
    notes?: string;
}

interface SupplierFormInputs {
    nom_societe: string;
    type_entreprise: string;
    nom_gerant: string;
    adresse: string;
    tel: string;
    ice: string;
    if: string;
    rc: string;
    description: string;
    rib: string;
    guarantee_checks: GuaranteeCheckInput[];
}

const AddSupplier: React.FC = () => {
    const navigate = useNavigate();
    const [contractFile, setContractFile] = useState<File | null>(null);
    const [checkFiles, setCheckFiles] = useState<{ [key: number]: File | null }>({});

    const { register, handleSubmit, control, formState: { isSubmitting } } = useForm<SupplierFormInputs>({
        defaultValues: {
            nom_societe: '',
            type_entreprise: '',
            nom_gerant: '',
            adresse: '',
            tel: '',
            ice: '',
            if: '',
            rc: '',
            description: '',
            rib: '',
            guarantee_checks: []
        }
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "guarantee_checks"
    });

    const onSubmit = async (data: any) => {
        try {
            const formData = new FormData();

            // Append all fields explicitly
            formData.append('nom_societe', data.nom_societe || '');
            formData.append('type_entreprise', data.type_entreprise || '');
            formData.append('nom_gerant', data.nom_gerant || '');
            formData.append('adresse', data.adresse || '');
            formData.append('tel', data.tel || '');
            formData.append('ice', data.ice || '');
            formData.append('if', data.if || '');
            formData.append('rc', data.rc || '');
            formData.append('description', data.description || '');
            formData.append('rib', data.rib || '');

            if (contractFile) {
                formData.append('scan_contrat', contractFile);
            }

            // Append Guarantee Checks
            if (data.guarantee_checks && data.guarantee_checks.length > 0) {
                data.guarantee_checks.forEach((check: any, index: number) => {
                    formData.append(`guarantee_checks[${index}][check_number]`, check.check_number);
                    formData.append(`guarantee_checks[${index}][amount]`, check.amount);
                    formData.append(`guarantee_checks[${index}][bank_name]`, check.bank_name || '');
                    formData.append(`guarantee_checks[${index}][notes]`, check.notes || '');

                    if (checkFiles[index]) {
                        formData.append(`guarantee_checks[${index}][scan_path]`, checkFiles[index]!);
                    }
                });
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
            <button onClick={() => navigate(-1)} className="flex items-center text-slate-400 hover:text-slate-800 mb-6 transition-colors font-semibold text-xs">
                <ArrowLeft size={18} className="mr-2" />
                Retour
            </button>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-center space-x-4 mb-10 pb-6 border-b border-slate-50">
                    <div className="p-3 bg-slate-900 rounded-xl">
                        <User className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Nouveau Partenaire</h2>
                        <p className="text-slate-400 text-sm font-medium">Enregistrement d'un nouveau fournisseur ou prestataire.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <Briefcase size={14} className="mr-2" /> Nom / Raison Sociale
                            </label>
                            <input
                                {...register('nom_societe', { required: true })}
                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="Nom de l'entreprise"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <Boxes size={14} className="mr-2" /> Type d'entreprise
                            </label>
                            <input
                                {...register('type_entreprise')}
                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="ex: Fer, Sable, Transport..."
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <User size={14} className="mr-2" /> Responsable
                            </label>
                            <input
                                {...register('nom_gerant')}
                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <Phone size={14} className="mr-2" /> Téléphone
                            </label>
                            <input
                                {...register('tel')}
                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
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
                                    className="w-full flex items-center justify-between px-4 h-14 bg-blue-50/50 border-2 border-dashed border-blue-100 rounded-xl hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <Upload size={20} className="text-blue-500" />
                                        <span className="text-xs font-semibold text-blue-700">
                                            {contractFile ? contractFile.name : 'Choisir le fichier du contrat'}
                                        </span>
                                    </div>
                                    <div className="bg-blue-600 text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-sm">Parcourir</div>
                                </label>
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <MapPin size={14} className="mr-2" /> Adresse
                            </label>
                            <textarea
                                {...register('adresse')}
                                dir="auto"
                                className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4 md:col-span-2">
                            <div>
                                <label className="block text-xs font-medium mb-2 text-slate-600">ICE</label>
                                <input {...register('ice')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-2 text-slate-600">I.F</label>
                                <input {...register('if')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-2 text-slate-600">R.C</label>
                                <input {...register('rc')} className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <Banknote size={14} className="mr-2" /> RIB (Compte Bancaire)
                            </label>
                            <input
                                {...register('rib')}
                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                placeholder="000 000 0000000000000000 00"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-xs font-medium mb-2 flex items-center text-slate-600">
                                <FileText size={14} className="mr-2" /> Observations
                            </label>
                            <textarea
                                {...register('description')}
                                className="w-full resize-none pl-3 pr-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                            />
                        </div>
                    </div>

                    {/* GUARANTEE CHECKS SECTION */}
                    <div className="pt-10 border-t border-slate-50">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                    <Check size={18} className="text-blue-600" /> Chèques de Garantie (Optionnel)
                                </h3>
                                <p className="text-xs font-medium text-slate-400 mt-1">Enregistrez les cautions ou chèques de garantie initiaux</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => append({ check_number: '', amount: '', bank_name: '', notes: '' })}
                                className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-lg border border-blue-100 hover:bg-blue-100 transition font-medium text-sm"
                            >
                                <Plus size={14} /> Ajouter un chèque
                            </button>
                        </div>

                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <div key={field.id} className="p-6 bg-slate-50/50 rounded-xl border border-slate-100 relative group duration-200">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            remove(index);
                                            const newFiles = { ...checkFiles };
                                            delete newFiles[index];
                                            setCheckFiles(newFiles);
                                        }}
                                        className="absolute top-4 right-4 inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 transition-colors hover:text-red-600 hover:bg-red-50"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">N° du Chèque</label>
                                            <input
                                                {...register(`guarantee_checks.${index}.check_number` as const, { required: true })}
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                placeholder="Ex: CH-123456"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">Montant (DH)</label>
                                            <div className="relative">
                                                <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input
                                                    type="number"
                                                    {...register(`guarantee_checks.${index}.amount` as const, { required: true })}
                                                    className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">Banque</label>
                                            <input
                                                {...register(`guarantee_checks.${index}.bank_name` as const)}
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                placeholder="Nom de la banque"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-medium mb-2 text-slate-600">Notes / Observations</label>
                                            <input
                                                {...register(`guarantee_checks.${index}.notes` as const)}
                                                className="w-full pl-3 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500"
                                                placeholder="Commentaires sur ce chèque..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-2 text-slate-600">Scan du Chèque</label>
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    onChange={(e) => setCheckFiles(prev => ({ ...prev, [index]: e.target.files?.[0] || null }))}
                                                    className="hidden"
                                                    id={`check-upload-${index}`}
                                                />
                                                <label
                                                    htmlFor={`check-upload-${index}`}
                                                    className="w-full h-11 bg-white border border-dashed border-slate-300 rounded-xl flex items-center justify-between px-3 hover:border-blue-400 hover:bg-blue-50 cursor-pointer transition"
                                                >
                                                    <span className="text-xs font-medium text-slate-500 truncate max-w-[120px]">
                                                        {checkFiles[index] ? checkFiles[index]?.name : 'Choisir...'}
                                                    </span>
                                                    <Upload size={14} className="text-blue-500" />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {fields.length === 0 && (
                                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-xl h-32 flex items-center justify-center">
                                    <p className="text-xs font-semibold text-slate-300">Aucun chèque ajouté pour le moment</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-11 text-white rounded-lg font-medium transition shadow-sm active:scale-[0.98] flex items-center justify-center space-x-3 text-sm bg-slate-900 hover:bg-slate-800"
                    >
                        {isSubmitting ? '...' : <><Save size={20} /><span>Enregistrer le fournisseur</span></>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddSupplier;
