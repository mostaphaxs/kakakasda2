// messageTemplates.ts — WhatsApp templates: variables, per-client values, filling.

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './api';
import { formatNumber } from './utils';
import { useClientsLite } from '../component/common/QuickPayment';

export interface MessageTemplate {
    id: number; name: string; category: string; body_fr: string; body_ar?: string | null;
}

export const COMPANY_NAME = 'Société Les Cinq Éléments';

export const CATEGORIES: Record<string, string> = {
    bienvenue: 'Bienvenue', paiement: 'Paiement', chantier: 'Chantier',
    signature: 'Signature', evenement: 'Événement', autre: 'Autre',
};

/** Variables usable in a template, e.g. "Bonjour {prenom}". */
export const VARIABLES: { key: string; label: string }[] = [
    { key: 'prenom', label: 'Prénom' },
    { key: 'nom', label: 'Nom' },
    { key: 'bien', label: 'Bien (ex. Villa C22)' },
    { key: 'projet', label: 'Projet' },
    { key: 'prix', label: 'Prix du bien' },
    { key: 'paye', label: 'Total versé' },
    { key: 'reste', label: 'Reste à payer' },
    { key: 'montant_echeance', label: 'Montant prochaine échéance' },
    { key: 'date_echeance', label: 'Date prochaine échéance' },
    { key: 'gros_oeuvre', label: '% gros œuvre' },
    { key: 'finition', label: '% finition' },
    { key: 'societe', label: 'Nom de la société' },
];

export function fillTemplate(body: string, vars: Record<string, string>) {
    return body.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== '' ? vars[k] : m));
}

interface Ech { client_id: number; due_date: string; remaining: number; status: string }
interface Terrain { id: number; nom_projet?: string; nom_terrain?: string }
type ClientLike = {
    id?: number; nom?: string; prenom?: string; avec_finition?: number | boolean;
    biens?: any[]; payments?: { amount: number | string; status?: string; refund_amount?: number | string }[];
};

export function buildVars(c: ClientLike | undefined, terrains: Terrain[] = [], echeances: Ech[] = []): Record<string, string> {
    const v: Record<string, string> = { societe: COMPANY_NAME };
    if (!c) return v;
    const cap = (s?: string) => (s || '').trim().replace(/(^|[\s-])\p{L}/gu, m => m.toUpperCase());
    v.prenom = cap(c.prenom);
    v.nom = cap(c.nom);
    const b = c.biens?.[0];
    if (b) {
        v.bien = [b.type_bien, b.num_appartement || b.nom].filter(Boolean).join(' ');
        const t = terrains.find(x => x.id === b.terrain_id);
        v.projet = t?.nom_projet || t?.nom_terrain || '';
        v.gros_oeuvre = String(b.gros_oeuvre_pourcentage ?? 0);
        v.finition = String(b.finition_pourcentage ?? 0);
    }
    const prix = (c.biens ?? []).reduce((a, x) => a + (Number(c.avec_finition ? x.prix_global_finition : x.prix_global_non_finition) || 0), 0);
    const paid = (c.payments ?? []).filter(p => p.status !== 'Cancelled').reduce((a, p) => a + (Number(p.amount) || 0), 0);
    v.prix = formatNumber(prix);
    v.paye = formatNumber(paid);
    v.reste = formatNumber(Math.max(0, prix - paid));
    const next = echeances
        .filter(e => e.client_id === c.id && e.status !== 'payee')
        .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
    if (next) {
        v.montant_echeance = formatNumber(next.remaining);
        v.date_echeance = new Date(next.due_date + 'T00:00:00').toLocaleDateString('fr-FR');
    }
    return v;
}

/** Everything needed to personalise messages (cached, shared with other pages). */
export function useMessageContext() {
    const templates = useQuery({ queryKey: ['message-templates'], queryFn: () => apiFetch<MessageTemplate[]>('/message-templates'), staleTime: 60_000 });
    const clients = useClientsLite();
    const terrains = useQuery({ queryKey: ['palette-terrains'], queryFn: () => apiFetch<Terrain[]>('/terrains'), staleTime: 60_000 });
    const ech = useQuery({ queryKey: ['echeances', undefined], queryFn: () => apiFetch<{ data: Ech[] }>('/echeances'), staleTime: 60_000 });
    const varsFor = (clientId?: number, fallback?: ClientLike) =>
        buildVars(clients.data?.find(c => c.id === clientId) ?? fallback, terrains.data ?? [], ech.data?.data ?? []);
    return {
        templates: templates.data ?? [],
        clients: clients.data ?? [],
        terrains: terrains.data ?? [],
        echeances: ech.data?.data ?? [],
        varsFor,
        loading: templates.isLoading || clients.isLoading,
    };
}
