// documents.ts
// ─────────────────────────────────────────────────────────────────────────────
// One-click PDFs: payment receipt (reçu) and client statement (relevé de compte).
// Drawn with jsPDF primitives (no DOM capture) so they are fast and crisp.
// ─────────────────────────────────────────────────────────────────────────────

import jsPDF from 'jspdf';
import { apiFetch } from './api';
import { formatNumber, numberToFrenchWords, parseDate } from './utils';
import { getAppSettings, getLogoForPdf, getStampForPdf } from './appSettings';

// Company identity comes from Paramètres → Société
const co = () => getAppSettings().company;
const companyName = () => (co().name || 'Amical El Ouaha').toUpperCase();
let brandLogo: { dataUrl: string; w: number; h: number } | null = null;
/** Call at the start of every document so the logo is ready for header(). */
let brandStamp: { dataUrl: string; w: number; h: number } | null = null;
const docs = () => getAppSettings().documents;
async function prepareBrand() {
    brandLogo = await getLogoForPdf();
    brandStamp = docs().show_stamp ? await getStampForPdf() : null;
}
/** Company stamp/signature inside a signature box (if configured). */
function drawStamp(doc: jsPDF, x: number, y: number, w: number, h: number) {
    if (!brandStamp) return;
    const ratio = brandStamp.w / brandStamp.h;
    let sh = h - 4, sw = sh * ratio;
    if (sw > w - 4) { sw = w - 4; sh = sw / ratio; }
    try { doc.addImage(brandStamp.dataUrl, 'PNG', x + (w - sw) / 2, y + (h - sh) / 2, sw, sh); } catch { /* ignore */ }
}
const representative = () => {
    const c = co();
    return c.manager_name ? `M./Mme ${c.manager_name}, en sa qualité de ${(c.manager_title || 'gérant').toLowerCase()}` : 'son gérant';
};

const INK: [number, number, number] = [15, 23, 42];       // slate-900
const MUTED: [number, number, number] = [100, 116, 139];  // slate-500
const LINE: [number, number, number] = [226, 232, 240];   // slate-200
const FILL: [number, number, number] = [248, 250, 252];   // slate-50

const M = 18;          // page margin (mm)
const W = 210 - M * 2; // content width

export interface StatementPayment {
    id: number; amount: number | string; payment_date?: string; type?: string; method?: string;
    reference_no?: string; bank_name?: string; status?: string;
}
export interface StatementEcheance {
    id: number; due_date: string; amount: number; paid: number; remaining: number; status: string; label?: string;
}
export interface Statement {
    client: {
        id: number; nom: string; prenom: string; cin?: string; tel?: string; adresse?: string;
        biens?: {
            id: number; type_bien?: string; num_appartement?: string; nom?: string; surface_m2?: number;
            etage?: number | null; immeuble?: string | null; groupe_habitation?: string | null;
            prix_global_finition?: number; prix_global_non_finition?: number;
            terrain?: { nom_projet?: string; nom_terrain?: string; numero_TF?: string } | null;
        }[];
        avec_finition?: number | boolean; date_reservation?: string | null;
    };
    payments: StatementPayment[];
    echeances: StatementEcheance[];
    totals: { prix: number; paid: number; remaining: number };
}

const money = (v: unknown) => `${formatNumber(Number(v) || 0)} DH`;
const fmtDate = (d?: string | null) => (d ? parseDate(d).toLocaleDateString('fr-FR') : '-');
const fullName = (c: { prenom?: string; nom?: string }) =>
    `${(c.prenom || '').trim().replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase())} ${(c.nom || '').toUpperCase()}`.trim();
const bienLabel = (b?: { type_bien?: string; num_appartement?: string; nom?: string }) =>
    b ? [b.type_bien, b.num_appartement || b.nom].filter(Boolean).join(' ') : '-';
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ECH_STATUS: Record<string, string> = { payee: 'Payée', partielle: 'Partielle', en_retard: 'En retard', a_venir: 'À venir' };

function header(doc: jsPDF, title: string, sub: string[]) {
    let x = M;
    if (brandLogo) {
        const h = 16;
        const w = Math.min(40, (brandLogo.w / brandLogo.h) * h);
        try { doc.addImage(brandLogo.dataUrl, 'PNG', M, 12, w, h); x = M + w + 4; } catch { /* ignore bad image */ }
    }
    const c = co();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...INK);
    doc.text(companyName(), x, 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(c.tagline || '', x, 24);
    doc.setFontSize(8);
    const line1 = [c.address, c.city].filter(Boolean).join(', ');
    const line2 = [c.phone, c.email].filter(Boolean).join('  ·  ');
    if (line1) doc.text(doc.splitTextToSize(line1, 105)[0] ?? '', x, 28.5);
    if (line2) doc.text(doc.splitTextToSize(line2, 105)[0] ?? '', x, line1 ? 32 : 28.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(...INK);
    doc.text(title, 210 - M, 22, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    sub.forEach((line, i) => doc.text(line, 210 - M, 27 + i * 4.5, { align: 'right' }));

    doc.setDrawColor(...LINE);
    doc.line(M, 38, 210 - M, 38);
    return 48;
}

function footer(doc: jsPDF) {
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        const c = co();
        const legal = [c.legal_form && `${c.name} ${c.legal_form}`, c.ice && `ICE ${c.ice}`, c.rc && `RC ${c.rc}`, c.if && `IF ${c.if}`, c.patente && `Patente ${c.patente}`, c.cnss && `CNSS ${c.cnss}`, c.capital && `Capital ${c.capital}`].filter(Boolean).join('  ·  ');
        doc.text(legal || `${companyName()} - document généré le ${new Date().toLocaleDateString('fr-FR')}`, M, 287);
        if (legal) doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, M, 291);
        doc.text(`Page ${i} / ${pages}`, 210 - M, 287, { align: 'right' });
    }
}

function label(doc: jsPDF, text: string, x: number, y: number) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(text.toUpperCase(), x, y);
}

function value(doc: jsPDF, text: string, x: number, y: number, bold = false, size = 10) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...INK);
    doc.text(text, x, y);
}

/** Simple table with header row, zebra-free rows separated by hairlines, page breaks. */
function table(doc: jsPDF, y: number, cols: { title: string; w: number; align?: 'left' | 'right' }[], rows: string[][]) {
    const rowH = 7;
    const drawHead = (yy: number) => {
        doc.setFillColor(...FILL);
        doc.rect(M, yy - 5, W, rowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...MUTED);
        let x = M + 2;
        cols.forEach(c => {
            doc.text(c.title, c.align === 'right' ? x + c.w - 4 : x, yy, { align: c.align === 'right' ? 'right' : 'left' });
            x += c.w;
        });
        return yy + rowH;
    };
    y = drawHead(y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    rows.forEach(r => {
        if (y > 275) {
            doc.addPage();
            y = drawHead(24);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
        }
        let x = M + 2;
        doc.setTextColor(...INK);
        r.forEach((cell, i) => {
            const c = cols[i];
            const txt = doc.splitTextToSize(cell, c.w - 4)[0] ?? '';
            doc.text(txt, c.align === 'right' ? x + c.w - 4 : x, y, { align: c.align === 'right' ? 'right' : 'left' });
            x += c.w;
        });
        doc.setDrawColor(...LINE);
        doc.line(M, y + 2.5, 210 - M, y + 2.5);
        y += rowH;
    });
    if (rows.length === 0) {
        doc.setTextColor(...MUTED);
        doc.text('Aucune donnée', M + 2, y);
        y += rowH;
    }
    return y;
}

export async function fetchStatement(clientId: number) {
    return apiFetch<Statement>(`/clients/${clientId}/statement`);
}

/** Payment receipt. Pass the payment id; client totals are fetched so the receipt shows the balance. */
export async function downloadReceipt(clientId: number, paymentId: number) {
    await prepareBrand();
    const st = await fetchStatement(clientId);
    const p = st.payments.find(x => x.id === paymentId);
    if (!p) throw new Error('Paiement introuvable');
    const amount = Number(p.amount) || 0;
    const no = `${docs().receipt_prefix || 'R-'}${String(p.id).padStart(5, '0')}`;

    const doc = new jsPDF();
    let y = header(doc, 'REÇU DE PAIEMENT', [`N° ${no}`, `Date : ${fmtDate(p.payment_date)}`]);

    // Client + property
    label(doc, 'Reçu de', M, y);
    label(doc, 'Bien', M + W / 2, y);
    value(doc, fullName(st.client), M, y + 6, true, 11);
    value(doc, bienLabel(st.client.biens?.[0]), M + W / 2, y + 6, true, 11);
    doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text([st.client.cin ? `CIN : ${st.client.cin.toUpperCase()}` : '', st.client.tel ? `Tél : ${st.client.tel}` : ''].filter(Boolean).join('   '), M, y + 11);
    y += 22;

    // Amount box
    doc.setFillColor(...FILL);
    doc.setDrawColor(...LINE);
    doc.roundedRect(M, y, W, 26, 2, 2, 'FD');
    label(doc, 'Montant reçu', M + 6, y + 8);
    value(doc, money(amount), M + 6, y + 17, true, 18);
    doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...MUTED);
    const w = numberToFrenchWords(Math.floor(amount)).trim();
    const words = capitalize(/dirham/i.test(w) ? w : `${w} dirhams`);
    doc.text(doc.splitTextToSize(words, W / 2 - 6), M + W / 2, y + 11);
    y += 36;

    // Details grid
    const details: [string, string][] = [
        ['Type', p.type || '-'],
        ['Mode de paiement', p.method || '-'],
        ['Référence', p.reference_no || '-'],
        ['Banque', p.bank_name || '-'],
    ];
    details.forEach(([k, v], i) => {
        const x = M + (i % 2) * (W / 2);
        const yy = y + Math.floor(i / 2) * 13;
        label(doc, k, x, yy);
        value(doc, v, x, yy + 5.5);
    });
    y += 30;

    // Balance
    doc.setDrawColor(...LINE);
    doc.line(M, y, 210 - M, y);
    y += 8;
    const tot: [string, number][] = [['Prix du bien', st.totals.prix], ['Total versé à ce jour', st.totals.paid], ['Reste à payer', st.totals.remaining]];
    tot.forEach(([k, v], i) => {
        const x = M + i * (W / 3);
        label(doc, k, x, y);
        value(doc, money(v), x, y + 6, i === 2, 11);
    });
    y += 22;

    // Optional note (Paramètres → Documents)
    if (docs().receipt_note) {
        doc.setFont('helvetica', 'italic'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
        const lines = doc.splitTextToSize(docs().receipt_note, W) as string[];
        doc.text(lines.slice(0, 3), M, y);
        y += lines.slice(0, 3).length * 4.2 + 4;
    }
    y += 4;

    // Signatures
    label(doc, 'Signature du client', M, y);
    label(doc, 'Cachet et signature de la société', M + W / 2, y);
    doc.setDrawColor(...LINE);
    doc.rect(M, y + 3, W / 2 - 6, 26);
    doc.rect(M + W / 2, y + 3, W / 2, 26);
    drawStamp(doc, M + W / 2, y + 3, W / 2, 26);

    footer(doc);
    doc.save(`Recu_${no}_${(st.client.nom || '').replace(/\s+/g, '_')}.pdf`);
}

/** Full client statement: totals, all payments, payment schedule. */
export async function downloadStatement(clientId: number) {
    await prepareBrand();
    const st = await fetchStatement(clientId);
    const doc = new jsPDF();
    let y = header(doc, 'RELEVÉ DE COMPTE', [`Client n° ${st.client.id}`, `Au ${new Date().toLocaleDateString('fr-FR')}`]);

    label(doc, 'Client', M, y);
    label(doc, 'Bien(s)', M + W / 2, y);
    value(doc, fullName(st.client), M, y + 6, true, 11);
    value(doc, (st.client.biens ?? []).map(bienLabel).join(', ') || '-', M + W / 2, y + 6, true, 11);
    doc.setFontSize(9); doc.setTextColor(...MUTED);
    doc.text([st.client.cin ? `CIN : ${st.client.cin.toUpperCase()}` : '', st.client.tel ? `Tél : ${st.client.tel}` : ''].filter(Boolean).join('   '), M, y + 11);
    y += 20;

    // Summary boxes
    const boxes: [string, number][] = [['Prix total', st.totals.prix], ['Total versé', st.totals.paid], ['Reste à payer', st.totals.remaining]];
    const bw = (W - 8) / 3;
    boxes.forEach(([k, v], i) => {
        const x = M + i * (bw + 4);
        doc.setFillColor(...FILL); doc.setDrawColor(...LINE);
        doc.roundedRect(x, y, bw, 18, 2, 2, 'FD');
        label(doc, k, x + 4, y + 6.5);
        value(doc, money(v), x + 4, y + 13.5, true, 12);
    });
    y += 26;

    const cb = co();
    if (docs().show_bank_on_statement && cb.rib) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
        doc.text(`Règlement par virement : ${[cb.bank_name, cb.bank_agency && `agence ${cb.bank_agency}`].filter(Boolean).join(', ')}  ·  RIB ${cb.rib}`, M, y);
        y += 8;
    } else {
        y += 4;
    }

    value(doc, 'Paiements', M, y, true, 11);
    y += 7;
    y = table(doc, y, [
        { title: 'DATE', w: 26 }, { title: 'TYPE', w: 26 }, { title: 'MODE', w: 28 },
        { title: 'RÉFÉRENCE', w: 46 }, { title: 'STATUT', w: 22 }, { title: 'MONTANT', w: W - 148, align: 'right' },
    ], st.payments.map(p => [
        fmtDate(p.payment_date), p.type || '-', p.method || '-', p.reference_no || '-',
        p.status === 'Cancelled' ? 'Annulé' : 'Valide', money(p.amount),
    ]));

    if (st.echeances.length) {
        y += 8;
        if (y > 250) { doc.addPage(); y = 24; }
        value(doc, 'Échéancier', M, y, true, 11);
        y += 7;
        table(doc, y, [
            { title: 'ÉCHÉANCE', w: 34 }, { title: 'DATE', w: 26 }, { title: 'MONTANT', w: 32, align: 'right' },
            { title: 'PAYÉ', w: 30, align: 'right' }, { title: 'RESTE', w: 30, align: 'right' }, { title: 'STATUT', w: W - 152 },
        ], st.echeances.map(e => [
            e.label || '-', fmtDate(e.due_date), money(e.amount), money(e.paid), money(e.remaining), ECH_STATUS[e.status] || e.status,
        ]));
    }

    footer(doc);
    doc.save(`Releve_${(st.client.nom || 'client').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Monthly report for the owner ──────────────────────────────────────────────
export interface MonthlyReport {
    month: string; label: string;
    collected: number; collected_prev: number;
    collected_by_method: { method: string; count: number; total: number }[];
    expenses: Record<'bureau' | 'construction' | 'intervenants' | 'achats' | 'travaux' | 'ouvriers', number>;
    expenses_total: number; expenses_prev_total: number;
    new_clients: { name: string; bien: string; statut_choix?: string }[];
    units: Record<string, number>;
    late: { count: number; clients: number; amount: number; top: { name: string; count: number; amount: number; max_days: number }[] };
    cheques: Record<'to_deposit' | 'deposited' | 'rejected_month', { count: number; amount: number }>;
    projects: {
        name: string; revenue: number; collected: number; profit: number; margin: number | null;
        units: { total: number; libre: number; reserve: number; vendu: number };
        progress: { gros_oeuvre: number; finition: number };
    }[];
}

export const EXPENSE_LABELS: Record<string, string> = {
    terrain: 'Terrain & frais', construction: 'Construction (BTP)', intervenants: 'Intervenants',
    achats: 'Achats matériaux', travaux: 'Travaux généraux', ouvriers: 'Ouvriers', bureau: 'Charges bureau',
};

const trend = (now: number, prev: number) => {
    if (!prev) return now ? 'nouveau ce mois' : '-';
    const p = Math.round(((now - prev) / Math.abs(prev)) * 100);
    return `${p >= 0 ? '+' : ''}${p}% vs mois précédent`;
};

export async function downloadMonthlyReport(month: string) {
    await prepareBrand();
    const r = await apiFetch<MonthlyReport>(`/reports/monthly?month=${month}`);
    const doc = new jsPDF();
    let y = header(doc, 'RAPPORT MENSUEL', [r.label, `Préparé pour ${getAppSettings().preferences.owner_name || 'la direction'}`]);

    // Key figures
    const result = r.collected - r.expenses_total;
    const boxes: [string, string, string][] = [
        ['Encaissé', money(r.collected), trend(r.collected, r.collected_prev)],
        ['Dépenses', money(r.expenses_total), trend(r.expenses_total, r.expenses_prev_total)],
        ['Résultat du mois', money(result), result >= 0 ? 'Excédent de trésorerie' : 'Déficit de trésorerie'],
        ['Retards clients', money(r.late.amount), `${r.late.clients} client(s), ${r.late.count} échéance(s)`],
    ];
    const bw = (W - 6) / 2;
    boxes.forEach(([k, v, h], i) => {
        const x = M + (i % 2) * (bw + 6);
        const yy = y + Math.floor(i / 2) * 26;
        doc.setFillColor(...FILL); doc.setDrawColor(...LINE);
        doc.roundedRect(x, yy, bw, 22, 2, 2, 'FD');
        label(doc, k, x + 5, yy + 6.5);
        value(doc, v, x + 5, yy + 14, true, 13);
        doc.setFontSize(8); doc.setTextColor(...MUTED); doc.text(h, x + 5, yy + 19);
    });
    y += 60;

    const section = (title: string) => {
        if (y > 250) { doc.addPage(); y = 24; }
        value(doc, title, M, y, true, 11);
        y += 7;
    };

    section('Encaissements par mode de paiement');
    y = table(doc, y, [{ title: 'MODE', w: 80 }, { title: 'OPÉRATIONS', w: 40, align: 'right' }, { title: 'MONTANT', w: W - 120, align: 'right' }],
        r.collected_by_method.map(m => [m.method, String(m.count), money(m.total)])) + 6;

    section('Dépenses par catégorie');
    y = table(doc, y, [{ title: 'CATÉGORIE', w: 120 }, { title: 'MONTANT', w: W - 120, align: 'right' }],
        Object.entries(r.expenses).filter(([, v]) => v > 0).map(([k, v]) => [EXPENSE_LABELS[k] ?? k, money(v)])) + 6;

    section(`Nouvelles réservations (${r.new_clients.length})`);
    y = table(doc, y, [{ title: 'CLIENT', w: 90 }, { title: 'BIEN', w: 60 }, { title: 'CONTRAT', w: W - 150 }],
        r.new_clients.map(c => [c.name, c.bien || '-', c.statut_choix === 'CONTRAT_SIGNE' ? 'Signé' : 'Non signé'])) + 6;

    section('Retards de paiement (principaux clients)');
    y = table(doc, y, [{ title: 'CLIENT', w: 90 }, { title: 'ÉCHÉANCES', w: 30, align: 'right' }, { title: 'RETARD MAX', w: 30, align: 'right' }, { title: 'MONTANT', w: W - 150, align: 'right' }],
        r.late.top.map(t => [t.name, String(t.count), `${t.max_days} j`, money(t.amount)])) + 6;

    section('Chèques');
    y = table(doc, y, [{ title: 'ÉTAT', w: 100 }, { title: 'NOMBRE', w: 30, align: 'right' }, { title: 'MONTANT', w: W - 130, align: 'right' }], [
        ['À déposer', String(r.cheques.to_deposit.count), money(r.cheques.to_deposit.amount)],
        ['Déposés, en attente d\'encaissement', String(r.cheques.deposited.count), money(r.cheques.deposited.amount)],
        ['Rejetés ce mois', String(r.cheques.rejected_month.count), money(r.cheques.rejected_month.amount)],
    ]) + 6;

    section('Projets');
    table(doc, y, [
        { title: 'PROJET', w: 40 }, { title: 'VENDU/RÉS./LIBRE', w: 30 }, { title: 'G.O.', w: 14, align: 'right' }, { title: 'FIN.', w: 14, align: 'right' },
        { title: 'CHIFFRE D\'AFF.', w: 30, align: 'right' }, { title: 'ENCAISSÉ', w: 28, align: 'right' }, { title: 'BÉNÉFICE EST.', w: W - 156, align: 'right' },
    ], r.projects.map(p => [
        p.name, `${p.units.vendu} / ${p.units.reserve} / ${p.units.libre}`, `${p.progress.gros_oeuvre}%`, `${p.progress.finition}%`,
        formatNumber(p.revenue), formatNumber(p.collected), formatNumber(p.profit),
    ]));

    footer(doc);
    doc.save(`Rapport_${r.month}.pdf`);
}


// ── Sale documents: contrat de réservation, compromis de vente, attestation ──
export type SaleDocKind = 'reservation' | 'compromis' | 'attestation';

function paragraphs(doc: jsPDF, y: number, blocks: (string | { h: string })[]) {
    for (const b of blocks) {
        if (typeof b !== 'string') {
            if (y > 262) { doc.addPage(); y = 24; }
            y += 3;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...INK);
            doc.text(b.h.toUpperCase(), M, y);
            y += 6.5;
            continue;
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...INK);
        const lines = doc.splitTextToSize(b, W) as string[];
        for (const line of lines) {
            if (y > 272) { doc.addPage(); y = 24; }
            doc.text(line, M, y);
            y += 5.2;
        }
        y += 2.5;
    }
    return y;
}

function signatures(doc: jsPDF, y: number, left: string, right: string) {
    if (y > 235) { doc.addPage(); y = 30; }
    y += 6;
    doc.setFontSize(10); doc.setTextColor(...INK); doc.setFont('helvetica', 'normal');
    doc.text(`Fait à ${getAppSettings().preferences.signing_city || co().city || 'Casablanca'}, le ${new Date().toLocaleDateString('fr-FR')}, en deux exemplaires.`, M, y);
    y += 12;
    doc.setFont('helvetica', 'bold');
    doc.text(left, M, y);
    doc.text(right, M + W / 2, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text('Lu et approuvé, signature', M, y + 5);
    doc.text('Cachet et signature', M + W / 2, y + 5);
    doc.setDrawColor(...LINE);
    doc.rect(M, y + 8, W / 2 - 6, 28);
    doc.rect(M + W / 2, y + 8, W / 2, 28);
    drawStamp(doc, M + W / 2, y + 8, W / 2, 28);
}

export async function downloadSaleDocument(kind: SaleDocKind, clientId: number) {
    await prepareBrand();
    const st = await fetchStatement(clientId);
    const c = st.client;
    const b = c.biens?.[0];
    if (!b && kind !== 'attestation') throw new Error("Ce client n'a pas de bien réservé.");

    const name = fullName(c);
    const cin = c.cin ? c.cin.toUpperCase() : '(non renseignée)';
    const projet = b?.terrain?.nom_projet || b?.terrain?.nom_terrain || '';
    const inProjet = projet ? `, dépendant du projet « ${projet} »` : '';
    const tf = b?.terrain?.numero_TF;
    const prix = st.totals.prix;
    const paid = st.totals.paid;
    const reste = st.totals.remaining;
    const finition = !!c.avec_finition;
    const etage = b?.etage === null || b?.etage === undefined ? '' : b.etage === 0 ? 'rez-de-chaussée' : `${b.etage}e étage`;
    const designation = b ? [
        `${b.type_bien ?? 'Bien'} n° ${b.num_appartement || b.nom || b.id}`,
        b.groupe_habitation && `groupe d'habitation ${b.groupe_habitation}`,
        b.immeuble && `immeuble ${b.immeuble}`,
        etage,
        b.surface_m2 ? `d'une superficie approximative de ${b.surface_m2} m²` : '',
    ].filter(Boolean).join(', ') : '';
    const pending = st.echeances.filter(e => e.remaining > 0);
    const words = (n: number) => { const w = numberToFrenchWords(Math.floor(n)).trim(); return /dirham/i.test(w) ? w : `${w} dirhams`; };

    const doc = new jsPDF();
    const today = new Date().toLocaleDateString('fr-FR');

    if (kind === 'attestation') {
        let y = header(doc, 'ATTESTATION DE PAIEMENT', [`Client n° ${c.id}`, `Le ${today}`]);
        y = paragraphs(doc, y + 4, [
            `Nous soussignés, ${companyName()}, attestons par la présente que M./Mme ${name}, titulaire de la CIN n° ${cin}, a versé à ce jour la somme totale de ${money(paid)} (${words(paid)})${b ? ` au titre de l'acquisition du bien suivant : ${designation}, situé${projet ? ` dans le projet « ${projet} »` : ''}${tf ? ` (titre foncier n° ${tf})` : ''}.` : '.'}`,
            ...(prix > 0 ? [`Le prix total convenu est de ${money(prix)} (${finition ? 'avec finition' : 'gros œuvre'}). Le montant restant à payer s'élève à ${money(reste)}.`] : []),
            'La présente attestation est délivrée à l\'intéressé(e) sur sa demande pour servir et valoir ce que de droit.',
        ]);
        y += 4;
        if (st.payments.length) {
            value(doc, 'Détail des versements', M, y, true, 10.5); y += 6;
            y = table(doc, y, [{ title: 'DATE', w: 30 }, { title: 'TYPE', w: 30 }, { title: 'MODE', w: 34 }, { title: 'RÉFÉRENCE', w: 46 }, { title: 'MONTANT', w: W - 140, align: 'right' }],
                st.payments.filter(p => p.status !== 'Cancelled').map(p => [fmtDate(p.payment_date), p.type || '-', p.method || '-', p.reference_no || '-', money(p.amount)]));
        }
        signatures(doc, y + 4, '', co().manager_name ? `Pour la société, ${co().manager_name}` : 'Pour la société');
        footer(doc);
        doc.save(`Attestation_paiement_${(c.nom || 'client').replace(/\s+/g, '_')}.pdf`);
        return;
    }

    const isCompromis = kind === 'compromis';
    let y = header(doc, isCompromis ? 'COMPROMIS DE VENTE' : 'CONTRAT DE RÉSERVATION', [`Client n° ${c.id}`, `Le ${today}`]);
    const blocks: (string | { h: string })[] = [
        { h: 'Entre les soussignés' },
        `${companyName()}${co().legal_form ? ` ${co().legal_form}` : ''}${co().ice ? ` (ICE ${co().ice})` : ''}, promoteur immobilier${co().address ? `, dont le siège est situé ${co().address}${co().city ? `, ${co().city}` : ''}` : ''}, représentée par ${representative()}, ci-après dénommée « ${isCompromis ? 'le Vendeur' : 'le Promoteur'} »,`,
        `Et M./Mme ${name}, titulaire de la CIN n° ${cin}${c.adresse ? `, demeurant ${c.adresse.replace(/\s+/g, ' ')}` : ''}${c.tel ? `, téléphone ${c.tel}` : ''}, ci-après dénommé(e) « ${isCompromis ? "l'Acquéreur" : 'le Réservataire'} ».`,
        { h: isCompromis ? 'Article 1 - Objet et désignation' : 'Article 1 - Objet' },
        isCompromis
            ? `Le Vendeur s'engage à vendre à l'Acquéreur, qui s'engage à acquérir, le bien suivant : ${designation}${inProjet}${tf ? `, objet du titre foncier n° ${tf}` : ''}, vendu ${finition ? 'avec finition' : 'en gros œuvre'}.`
            : `Le Promoteur réserve au profit du Réservataire, qui accepte, le bien suivant : ${designation}${inProjet}${tf ? ` (titre foncier n° ${tf})` : ''}, ${finition ? 'livré avec finition' : 'livré en gros œuvre'}.`,
        { h: 'Article 2 - Prix' },
        `Le prix est fixé à ${money(prix)} (${words(prix)}), toutes taxes comprises.`,
        { h: 'Article 3 - Versements et modalités de paiement' },
        paid > 0
            ? `À la date des présentes, ${isCompromis ? "l'Acquéreur" : 'le Réservataire'} a versé la somme de ${money(paid)} (${words(paid)}), dont quittance. Le solde, soit ${money(reste)}, sera réglé ${pending.length ? 'selon l\'échéancier ci-dessous' : 'selon les modalités convenues entre les parties'}.`
            : `Le prix sera réglé selon ${pending.length ? 'l\'échéancier ci-dessous' : 'les modalités convenues entre les parties'}.`,
    ];
    y = paragraphs(doc, y, blocks);
    if (pending.length) {
        y = table(doc, y, [{ title: 'ÉCHÉANCE', w: 60 }, { title: 'DATE', w: 50 }, { title: 'MONTANT', w: W - 110, align: 'right' }],
            pending.map(e => [e.label || '-', fmtDate(e.due_date), money(e.remaining)])) + 4;
    }
    // Articles 4+ — numbers and texts follow Paramètres → Documents
    const d = docs();
    const penalty = Number(d.penalty_percent) || 0;
    const noticeDays = Number(d.notice_days) || 15;
    const months = Number(d.delivery_months) || 0;
    const articles: [string, string][] = isCompromis ? [
        ['Transfert de propriété', "L'acte de vente définitif sera établi devant notaire après paiement intégral du prix. Le transfert de propriété et la remise des clés interviendront à la signature de l'acte définitif."],
        ...(months > 0 ? [['Délai de livraison', `Le bien sera livré dans un délai prévisionnel de ${months} mois à compter de la signature des présentes, sauf cas de force majeure ou retard dû aux administrations.`] as [string, string]] : []),
        ['Frais', "Les frais d'enregistrement, de conservation foncière et d'honoraires du notaire afférents à l'acte définitif sont à la charge de l'Acquéreur, sauf accord contraire."],
        ['Défaut de paiement', `En cas de non-respect de l'échéancier, et après mise en demeure restée sans effet pendant ${noticeDays} jours, le Vendeur pourra résilier le présent compromis dans les conditions prévues par la loi${penalty > 0 ? `, une indemnité de ${penalty} % des sommes versées restant acquise au Vendeur` : ''}.`],
    ] : [
        ['Durée et suite de la réservation', "La présente réservation engage les parties jusqu'à la signature du compromis de vente. Le Promoteur s'interdit de proposer le bien réservé à un tiers pendant cette période."],
        ...(months > 0 ? [['Délai de livraison', `La livraison du bien est prévue dans un délai de ${months} mois à compter de la signature du compromis de vente, sauf cas de force majeure.`] as [string, string]] : []),
        ['Désistement', penalty > 0
            ? `En cas de désistement du Réservataire, les sommes versées lui seront restituées déduction faite de frais de désistement de ${penalty} % de ces sommes.`
            : 'En cas de désistement du Réservataire, les sommes versées lui seront restituées déduction faite des frais éventuels convenus entre les parties.'],
        ['Défaut de paiement', `À défaut de paiement d'une échéance, et après mise en demeure restée sans effet pendant ${noticeDays} jours, la réservation pourra être annulée par le Promoteur.`],
    ];
    if (d.extra_clause?.trim()) articles.push(['Conditions particulières', d.extra_clause.trim()]);
    const tail: (string | { h: string })[] = articles.flatMap(([title, text], i) => [{ h: `Article ${4 + i} - ${title}` }, text]);
    y = paragraphs(doc, y, tail);
    signatures(doc, y, isCompromis ? "L'Acquéreur" : 'Le Réservataire', isCompromis ? 'Le Vendeur' : 'Le Promoteur');
    footer(doc);
    doc.save(`${isCompromis ? 'Compromis' : 'Reservation'}_${(c.nom || 'client').replace(/\s+/g, '_')}_${b?.num_appartement || b?.id || ''}.pdf`);
}
