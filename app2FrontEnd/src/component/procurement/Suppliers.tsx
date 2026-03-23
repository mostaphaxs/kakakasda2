import React, { useEffect, useState } from 'react';
import { apiFetch, STORAGE_BASE } from '../../lib/api';
import { Truck, Search, PlusCircle, Trash2, Download, Edit2, X, Save, User, Phone, MapPin, Briefcase, FileText, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { exportToExcel } from '../../lib/excel';
import { useForm } from 'react-hook-form';

interface Supplier {
    id: number;
    nom_societe: string;
    nom_gerant: string | null;
    adresse: string | null;
    tel: string | null;
    ice: string | null;
    if: string | null;
    rc: string | null;
    scan_contrat: string | null;
    description: string | null;
}

const Suppliers: React.FC = () => {
    const navigate = useNavigate();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [contractFile, setContractFile] = useState<File | null>(null);

    const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        try {
            const data = await apiFetch<Supplier[]>('/suppliers');
            setSuppliers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Supprimer ce fournisseur ?')) return;
        try {
            await apiFetch(`/suppliers/${id}`, { method: 'DELETE' });
            toast.success('Fournisseur supprimé');
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setContractFile(null);
        reset({
            nom_societe: supplier.nom_societe,
            nom_gerant: supplier.nom_gerant,
            adresse: supplier.adresse,
            tel: supplier.tel,
            ice: supplier.ice,
            if: supplier.if,
            rc: supplier.rc,
            description: supplier.description,
        });
        setIsEditModalOpen(true);
    };

    const onSubmitUpdate = async (data: any) => {
        if (!editingSupplier) return;
        try {
            const formData = new FormData();

            // Explicitly append fields to avoid any null/undefined issues
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

            formData.append('_method', 'PUT');

            await apiFetch(`/suppliers/${editingSupplier.id}`, {
                method: 'POST',
                body: formData
            });

            toast.success('Fournisseur mis à jour !');
            setIsEditModalOpen(false);
            fetchSuppliers();
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la mise à jour.');
        }
    };

    const filtered = suppliers.filter(s =>
        s.nom_societe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.nom_gerant && s.nom_gerant.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const handleExport = () => {
        exportToExcel(filtered.map(s => ({
            'Raison Sociale': s.nom_societe,
            'Gérant': s.nom_gerant || 'N/A',
            'Tél': s.tel || 'N/A',
            'ICE': s.ice || '—',
            'I.F': s.if || '—',
            'R.C': s.rc || '—',
            'Adresse': s.adresse || 'N/A'
        })), 'fournisseurs_complet', true);
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen font-sans">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                            <Truck className="text-slate-600 h-8 w-8" />
                            Répertoire Fournisseurs
                        </h1>
                        <p className="text-gray-500 text-sm font-medium italic">Gérez votre base de partenaires techniques.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={handleExport} className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2.5 rounded-xl border border-emerald-100 hover:bg-emerald-100 transition font-black text-xs uppercase tracking-widest shadow-sm">
                            <Download size={18} /> Exporter
                        </button>
                        <button onClick={() => navigate('/add-supplier')} className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl hover:bg-black transition font-black shadow-lg shadow-slate-100 text-xs uppercase tracking-widest">
                            <PlusCircle size={18} /> Nouveau
                        </button>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Rechercher par société ou gérant..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-slate-500 outline-none transition-all shadow-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden text-sm">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <tr>
                            <th className="px-6 py-4">Société / Contact</th>
                            <th className="px-6 py-4">Identifiants</th>
                            <th className="px-6 py-4">Contrat</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 italic font-medium">
                        {loading ? (
                            <tr><td colSpan={4} className="p-10 text-center text-gray-400">Chargement...</td></tr>
                        ) : filtered.map(s => (
                            <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-900 uppercase tracking-tight">{s.nom_societe}</span>
                                        <span className="text-[10px] text-gray-500 flex items-center mt-0.5 uppercase">
                                            <User size={10} className="mr-1" /> {s.nom_gerant || '—'} | <Phone size={10} className="mx-1" /> {s.tel || '—'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] text-slate-500 font-mono">ICE: {s.ice || '—'}</span>
                                        <span className="text-[10px] text-slate-500 font-mono italic text-gray-400">R.C: {s.rc || '—'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {s.scan_contrat ? (
                                        <a href={`${STORAGE_BASE}/${s.scan_contrat}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase underline">
                                            <FileText size={14} /> PDF
                                        </a>
                                    ) : <span className="text-gray-300 text-[10px] uppercase font-bold">Inexistant</span>}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleEdit(s)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shadow-sm bg-white border border-indigo-100">
                                            <Edit2 size={16} />
                                        </button>
                                        <button onClick={() => handleDelete(s.id)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-900 text-white">
                            <h3 className="font-black text-base uppercase tracking-widest flex items-center gap-3">
                                <Briefcase size={20} /> Modifier {editingSupplier?.nom_societe}
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleSubmit(onSubmitUpdate)} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Briefcase size={12} className="mr-2" /> Société / Raison Sociale</label>
                                        <input {...register('nom_societe', { required: true })} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><User size={12} className="mr-2" /> Gérant / Contact</label>
                                        <input {...register('nom_gerant')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><Phone size={12} className="mr-2" /> Téléphone</label>
                                        <input {...register('tel')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><FileText size={12} className="mr-2" /> Scan du Contrat (PDF/Image)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="file"
                                                onChange={(e) => setContractFile(e.target.files?.[0] || null)}
                                                className="flex-1 h-11 py-2 px-4 rounded-xl border-dashed border-2 border-indigo-100 bg-indigo-50/30 focus:bg-white transition-all font-bold text-xs outline-none shadow-sm file:mr-4 file:py-0 file:px-2 file:rounded file:border-0 file:text-[10px] file:bg-indigo-200 file:text-indigo-700 hover:file:bg-indigo-300"
                                            />
                                            {editingSupplier?.scan_contrat && (
                                                <a href={`${STORAGE_BASE}/${editingSupplier.scan_contrat}`} target="_blank" rel="noreferrer" className="p-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 shadow-sm border border-indigo-100">
                                                    <ExternalLink size={18} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center"><MapPin size={12} className="mr-2" /> Adresse</label>
                                        <input {...register('adresse')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white transition-all font-bold text-sm outline-none shadow-sm" />
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 md:col-span-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">ICE</label>
                                            <input {...register('ice')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs outline-none shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">I.F</label>
                                            <input {...register('if')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs outline-none shadow-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">R.C</label>
                                            <input {...register('rc')} className="w-full h-11 px-4 rounded-xl border-gray-200 bg-gray-50 focus:bg-white font-mono text-xs outline-none shadow-sm" />
                                        </div>
                                    </div>
                                </div>
                                <button type="submit" disabled={isSubmitting} className="w-full h-14 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center justify-center space-x-3">{isSubmitting ? '...' : <><Save size={20} /><span>Mettre à jour</span></>}</button>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
