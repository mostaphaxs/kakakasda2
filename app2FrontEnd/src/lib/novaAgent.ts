// novaAgent.ts — Nova as an agent over the whole gestion.
//
// Nova answers in JSON, one step at a time: either call a tool or answer.
//   • read tools (get, find_client) run on their own
//   • UI tools (open a page, a window or a PDF) run on their own
//   • "write" tools (create / edit / delete / record money) stop and wait for
//     the user to confirm a card in the chat
// Results are sent back to the model until it gives its final answer.

import { GoogleGenerativeAI, type Content, type Part } from '@google/generative-ai';
import { apiFetch } from './api';
import { getAppSettings } from './appSettings';
import { localISODate } from './utils';

// ── model access (same key/model rules as lib/gemini.ts) ──────────────────────
const ENV_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const currentKey = () => {
    const k = getAppSettings().ai.gemini_key;
    return (k && k !== '•' ? k : '') || ENV_KEY || '';
};
const modelName = () => getAppSettings().ai.model_vision || getAppSettings().ai.model_text || 'gemini-3-flash-preview';

// ── types ─────────────────────────────────────────────────────────────────────
export interface WriteAction {
    method: 'POST' | 'PUT' | 'DELETE';
    path: string;
    body?: Record<string, unknown>;
    /** form field that receives the file attached in the chat (receipt, scan…) */
    attach_file?: string;
    /** short French sentence shown on the confirmation card */
    summary: string;
}

export type UiTool =
    | { tool: 'navigate'; args: { path: string } }
    | { tool: 'open_quick_payment'; args: { client_id?: number } }
    | { tool: 'open_client_documents'; args: { client_id: number } }
    | { tool: 'download_document'; args: { kind: 'reservation' | 'compromis' | 'attestation' | 'releve' | 'recu'; client_id: number; payment_id?: number } }
    | { tool: 'monthly_report'; args: { month?: string } }
    | { tool: 'whatsapp_reminder'; args: { client_id: number; message_fr: string; message_ar?: string } }
    | { tool: 'open_task_editor'; args: { client_id?: number; title?: string } };

type Step =
    | { type: 'tool'; tool: 'get'; args: { path: string; search?: string; limit?: number } }
    | { type: 'tool'; tool: 'find_client'; args: { query: string } }
    | { type: 'tool'; tool: 'write'; args: WriteAction }
    | ({ type: 'tool' } & UiTool)
    | { type: 'answer'; message: string; choices?: string[] };

export interface AgentHooks {
    /** Ask the user to confirm a write: 'yes', 'all' (approve the rest of this request) or 'no'. */
    confirm: (a: WriteAction) => Promise<'yes' | 'all' | 'no'>;
    /** Runs a UI tool (navigation, windows, PDFs); returns a short result text. */
    runUi: (t: UiTool) => Promise<string>;
    /** Progress text while Nova works ("Recherche du client…"). */
    progress?: (label: string) => void;
}

export interface AgentResult { message: string; choices: string[]; actions: number }

// ── the system prompt ─────────────────────────────────────────────────────────
const API_DOC = `
API (préfixe déjà inclus, chemins commençant par "/") :

CLIENTS
- GET /clients → tous les clients avec biens, paiements et balance {prix, paid, remaining}. Préférez find_client pour chercher.
- GET /clients/{id}/statement → relevé complet (paiements, échéancier, totaux).
- POST /clients {nom*, prenom*, cin*, tel*, tel_2, email, adresse, date_reservation, bien_id, avec_finition(bool), avec_contrat(bool), statut_choix(SANS_CHOIX|CHOIX_FAIT|CONTRAT_SIGNE), observation}
- PUT /clients/{id} (mêmes champs; nom, prenom, cin, tel obligatoires — renvoyez les valeurs actuelles)
- POST /clients/{id}/cancel {refund_amount, notes} → annule la réservation (libère le bien)
- DELETE /clients/{id}
- POST /clients/{id}/documents (fichier "document", "title") → joindre un document

PAIEMENTS CLIENTS
- GET /payments
- POST /payments {client_id*, bien_id, amount*, payment_date* (AAAA-MM-JJ), type* (Avance|Tranche|Reliquat|Caution|Reprise), method* (Espèces|Chèque|Virement), reference_no (n° chèque / virement), bank_name, bank_commission, notes} + fichier "receipt" (preuve)
- PUT /payments/{id} (mêmes champs, facultatifs)
- POST /payments/{id}/cancel {refund_amount*} ; DELETE /payments/{id}
- Chèques : GET /cheques ; POST /cheques/{payment_id}/status {status* (recu|depose|encaisse|rejete), date, reason}

ÉCHÉANCIER
- GET /echeances?client_id=&status=(a_venir|partielle|en_retard|payee) → échéances + résumé
- POST /echeances/plan {client_id*, total*, count*, start_date*, interval_months* (1-12), bien_id} → crée un plan de N échéances
- POST /echeances {client_id*, due_date*, amount*, label, notes} ; PUT /echeances/{id} ; DELETE /echeances/{id}

PROJETS & BIENS
- GET /terrains (projets) ; POST /terrains {nom_projet*, nom_terrain, numero_TF, date_acquisition, cout_global, frais_enregistrement, frais_immatriculation, honoraires_notaire, autorisation_construction, total, description} ; PUT/DELETE /terrains/{id}
- GET /biens → tous les biens (statut Libre|Reserve|Vendu, prix_global_finition, prix_global_non_finition, terrain)
- POST /biens {terrain_id*, type_bien* (Appartement, Villa, Lot, Magasin, Bureau…), surface_m2*, nom, immeuble, etage, groupe_habitation, statut, prix_par_m2_finition, prix_global_finition, prix_par_m2_non_finition, prix_global_non_finition, description}
- PUT /biens/{id} (champs partiels) ; DELETE /biens/{id}
- POST /biens/{id}/reserve {client_id*} → réserve un bien libre pour un client
- GET /biens/{id}/suivi ; POST /biens/{id}/suivi/gros-oeuvre {gros_oeuvre_pourcentage} ; POST /biens/{id}/suivi/historique {…}
- GET /annex-units ; POST /annex-units (parkings, caves…)

DÉPENSES
- GET /charges ; POST /charges {periode* (date), terrain_id, loyer_bureau, fournitures_bureau, employes_bureau, impots, gasoil (montants), <categorie>_ref} + fichier "<categorie>_scan"
- GET /suppliers ; POST /suppliers {nom_societe*, type_entreprise, nom_gerant, adresse, tel, ice, if, rc, rib, description}
- GET /articles ; POST /articles {category*, name*, unit*}
- GET /purchase-invoices ; POST /purchase-invoices {supplier_id*, terrain_id, invoice_no, reference_bon, items*: [{article_id*, qty*, unit_price*, vat_rate}]}
- POST /purchase-invoices/{id}/payments {amount*, payment_date*, method*, bank_name, notes}
- GET /general-works ; POST /general-works {supplier_id*, terrain_id*, work_type*, total_amount*, paid_amount, method, bank_name, description}
- GET /service-providers ; POST /service-providers {nom*, categorie, tel, adresse, ice, if, rc, rib}
- GET /provider-invoices ; POST /provider-invoices {service_provider_id*, amount*, invoice_date*, reference, notes, terrain_id} + fichier "scan_path"
- GET /contractors ; POST /contractors {categorie*, nom_societe*, nom_gerant*, adresse*, tel*, montant_global*, terrain_id, ice, if, rc, rib, description}
- GET /intervenants ; POST /intervenants (mêmes champs que contractors)
- POST /contractor-payments {payable_id*, payable_type* ("App\\\\Models\\\\Contractor" ou "App\\\\Models\\\\Intervenant"), amount*, payment_date*, method*, bank_name, notes}
- GET /stock ; GET /stock/low-stock ; POST /stock/exit {article_id*, qty*, destination_id* (bien)}
- GET /factures

PERSONNEL
- GET /ouvriers ; POST /ouvriers {name*, speciality*, cin, phone, phone_whatsapp, rib, status (active|inactive)}
- POST /ouvriers/{id}/missions {type* (journalier|periode|m2|ml|forfait), start_date*, end_date, quantity*, unit_price*, terrain_id, bien_id, description, status (pending|completed)}
- POST /ouvriers/{id}/payments {amount*, …}
- GET /salaries ; POST /salaries {name*, speciality*, cin, phone, monthly_salary, hiring_date, fonction, cnss_number, salaire_base, active}

JURIDIQUE
- GET /contentieux ; POST /contentieux {courtType*, fileNumber*, date*, stage*, plaintiff*, defendant*, next_hearing_date, decision, lawyerName, lawyerPhone}
- PUT /contentieux/{id} (partiel)

TÂCHES, MESSAGES, ALERTES
- GET /tasks?status=(all|open|done)&client_id= ; POST /tasks {title*, notes, due_date, priority (normale|haute), client_id, contact_name, contact_phone} ; PUT /tasks/{id} {done: true} ; DELETE /tasks/{id}
- GET /message-templates ; GET /notifications (alertes du jour)

CHIFFRES
- GET /stats → encaissements, chiffre_affaires, reste_a_recouvrer, charges, benefice_estime, biens_status, terrains_stats, monthly_perf…
- GET /reports/profit → rentabilité par projet ; GET /reports/monthly?month=AAAA-MM → bilan du mois
- GET /transactions → toutes les entrées/sorties d'argent
- GET /settings/app ; PUT /settings/app (paramètres de la société)

(* = obligatoire)`;

const PAGES = `/home (accueil), /dashboard, /clients, /add-client, /echeancier, /cheques, /terrains (projets), /properties (biens), /disponibilites, /rentabilite, /charges, /suppliers, /achats, /add-achat, /articles, /stock, /travaux, /contractors, /intervenants, /services-tiers, /workers (ouvriers), /salaries, /contentieux, /taches, /messages, /transactions, /factures, /factures-list, /parametres, /profile`;

function systemPrompt() {
    const s = getAppSettings();
    const today = localISODate(new Date());
    return `Tu es Nova, l'assistante de gestion de "${s.company.name}" (promotion immobilière, Maroc). Tu travailles pour ${s.preferences.owner_name}.
Tu peux TOUT faire dans l'application : consulter, créer, modifier, supprimer, encaisser, générer des documents, ouvrir des pages.
Aujourd'hui : ${today}. Monnaie : DH. Réponds dans la langue de l'utilisateur (français, darija ou arabe), court et clair.

FORMAT — réponds UNIQUEMENT par un objet JSON, une étape à la fois :
1) Appeler un outil : {"type":"tool","tool":"<nom>","args":{...}}
2) Réponse finale : {"type":"answer","message":"texte markdown","choices":["option courte", ...]}  (choices facultatif : suggestions de suite)

OUTILS
- get {path, search?, limit?} : lecture (GET) de l'API. "search" filtre les éléments d'une liste (texte), "limit" (défaut 30).
- find_client {query} : cherche un client par nom, prénom, CIN ou téléphone → id, biens, tel, balance (prix, payé, reste).
- write {method (POST|PUT|DELETE), path, body, attach_file?, summary} : toute création / modification / suppression. L'utilisateur verra une carte de confirmation avec "summary" (phrase française précise, ex. "Encaisser 5 000 DH (Espèces) pour Ahmed Alami"). attach_file = nom du champ fichier si l'utilisateur a joint un document (ex. "receipt" pour une preuve de paiement).
- navigate {path} : ouvrir une page. Pages : ${PAGES}
- open_quick_payment {client_id?} : ouvrir la fenêtre d'encaissement rapide (si l'utilisateur veut saisir lui-même).
- open_client_documents {client_id} : fenêtre des documents de vente du client.
- download_document {kind (reservation|compromis|attestation|releve|recu), client_id, payment_id? (pour recu)} : télécharge le PDF.
- monthly_report {month? AAAA-MM} : télécharge le rapport mensuel PDF.
- whatsapp_reminder {client_id, message_fr, message_ar?} : ouvre la fenêtre WhatsApp pré-remplie (l'utilisateur choisit le numéro et envoie).
- open_task_editor {client_id?, title?} : ouvre le formulaire de tâche.
${API_DOC}

RÈGLES
- Ne jamais inventer d'identifiant : cherche d'abord (find_client, get /biens, get /terrains…).
- Si plusieurs résultats correspondent, demande lequel avec "choices".
- S'il manque une information obligatoire, demande-la (une seule question claire, avec "choices" si possible). La date par défaut est aujourd'hui. Pour un paiement, demande la méthode si elle n'est pas dite.
- Pour PUT d'un client, récupère d'abord ses données et renvoie les champs obligatoires.
- Une écriture par étape. Après chaque écriture tu reçois le résultat ; enchaîne si besoin (ex. créer le client puis réserver le bien), puis réponds.
- Si l'utilisateur refuse une confirmation, n'insiste pas.
- Pour les questions chiffrées, appuie-toi sur les données (stats, relevés) et donne les montants formatés (ex. 12 500 DH).
- Un document joint (photo de chèque, facture, CIN) : lis-le pour remplir les champs, puis propose l'écriture.`;
}

// ── helpers ───────────────────────────────────────────────────────────────────
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DROP = new Set(['created_at', 'updated_at', 'deleted_at', 'email_verified_at', 'password', 'remember_token']);

function compact(v: unknown, depth = 0): unknown {
    if (Array.isArray(v)) return v.map(x => compact(x, depth + 1));
    if (v && typeof v === 'object') {
        if (depth > 4) return '…';
        const out: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(v)) {
            if (DROP.has(k) || x === null || x === '' || (Array.isArray(x) && x.length === 0)) continue;
            out[k] = compact(x, depth + 1);
        }
        return out;
    }
    return v;
}

function shrink(data: unknown, search?: string, limit = 30): string {
    let d: any = data;
    // Laravel resources sometimes wrap lists: {data: [...], summary}
    let rest: Record<string, unknown> | null = null;
    if (d && !Array.isArray(d) && Array.isArray(d.data)) { const { data: inner, ...r } = d; rest = r; d = inner; }
    if (Array.isArray(d)) {
        let list = d;
        if (search) {
            const words = norm(search).split(/\s+/).filter(Boolean);
            list = list.filter(x => { const t = norm(JSON.stringify(x)); return words.every(w => t.includes(w)); });
        }
        const total = list.length;
        const cap = Math.max(1, Math.min(limit, 200));
        const out = { total, ...(rest ? { meta: compact(rest) } : {}), items: compact(list.slice(0, cap)), ...(total > cap ? { note: `${total - cap} éléments non affichés — utilisez search ou limit` } : {}) };
        return clip(JSON.stringify(out));
    }
    return clip(JSON.stringify(compact(d)));
}
const clip = (s: string, max = 24000) => (s.length > max ? s.slice(0, max) + '…(tronqué)' : s);

async function findClient(query: string) {
    const all = await apiFetch<any[]>('/clients');
    const words = norm(query).split(/\s+/).filter(Boolean);
    const hits = all.filter(c => {
        const t = norm([c.nom, c.prenom, c.cin, c.tel, c.tel_2, c.email].filter(Boolean).join(' '));
        return words.every(w => t.includes(w));
    });
    return {
        total: hits.length,
        clients: hits.slice(0, 10).map(c => ({
            id: c.id, nom: c.nom, prenom: c.prenom, cin: c.cin, tel: c.tel, tel_2: c.tel_2 || undefined,
            statut: c.statut, avec_finition: !!c.avec_finition, date_reservation: c.date_reservation,
            biens: (c.biens ?? []).map((b: any) => ({ id: b.id, type: b.type_bien, num: b.num_appartement || b.nom, terrain_id: b.terrain_id, statut: b.statut })),
            balance: c.balance,
            nb_paiements: c.payments?.length ?? 0,
        })),
    };
}

async function executeWrite(a: WriteAction, file: File | null) {
    const path = a.path.startsWith('/') ? a.path : '/' + a.path;
    if (/^\/(login|logout|user\/update-password)/.test(path)) throw new Error('Action non autorisée depuis Nova.');
    if (a.attach_file && file) {
        const fd = new FormData();
        const add = (k: string, v: unknown) => {
            if (v === undefined || v === null) return;
            if (Array.isArray(v)) v.forEach((x, i) => typeof x === 'object' ? Object.entries(x as object).forEach(([kk, vv]) => add(`${k}[${i}][${kk}]`, vv)) : add(`${k}[${i}]`, x));
            else if (typeof v === 'boolean') fd.append(k, v ? '1' : '0');
            else fd.append(k, String(v));
        };
        Object.entries(a.body ?? {}).forEach(([k, v]) => add(k, v));
        fd.append(a.attach_file, file);
        // Laravel only parses multipart bodies on POST
        if (a.method !== 'POST') fd.append('_method', a.method);
        return apiFetch(path, { method: 'POST', body: fd });
    }
    return apiFetch(path, { method: a.method, ...(a.method === 'DELETE' ? {} : { body: JSON.stringify(a.body ?? {}) }) });
}

/** First complete {...} object in the text (models sometimes add junk after it). */
function firstJsonObject(text: string): string | null {
    const start = text.indexOf('{');
    if (start < 0) return null;
    let depth = 0, inStr = false, esc = false;
    for (let i = start; i < text.length; i++) {
        const ch = text[i];
        if (inStr) {
            if (esc) esc = false;
            else if (ch === '\\') esc = true;
            else if (ch === '"') inStr = false;
        } else if (ch === '"') inStr = true;
        else if (ch === '{') depth++;
        else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
    }
    return null;
}

function parseStep(text: string): Step | null {
    const raw = firstJsonObject(text);
    if (!raw) return text.trim() && !text.includes('{') ? { type: 'answer', message: text.trim() } : null;
    try {
        const s = JSON.parse(raw);
        if (s.type === 'tool' && typeof s.tool === 'string') return { ...s, args: s.args ?? {} };
        if (s.type === 'answer' && s.message) return s;
        if (s.message) return { type: 'answer', message: String(s.message), choices: s.choices };
    } catch { /* invalid */ }
    return null;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Calls the model, waiting and retrying when the free quota is hit (429) or the service is busy (503). */
async function generate(model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>, contents: Content[], progress?: (l: string) => void) {
    for (let attempt = 0; ; attempt++) {
        try {
            return (await model.generateContent({ contents })).response.text();
        } catch (e: any) {
            const msg = String(e?.message || '');
            const retryable = /\b(429|503|500)\b|overloaded|quota|exhausted/i.test(msg);
            if (!retryable || attempt >= 3) {
                if (/\b429\b|quota/i.test(msg)) throw new Error("Limite d'utilisation de l'IA atteinte (clé gratuite). Réessayez dans une minute, ou utilisez une clé payante dans Paramètres → Intelligence artificielle.");
                throw e;
            }
            const hinted = Number(msg.match(/retry in ([\d.]+)s/i)?.[1] || msg.match(/"retryDelay":"(\d+)s"/)?.[1]);
            const wait = Math.min(40, Number.isFinite(hinted) && hinted > 0 ? hinted + 1 : 5 * (attempt + 1));
            progress?.(`IA occupée, nouvelle tentative dans ${Math.round(wait)} s…`);
            await sleep(wait * 1000);
        }
    }
}

async function fileToPart(file: File): Promise<Part> {
    const data = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onloadend = () => res(String(r.result).split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
    return { inlineData: { data, mimeType: file.type || 'application/octet-stream' } };
}

const LABELS: Record<string, string> = {
    get: 'Consultation des données…', find_client: 'Recherche du client…', write: 'En attente de confirmation…',
    navigate: 'Ouverture de la page…', download_document: 'Génération du document…', monthly_report: 'Préparation du rapport…',
};

// ── the agent ─────────────────────────────────────────────────────────────────
export class NovaAgent {
    /** Conversation kept across messages (text only; files are sent with their turn). */
    private history: Content[] = [];

    reset() { this.history = []; }

    async send(message: string, file: File | null, hooks: AgentHooks): Promise<AgentResult> {
        if (!currentKey()) throw new Error('IA non configurée : ajoutez une clé dans Paramètres → Intelligence artificielle.');
        const model = new GoogleGenerativeAI(currentKey()).getGenerativeModel({
            model: modelName(),
            systemInstruction: systemPrompt(),
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
        });

        const userParts: Part[] = [{ text: (message || 'Analyse le document joint.') + (file ? `\n[Document joint : ${file.name}]` : '') }];
        if (file) userParts.push(await fileToPart(file));
        const turn: Content[] = [{ role: 'user', parts: userParts }];
        let actions = 0;
        let autoApprove = false;

        for (let i = 0; i < 12; i++) {
            let step = parseStep(await generate(model, [...this.history, ...turn], hooks.progress));
            if (!step) {
                // one gentle retry when the JSON came back malformed
                turn.push({ role: 'user', parts: [{ text: 'Réponse invalide. Renvoie UNIQUEMENT un objet JSON valide, une seule étape.' }] });
                step = parseStep(await generate(model, [...this.history, ...turn], hooks.progress));
                turn.pop();
                if (!step) step = { type: 'answer', message: "Désolé, je n'ai pas réussi à traiter la demande. Pouvez-vous reformuler ?" };
            }
            turn.push({ role: 'model', parts: [{ text: JSON.stringify(step) }] });

            if (step.type === 'answer') {
                this.commit(turn, file);
                return { message: step.message, choices: Array.isArray(step.choices) ? step.choices.slice(0, 5).map(String) : [], actions };
            }

            hooks.progress?.(LABELS[step.tool] ?? 'Nova travaille…');
            let result: string;
            try {
                result = await this.runTool(step, file, hooks, () => autoApprove, v => { autoApprove = v; });
                if (step.tool === 'write' && !result.startsWith('REFUS')) actions++;
            } catch (e: any) {
                result = `ERREUR : ${e?.message || e}`;
            }
            turn.push({ role: 'user', parts: [{ text: `RÉSULTAT ${step.tool} : ${result}` }] });
        }
        this.commit(turn, file);
        return { message: "J'ai fait plusieurs étapes sans terminer. Pouvez-vous préciser la demande ?", choices: [], actions };
    }

    private commit(turn: Content[], file: File | null) {
        // keep the conversation light: drop the file bytes, keep only recent turns
        const light = turn.map(c => ({ ...c, parts: c.parts.filter(p => !('inlineData' in p && p.inlineData)) }))
            .map(c => (c.parts.length ? c : { ...c, parts: [{ text: file ? `[document ${file.name}]` : '…' }] }));
        this.history = [...this.history, ...light].slice(-40);
        while (this.history.length && this.history[0].role !== 'user') this.history.shift();
    }

    private async runTool(step: Extract<Step, { type: 'tool' }>, file: File | null, hooks: AgentHooks,
        isAuto: () => boolean, setAuto: (v: boolean) => void): Promise<string> {
        switch (step.tool) {
            case 'get': {
                const p = String(step.args.path || '');
                const path = p.startsWith('/') ? p : '/' + p;
                return shrink(await apiFetch(path), step.args.search, step.args.limit);
            }
            case 'find_client':
                return clip(JSON.stringify(await findClient(String(step.args.query || ''))));
            case 'write': {
                const a = step.args;
                if (!a?.method || !a?.path) return 'ERREUR : method et path obligatoires.';
                if (a.attach_file && !file) delete a.attach_file;
                if (!isAuto()) {
                    const answer = await hooks.confirm(a);
                    if (answer === 'no') return "REFUS : l'utilisateur a annulé cette action.";
                    if (answer === 'all') setAuto(true);
                }
                const res = await executeWrite(a, file);
                return 'OK ' + shrink(res, undefined, 10);
            }
            default:
                return hooks.runUi(step as UiTool);
        }
    }
}
