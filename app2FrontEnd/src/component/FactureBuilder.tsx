import React, { useRef, useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileText, PlusCircle, Trash2, Download, FileSpreadsheet, File as FileIcon, Save, ArrowLeft } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Document, Packer, Paragraph, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { numberToFrenchWords } from '../lib/utils';
import { professionalizeDescription } from '../lib/gemini';

interface InvoiceItem {
    designation: string;
    qty: number;
    unitPrice: number;
    vatRate: number;
}

interface InvoiceForm {
    invoiceNo: string;
    date: string;
    clientName: string;
    clientAddress: string;
    clientIce: string;
    clientIf: string;
    clientRc: string;
    supplierName: string;
    supplierAddress: string;
    supplierIce: string;
    supplierIf: string;
    supplierRc: string;
    supplierCapSoc: string;
    supplierTel: string;
    description: string;
    bankName: string;
    bankAccount: string;
    chequeNumber: string;
    chequeBank: string;
    paymentMethod: string;
    items: InvoiceItem[];
}

const FactureBuilder: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const invoiceRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [loadingIndices, setLoadingIndices] = useState<number[]>([]);

    const state = location.state as { facture?: any, mode?: 'view' | 'edit' } | null;
    const factureData = state?.facture;
    const mode = state?.mode || 'create';

    const { register, control, watch, setValue } = useForm<InvoiceForm>({
        defaultValues: (() => {

            if (factureData) {
                return {
                    invoiceNo: factureData.invoice_no,
                    date: factureData.date,
                    clientName: factureData.client_name,
                    clientAddress: factureData.client_address || '',
                    clientIce: factureData.client_ice || '',
                    clientIf: factureData.client_if || '',
                    clientRc: factureData.client_rc || '',
                    supplierName: factureData.supplier_name || ' Amical El Ouaha  S.a.r.l',
                    supplierAddress: factureData.supplier_address || '84,rue prince moulay abdellah,3 ème Etage - Casablanca',
                    supplierIce: factureData.supplier_ice || '001728471000020',
                    supplierIf: factureData.supplier_if || '01033242',
                    supplierRc: factureData.supplier_rc || '153081',
                    supplierCapSoc: factureData.supplier_cap_soc || '200 000.00DHS',
                    supplierTel: factureData.supplier_tel || '0522 201 062 - 0522 276 429',
                    description: factureData.description || '',
                    bankName: factureData.bank_name || 'MA BANQUE',
                    bankAccount: factureData.bank_account || '0000 0000 0000 0000 0000 0000',
                    chequeNumber: factureData.cheque_number || '',
                    chequeBank: factureData.cheque_bank || '',
                    paymentMethod: factureData.payment_method || 'Virement bancaire',
                    items: factureData.items?.map((item: any) => ({
                        designation: item.designation,
                        qty: item.qty,
                        unitPrice: item.unit_price,
                        vatRate: item.vat_rate
                    })) || [{ designation: '', qty: 1, unitPrice: 0, vatRate: 20 }]
                };
            }
            return {
                invoiceNo: `FA-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-...`,
                date: new Date().toISOString().split('T')[0],
                clientName: '',
                clientAddress: '',
                clientIce: '',
                clientIf: '',
                clientRc: '',
                supplierName: ' Amical El Ouaha  S.a.r.l',
                supplierAddress: '84,rue prince moulay abdellah,3 ème Etage - Casablanca',
                supplierIce: '001728471000020',
                supplierIf: '01033242',
                supplierRc: '153081',
                supplierCapSoc: '200 000.00DHS',
                supplierTel: '0522 201 062 - 0522 276 429',
                description: '',
                bankName: 'MA BANQUE',
                bankAccount: '0000 0000 0000 0000 0000 0000',
                chequeNumber: '',
                chequeBank: '',
                paymentMethod: 'Virement bancaire',
                items: [{ designation: '', qty: 1, unitPrice: 0, vatRate: 20 }]
            };
        })()
    });

    const watchAll = watch();

    const handleProfessionalize = async (index: number) => {
        const desc = watchAll.items[index]?.designation;
        if (!desc) {
            toast.error("Veuillez saisir une désignation.");
            return;
        }

        try {
            setLoadingIndices(prev => [...prev, index]);
            const improved = await professionalizeDescription(desc);
            setValue(`items.${index}.designation`, improved);
            toast.success("Description améliorée ! ✨");
        } catch (error: any) {
            toast.error(error.message || "Erreur de connexion à l'IA.");
        } finally {
            setLoadingIndices(prev => prev.filter(i => i !== index));
        }
    };

    useEffect(() => {
        if (mode === 'create') {
            const fetchNextInvoiceNo = async () => {
                try {
                    const data: any = await apiFetch('/factures');
                    const factures = Array.isArray(data) ? data : (data.data || []);

                    const now = new Date();
                    const year = now.getFullYear();
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const prefix = `FA-${year}-${month}-`;

                    const monthlyInvoices = factures.filter((f: any) => f.invoice_no?.startsWith(prefix));

                    let nextSuffix = 1;
                    if (monthlyInvoices.length > 0) {
                        const suffixes = monthlyInvoices.map((f: any) => {
                            const parts = f.invoice_no.split('-');
                            return parseInt(parts[parts.length - 1], 10);
                        }).filter((n: any) => !isNaN(n));

                        if (suffixes.length > 0) {
                            nextSuffix = Math.max(...suffixes) + 1;
                        }
                    }

                    const nextNo = `${prefix}${String(nextSuffix).padStart(3, '0')}`;
                    setValue('invoiceNo', nextNo);
                } catch (error) {
                    console.error("Error calculating next invoice number", error);
                    const now = new Date();
                    const prefix = `FA-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-001`;
                    setValue('invoiceNo', prefix);
                }
            };
            fetchNextInvoiceNo();
        }
    }, [mode, setValue]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items'
    });

    const totals = (watchAll.items || []).reduce((acc, item) => {
        const q = item.qty || 0;
        const p = item.unitPrice || 0;
        const v = item.vatRate || 0;
        const ht = q * p;
        const ttc = ht * (1 + v / 100);
        return { ht: acc.ht + ht, tva: acc.tva + (ttc - ht), ttc: acc.ttc + ttc };
    }, { ht: 0, tva: 0, ttc: 0 });

    const saveFacture = async () => {
        try {
            setIsSaving(true);
            const payload = {
                invoice_no: watchAll.invoiceNo,
                date: watchAll.date,
                client_name: watchAll.clientName,
                client_address: watchAll.clientAddress,
                client_ice: watchAll.clientIce,
                client_if: watchAll.clientIf,
                client_rc: watchAll.clientRc,
                supplier_name: watchAll.supplierName,
                supplier_address: watchAll.supplierAddress,
                supplier_ice: watchAll.supplierIce,
                supplier_if: watchAll.supplierIf,
                supplier_rc: watchAll.supplierRc,
                supplier_cap_soc: watchAll.supplierCapSoc,
                supplier_tel: watchAll.supplierTel,
                bank_name: watchAll.bankName,
                bank_account: watchAll.bankAccount,
                cheque_number: watchAll.chequeNumber,
                cheque_bank: watchAll.chequeBank,
                payment_method: watchAll.paymentMethod,
                description: watchAll.description,
                items: watchAll.items
            };

            if (mode === 'edit' && factureData?.id) {
                await apiFetch(`/factures/${factureData.id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                toast.success('Facture modifiée avec succès !');
            } else {
                await apiFetch('/factures', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Facture enregistrée avec succès !');
            }
            navigate('/factures-list');
        } catch (error: any) {
            toast.error(error.message || 'Erreur lors de la sauvegarde de la facture.');
        } finally {
            setIsSaving(false);
        }
    };

    const exportToPDF = async () => {
        if (!invoiceRef.current) return;
        try {
            setIsExporting(true);
            invoiceRef.current.classList.remove('shadow-2xl');

            const imgData = await toPng(invoiceRef.current, {
                pixelRatio: 2,
                cacheBust: true,
            });

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();

            const img = new Image();
            img.src = imgData;
            await new Promise((resolve) => { img.onload = resolve; });

            const pdfHeight = (img.height * pdfWidth) / img.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Facture_${watchAll.invoiceNo}.pdf`);

            invoiceRef.current.classList.add('shadow-2xl');
            toast.success('PDF généré avec succès !');
        } catch (error: any) {
            console.error('PDF Generation Error:', error);
            toast.error('Erreur lors de la génération PDF');
            invoiceRef.current?.classList.add('shadow-2xl');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToWord = async () => {
        if (!invoiceRef.current) return;
        try {
            setIsExporting(true);
            invoiceRef.current.classList.remove('shadow-2xl');

            const imgData = await toPng(invoiceRef.current, {
                pixelRatio: 1.5,
                cacheBust: true,
            });

            const response = await fetch(imgData);
            const blobData = await response.blob();
            const arrayBuffer = await blobData.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const doc = new Document({
                sections: [{
                    children: [
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: uint8Array,
                                    type: 'png',
                                    transformation: {
                                        width: 595,
                                        height: 842,
                                    },
                                }),
                            ],
                        }),
                    ],
                }],
            });

            const docBlob = await Packer.toBlob(doc);
            saveAs(docBlob, `Facture_${watchAll.invoiceNo}.docx`);

            toast.success('Document Word généré avec succès !');
            invoiceRef.current.classList.add('shadow-2xl');
        } catch (e: any) {
            console.error('Word Export Error:', e);
            toast.error(`Erreur Word`);
            invoiceRef.current?.classList.add('shadow-2xl');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToExcel = () => {
        const sheetData = (watchAll.items || []).map(item => ({
            'Désignation': item.designation,
            'Quantité': item.qty,
            'Prix Unitaire HT (DH)': item.unitPrice,
            'TVA (%)': item.vatRate,
            'Montant HT': (item.qty || 0) * (item.unitPrice || 0),
            'Montant TTC': ((item.qty || 0) * (item.unitPrice || 0)) * (1 + (item.vatRate || 0) / 100)
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(wb, ws, "Détails Facture");
        XLSX.writeFile(wb, `Facture_${watchAll.invoiceNo}.xlsx`);
        toast.success('Fichier Excel généré avec succès !');
    };

    return (
        <div className="max-w-7xl mx-auto p-4 space-y-6 flex flex-col xl:flex-row gap-6 items-start">

            {/* Formulaire de configuration */}
            <div className={`w-full xl:w-1/3 bg-white border border-gray-200 shadow-sm rounded-2xl p-6 space-y-6 top-6 ${mode === 'view' ? 'opacity-70 pointer-events-none' : ''}`}>
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter flex items-center gap-2">
                        <FileText className="text-blue-600" /> {mode === 'view' ? 'Détails Facture' : mode === 'edit' ? 'Modifier Facture' : 'Paramètres Facture'}
                    </h2>
                    {mode !== 'create' && (
                        <button onClick={() => navigate('/factures-list')} className="text-xs font-bold text-gray-500 hover:text-gray-800 flex items-center gap-1 pointer-events-auto">
                            <ArrowLeft size={16} /> Retour
                        </button>
                    )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b pb-2">Informations Générales</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">N° Facture</label>
                            <input {...register('invoiceNo')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Date</label>
                            <input type="date" {...register('date')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none" />
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest border-b pb-2 mt-8 mb-4">Pied de page (Entreprise)</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Nom de l'entreprise</label>
                            <input {...register('supplierName')} className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Adresse de l'entreprise</label>
                            <input {...register('supplierAddress')} className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all" />
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">ICE</label>
                                <input {...register('supplierIce')} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-300" placeholder="001728471000020" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">IF</label>
                                <input {...register('supplierIf')} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-300" placeholder="01033242" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">RC</label>
                                <input {...register('supplierRc')} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-300" placeholder="153081" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Cap. Soc.</label>
                                <input {...register('supplierCapSoc')} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-300" placeholder="200 000.00DHS" />
                            </div>
                            <div>
                                <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Téléphone</label>
                                <input {...register('supplierTel')} className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-gray-300" placeholder="0522 201 062 - 0522 276 429" />
                            </div>
                        </div>
                    </div>

                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b pb-2 mt-6">Client</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nom de client</label>
                        <textarea {...register('clientName')} rows={2} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none resize-none" placeholder="Ex: Jean Dupont / Entreprise SARL" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Adresse de client</label>
                        <input {...register('clientAddress')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ICE (Factultatif)</label>
                        <input {...register('clientIce')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-mono outline-none" placeholder="000000000" />
                    </div>


                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b pb-2 mt-6">Informations Bancaires</h3>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Méthode de Paiement</label>
                            <select {...register('paymentMethod')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none">
                                <option value="Virement bancaire">Virement bancaire</option>
                                <option value="Chèque">Chèque</option>
                                <option value="Espèces">Espèces</option>
                            </select>
                        </div>
                        {watchAll.paymentMethod?.toLowerCase().includes('virement') && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Banque</label>
                                    <input {...register('bankName')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Compte / RIB</label>
                                    <input {...register('bankAccount')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-mono outline-none" />
                                </div>
                            </>
                        )}
                        {watchAll.paymentMethod?.toLowerCase().includes('chèque') && (
                            <>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">N° de Chèque (Facultatif)</label>
                                    <input {...register('chequeNumber')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none" placeholder="Ex: CK-00123" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Banque (Facultatif)</label>
                                    <input {...register('chequeBank')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none" placeholder="Ex: BCP, BMCE..." />
                                </div>
                            </>
                        )}
                    </div>

                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b pb-2 mt-6">Détails Additionnels</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Description / Objet</label>
                        <textarea {...register('description')} rows={4} className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none resize-none" placeholder="Objet de la facture..." />
                    </div>

                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b pb-2 mt-6 flex justify-between items-center">
                        Articles
                        <button type="button" onClick={() => append({ designation: '', qty: 1, unitPrice: 0, vatRate: 20 })} className="text-blue-500 hover:text-blue-600 font-bold flex items-center gap-1 text-xs">
                            <PlusCircle size={14} /> Ajouter
                        </button>
                    </h3>
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                        {fields.map((item, index) => (
                            <div key={item.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2 relative group">
                                <button type="button" onClick={() => remove(index)} className="absolute top-2 right-2 text-rose-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 size={16} />
                                </button>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Désignation</label>
                                    <div className="relative">
                                        <input {...register(`items.${index}.designation` as const)} className="w-full h-8 pl-2 pr-8 rounded-lg border border-gray-200 bg-white text-xs outline-none focus:border-blue-400 transition-all" placeholder="Nom de l'article ou service..." />
                                        <button
                                            type="button"
                                            onClick={() => handleProfessionalize(index)}
                                            disabled={loadingIndices.includes(index)}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-amber-500 hover:text-amber-600 transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                                            title="Améliorer avec l'IA"
                                        >
                                            {loadingIndices.includes(index) ? (
                                                <div className="w-3 h-3 border-2 border-amber-200 border-t-amber-500 rounded-full animate-spin"></div>
                                            ) : (
                                                <span className="text-sm">✨</span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Qté</label>
                                        <input type="number" step="0.01" {...register(`items.${index}.qty` as const, { valueAsNumber: true })} className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">P.U HT</label>
                                        <input type="number" step="0.01" {...register(`items.${index}.unitPrice` as const, { valueAsNumber: true })} className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">TVA (%)</label>
                                        <input type="number" {...register(`items.${index}.vatRate` as const, { valueAsNumber: true })} className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs outline-none" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4 grid grid-cols-4 gap-3 border-t">
                        {mode !== 'view' && (
                            <button type="button" onClick={saveFacture} disabled={isSaving} className="flex flex-col items-center justify-center p-3 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors font-bold text-[10px] uppercase tracking-widest w-full disabled:opacity-50 pointer-events-auto cursor-pointer">
                                {isSaving ? <span className="animate-spin mb-1">⏳</span> : <Save size={20} className="mb-1" />}
                                {mode === 'edit' ? 'METTRE A JOUR' : 'SAUVER'}
                            </button>
                        )}
                        <button type="button" onClick={exportToWord} disabled={isExporting} className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-bold text-[10px] uppercase tracking-widest w-full pointer-events-auto cursor-pointer">
                            {isExporting ? <span className="animate-spin mb-1">⏳</span> : <FileIcon size={20} className="mb-1" />} WORD
                        </button>
                        <button type="button" onClick={exportToExcel} className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors font-bold text-[10px] uppercase tracking-widest w-full pointer-events-auto cursor-pointer">
                            <FileSpreadsheet size={20} className="mb-1" /> EXCEL
                        </button>
                        <button type="button" onClick={exportToPDF} disabled={isExporting} className="flex flex-col items-center justify-center p-3 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors font-bold text-[10px] uppercase tracking-widest w-full disabled:opacity-50 pointer-events-auto cursor-pointer">
                            {isExporting ? <span className="animate-spin mb-1">⏳</span> : <Download size={20} className="mb-1" />}
                            PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Aperçu de la facture */}
            <div className="w-full xl:w-2/3 flex justify-center pb-12">
                <div
                    ref={invoiceRef}
                    className="bg-white shadow-2xl overflow-hidden text-sm flex flex-col"
                    style={{ width: '210mm', minHeight: '297mm', position: 'relative' }}
                >
                    {/* Header Image */}
                    <div className="w-full shrink-0 flex justify-center border-b-[3px] border-gray-800 pb-2 mb-2">
                        <img
                            src="/Facture/Header.png"
                            alt="Header"
                            className="w-full max-h-[160px] object-contain block px-8"
                        />
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-grow flex flex-col px-10 py-6 relative text-black">

                        <div className="flex justify-between items-start mb-8">
                            <div className="w-1/3">
                                <table className="w-full border-collapse border border-black text-center text-xs">
                                    <thead>
                                        <tr>
                                            <th colSpan={2} className="border border-black bg-gray-100 py-1 uppercase font-bold text-sm">Facture</th>
                                        </tr>
                                        <tr className="bg-gray-50">
                                            <th className="border border-black py-1 w-1/2 font-bold">Date</th>
                                            <th className="border border-black py-1 w-1/2 font-bold">Numéro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="border border-black py-2">{watchAll.date}</td>
                                            <td className="border border-black py-2">{watchAll.invoiceNo}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="w-1/2">
                                <div className="border border-black border-dashed p-3 min-h-[100px] text-xs">
                                    <p className="font-black text-sm uppercase mb-1 break-all">{watchAll.clientName}</p>
                                    <p className="text-gray-700 leading-relaxed mb-1 italic break-words">{watchAll.clientAddress}</p>
                                    {watchAll.clientIce && (
                                        <div className="font-mono text-[10px] mt-2 border-t pt-1 border-gray-300">
                                            <p>ICE: {watchAll.clientIce}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {watchAll.description && (
                            <div className="mb-4">
                                <p className="text-xs font-bold text-gray-800 break-words"><span className="text-gray-500 font-medium mr-2">Objet :</span> {watchAll.description}</p>
                            </div>
                        )}

                        <div className="w-full">
                            <table className="w-full text-left border-collapse border border-black">
                                <thead>
                                    <tr className="bg-gray-200 text-black text-[10px] font-bold uppercase">
                                        <th className="border border-black py-2 px-3">Désignation</th>
                                        <th className="border border-black py-2 px-3 text-center w-16">Qté</th>
                                        <th className="border border-black py-2 px-3 text-right w-24">P.U HT</th>
                                        <th className="border border-black py-2 px-3 text-center w-16">TVA</th>
                                        <th className="border border-black py-2 px-3 text-right w-24">Mnt. HT</th>
                                        <th className="border border-black py-2 px-3 text-right w-28">Mnt. TTC</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const items = watchAll.items || [];
                                        const rows = [...items];
                                        while (rows.length < 3) {
                                            rows.push({ designation: '', qty: 0, unitPrice: 0, vatRate: 20 });
                                        }

                                        return rows.map((item, idx) => {
                                            const ht = (item.qty || 0) * (item.unitPrice || 0);
                                            const ttc = ht * (1 + (item.vatRate || 0) / 100);
                                            return (
                                                <tr key={idx} className="text-[10px] h-10">
                                                    <td className="border border-black py-1 px-3 align-top">{item.designation || (idx < items.length ? '...' : '')}</td>
                                                    <td className="border border-black py-1 px-3 text-center align-top">{item.qty || ''}</td>
                                                    <td className="border border-black py-1 px-3 text-right align-top">{item.unitPrice ? item.unitPrice.toLocaleString('fr-MA', { minimumFractionDigits: 2 }) : ''}</td>
                                                    <td className="border border-black py-1 px-3 text-center align-top">{item.vatRate}%</td>
                                                    <td className="border border-black py-1 px-3 text-right align-top">{ht ? ht.toLocaleString('fr-MA', { minimumFractionDigits: 2 }) : ''}</td>
                                                    <td className="border border-black py-1 px-3 text-right align-top font-bold">
                                                        {ttc ? ttc.toLocaleString('fr-MA', { minimumFractionDigits: 2 }) : ''}
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                    <tr className="bg-gray-100 font-bold text-xs">
                                        <td colSpan={4} rowSpan={3} className="border border-black p-4 align-bottom">
                                            <p className="italic text-[10px]">Arrête la présente Facture à la somme :</p>
                                            <p className="uppercase mt-1 text-black font-black underline">
                                                {numberToFrenchWords(totals.ttc)}
                                            </p>
                                        </td>
                                        <td className="border border-black py-1 px-3 text-right uppercase text-[9px]">Total HT</td>
                                        <td className="border border-black py-1 px-3 text-right text-[11px]">{totals.ht.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr className="bg-gray-100 font-bold text-xs">
                                        <td className="border border-black py-1 px-3 text-right uppercase text-[9px]">Total TVA</td>
                                        <td className="border border-black py-1 px-3 text-right text-[11px]">{totals.tva.toLocaleString('fr-MA', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                    <tr className="bg-gray-200 font-black text-sm">
                                        <td className="border border-black py-2 px-3 text-right uppercase text-[9px]">Total TTC</td>
                                        <td className="border border-black py-2 px-3 text-right text-blue-800">{totals.ttc.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} DH</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="text-xs space-y-1 bg-gray-50 p-4 border border-black border-dotted">
                                <p><span className="font-bold">Modalité de paiement :</span> {watchAll.paymentMethod}</p>
                                {watchAll.paymentMethod?.toLowerCase().includes('chèque') && (
                                    <>
                                        {watchAll.chequeNumber && <p><span className="font-bold">N° de Chèque :</span> {watchAll.chequeNumber}</p>}
                                        {watchAll.chequeBank && <p><span className="font-bold">Banque :</span> {watchAll.chequeBank}</p>}
                                    </>
                                )}
                                {watchAll.paymentMethod?.toLowerCase().includes('virement') && (
                                    <>
                                        <p><span className="font-bold">Banque :</span> {watchAll.bankName}</p>
                                        <p><span className="font-bold">Compte :</span> <span className="font-mono">{watchAll.bankAccount}</span></p>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end pr-10">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-12">Cachet & Signature</p>
                                    <div className="w-40 border-b border-black"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Data */}
                    <div className="w-full shrink-0 mt-auto pt-5 pb-6 text-center border-t border-gray-800 text-gray-800" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                        <p className="font-black underline text-[16px] tracking-widest mb-2 uppercase">
                            {watchAll.supplierName}
                        </p>
                        <p className="font-bold text-[13px] mb-3.5 tracking-wide">{watchAll.supplierAddress}</p>

                        <div className="flex justify-center flex-wrap gap-x-8 gap-y-2 text-[12px] font-black tracking-normal w-full px-4">
                            {watchAll.supplierIce && <span>ICE: {watchAll.supplierIce}</span>}
                            {watchAll.supplierIf && <span>IF: {watchAll.supplierIf}</span>}
                            {watchAll.supplierRc && <span>RC: N° {watchAll.supplierRc}</span>}
                            {watchAll.supplierCapSoc && <span>Cap. Soc: {watchAll.supplierCapSoc}</span>}
                            {watchAll.supplierTel && <span>TEL: {watchAll.supplierTel}</span>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FactureBuilder;
