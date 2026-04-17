import React, { useRef, useState } from 'react';
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

    const state = location.state as { facture?: any, mode?: 'view' | 'edit' } | null;
    const factureData = state?.facture;
    const mode = state?.mode || 'create';

    const { register, control, watch } = useForm<InvoiceForm>({
        defaultValues: (() => {
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : null;
            const defaultSupplierName = user?.name || 'MON ENTREPRISE';

            if (factureData) {
                return {
                    invoiceNo: factureData.invoice_no,
                    date: factureData.date,
                    clientName: factureData.client_name,
                    clientAddress: factureData.client_address || '',
                    clientIce: factureData.client_ice || '',
                    clientIf: factureData.client_if || '',
                    clientRc: factureData.client_rc || '',
                    supplierName: factureData.supplier_name || defaultSupplierName,
                    supplierAddress: factureData.supplier_address || 'Adresse de l\'entreprise',
                    supplierIce: factureData.supplier_ice || '000000000000000',
                    supplierIf: factureData.supplier_if || '00000000',
                    supplierRc: factureData.supplier_rc || '000000',
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
                invoiceNo: `FA-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-001`,
                date: new Date().toISOString().split('T')[0],
                clientName: '',
                clientAddress: '',
                clientIce: '',
                clientIf: '',
                clientRc: '',
                supplierName: defaultSupplierName,
                supplierAddress: 'Adresse de l\'entreprise',
                supplierIce: '000000000000000',
                supplierIf: '00000000',
                supplierRc: '000000',
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

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items'
    });

    const watchAll = watch();

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
            const msg = error?.message || String(error);
            toast.error('Erreur lors de la génération PDF : ' + msg);
            invoiceRef.current.classList.add('shadow-2xl');
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
            const errorMsg = e?.message || String(e);
            toast.error(`Erreur Word : ${errorMsg.substring(0, 50)}`);
            invoiceRef.current.classList.add('shadow-2xl');
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

                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest border-b pb-2 mt-6">Émetteur / Fournisseur</h3>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Nom / Raison Sociale Émetteur</label>
                        <input {...register('supplierName')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none" placeholder="Ex: MON ENTREPRISE" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Adresse</label>
                        <input {...register('supplierAddress')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-sm font-bold outline-none" />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">ICE</label>
                        <input {...register('supplierIce')} className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white text-xs font-mono outline-none" placeholder="000000000" />
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
                                    <input {...register(`items.${index}.designation` as const)} className="w-full h-8 px-2 rounded-lg border border-gray-200 bg-white text-xs outline-none" />
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

            {/* Aperçu de la facture (Format A4 - 794px largeur approx) */}
            <div className="w-full xl:w-2/3 flex justify-center pb-12">
                <div
                    ref={invoiceRef}
                    className="bg-white shadow-2xl overflow-hidden text-sm flex flex-col"
                    style={{ width: '210mm', minHeight: '297mm', position: 'relative' }}
                >
                    {/* Header Image */}
                    <div className="w-full shrink-0 flex justify-center py-2">
                        <img src="/Facture/Header.png" alt="Header" className="w-[70%] h-auto object-contain block" />
                    </div>

                    {/* Contenu principal */}
                    <div className="flex-grow flex flex-col px-10 py-6 relative text-black">

                        {/* Box Header: Facture Info & Fournisseur Info */}
                        <div className="flex justify-between items-start mb-8">
                            {/* Left: Facture Table */}
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

                            {/* Right: Fournisseur Table */}
                            <div className="w-1/2">
                                <div className="border border-black border-dashed p-3 min-h-[100px] text-xs">
                                    <p className="font-black text-sm uppercase mb-1 break-all">{watchAll.supplierName}</p>
                                    <p className="text-gray-700 leading-relaxed mb-1 italic break-words">{watchAll.supplierAddress}</p>
                                    {watchAll.supplierIce && (
                                        <div className="font-mono text-[10px] mt-2 border-t pt-1">
                                            <p>ICE: {watchAll.supplierIce}</p>
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

                        {/* Table des articles (The big one from the image) */}
                        <div className="flex-grow">
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
                                        // Ensure at least 3 rows
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
                                    {/* Totals inside the table footer style */}
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

                        {/* Payment & Footer section */}
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

                            {/* Cachet space */}
                            <div className="flex justify-end pr-10">
                                <div className="text-center">
                                    <p className="text-[10px] font-bold uppercase text-gray-400 mb-12">Cachet & Signature</p>
                                    <div className="w-40 border-b border-black"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Image */}
                    <div className="w-full shrink-0 mt-auto flex justify-center py-2">
                        <img src="/Facture/Footer.png" alt="Footer" className="w-[70%] h-auto object-contain block" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FactureBuilder;
