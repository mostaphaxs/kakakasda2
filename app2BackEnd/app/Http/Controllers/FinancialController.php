<?php

namespace App\Http\Controllers;

use App\Models\payments;
use App\Models\ContractorPayment;
use App\Models\Charge;
use App\Models\GeneralWork;
use App\Models\Salarie;
use App\Models\PurchaseInvoice;
use App\Models\OuvrierMission;
use Illuminate\Http\Request;
use Carbon\Carbon;

class FinancialController extends Controller
{
    public function transactions(Request $request)
    {
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date') ?: Carbon::now()->toDateString();
        $terrainId = $request->input('terrain_id');
        $type = $request->input('type'); // 'IN' or 'OUT'

        $transactions = collect();

        // 1. Client Payments (IN) - CASH
        if (!$type || $type === 'IN') {
            $query = payments::with(['client', 'bien.terrain']);
            if ($startDate) $query->whereDate('payment_date', '>=', $startDate);
            if ($endDate) $query->whereDate('payment_date', '<=', $endDate);
            if ($terrainId) {
                $query->whereHas('bien', function($q) use ($terrainId) {
                    $q->where('terrain_id', $terrainId);
                });
            }
            
            $query->get()->each(function($p) use ($transactions) {
                // Robust Name Resolution for Clients (nom + prenom)
                $client = $p->client;
                $entityName = 'Client Inconnu';
                if ($client) {
                    $nom = $client->nom ?? '';
                    $prenom = $client->prenom ?? '';
                    $entityName = trim($nom . ' ' . $prenom) ?: 'Client Sans Nom';
                }

                $transactions->push([
                    'id' => 'PAY-' . $p->id,
                    'date' => Carbon::parse($p->payment_date ?: $p->created_at)->toDateString(),
                    'amount' => (float)$p->amount,
                    'flow' => 'IN',
                    'is_cash' => true,
                    'category' => 'Recouvrement Client',
                    'entity' => $entityName,
                    'bank' => $p->destination_bank ?: ($p->bank_name ?: 'Caisse/Inconnu'),
                    'source_bank' => $p->source_bank,
                    'virement_type' => $p->virement_type,
                    'reference' => $p->reference_no,
                    'method' => $p->method,
                    'project' => $p->bien?->terrain?->nom_projet ?? 'Global',
                    'notes' => $p->notes
                ]);
            });
        }

        // 2. Contractor & Supplier Payments (OUT) - CASH
        if (!$type || $type === 'OUT') {
            // Polymorphic relation - we load payable and check type inside
            $query = ContractorPayment::with(['payable']);
            if ($startDate) $query->whereDate('payment_date', '>=', $startDate);
            if ($endDate) $query->whereDate('payment_date', '<=', $endDate);
            
            $query->get()->each(function($cp) use ($transactions, $terrainId) {
                $payable = $cp->payable;
                if (!$payable && $cp->payable_id) {
                    // Try to catch cases where model name in DB might be slightly different
                    // or relationship not auto-loading correctly for some reason.
                }

                $projectName = 'Global';
                if ($payable && method_exists($payable, 'terrain') && $payable->terrain) {
                    $projectName = $payable->terrain->nom_projet;
                    if ($terrainId && $payable->terrain_id != $terrainId) return;
                } elseif ($terrainId) {
                    return;
                }

                $cat = 'Sortie Divers';
                $entityName = 'Destinataire Inconnu';

                if ($cp->payable_type === 'App\Models\PurchaseInvoice') {
                    $cat = 'Paiement Fournisseur';
                    // Load supplier if not loaded
                    if ($payable && !$payable->relationLoaded('supplier')) {
                        $payable->load('supplier');
                    }
                    $entityName = $payable?->supplier?->nom_societe ?? 'Fournisseur Inconnu';
                } elseif ($cp->payable_type === 'App\Models\Ouvrier') {
                    $cat = 'Réglement Ouvrier';
                    $entityName = $payable?->name ?? 'Ouvrier Inconnu';
                } elseif ($cp->payable_type === 'App\Models\Contractor') {
                    $cat = 'Paiement Entreprise';
                    $entityName = $payable?->nom_societe ?? 'Entreprise Inconnue';
                }

                $transactions->push([
                    'id' => 'CPAY-' . $cp->id,
                    'date' => Carbon::parse($cp->payment_date ?: $cp->created_at)->toDateString(),
                    'amount' => (float)$cp->amount,
                    'flow' => 'OUT',
                    'is_cash' => true,
                    'category' => $cat,
                    'entity' => $entityName,
                    'bank' => $cp->bank_name ?? 'Caisse/Inconnu',
                    'reference' => $cp->reference_no,
                    'method' => $cp->method,
                    'project' => $projectName,
                    'notes' => $cp->notes
                ]);
            });

            // 3. General Works (OUT) - CASH
            $gwQuery = GeneralWork::with(['supplier', 'terrain']);
            if ($startDate) $gwQuery->whereDate('created_at', '>=', $startDate);
            if ($endDate) $gwQuery->whereDate('created_at', '<=', $endDate);
            if ($terrainId) $gwQuery->where('terrain_id', $terrainId);

            $gwQuery->get()->each(function($gw) use ($transactions) {
                $transactions->push([
                    'id' => 'GW-' . $gw->id,
                    'date' => Carbon::parse($gw->created_at)->toDateString(),
                    'amount' => (float)$gw->paid_amount,
                    'flow' => 'OUT',
                    'is_cash' => true,
                    'category' => 'Travaux (Direct)',
                    'entity' => $gw->supplier?->nom_societe ?? 'Fournisseur Inconnu',
                    'bank' => $gw->bank_name ?: ($gw->rib ?: 'Caisse/Inconnu'),
                    'reference' => $gw->reference_no,
                    'method' => $gw->method,
                    'project' => $gw->terrain?->nom_projet ?? 'Global',
                    'notes' => $gw->work_type
                ]);
            });

            // 4. Salaries / Payroll (OUT) - CASH
            $salQuery = Salarie::query();
            if ($startDate) $salQuery->whereDate('payment_date', '>=', $startDate);
            if ($endDate) $salQuery->whereDate('payment_date', '<=', $endDate);
            if (!$terrainId) {
                $salQuery->get()->each(function($s) use ($transactions) {
                    $transactions->push([
                        'id' => 'SAL-' . $s->id,
                        'date' => Carbon::parse($s->payment_date ?: $s->created_at)->toDateString(),
                        'amount' => (float)$s->net_a_payer,
                        'flow' => 'OUT',
                        'is_cash' => true,
                        'category' => 'Paie Personnel',
                        'entity' => $s->name,
                        'bank' => $s->rib ?: ($s->payment_method ?: 'Virement'),
                        'reference' => $s->payment_method,
                        'method' => $s->payment_method,
                        'project' => 'Global',
                        'notes' => 'Bulletin de paie'
                    ]);
                });
            }

            // 5. Operating Charges (OUT) - CASH
            $chgQuery = Charge::with('terrain');
            if ($startDate) $chgQuery->whereDate('periode', '>=', $startDate);
            if ($endDate) $chgQuery->whereDate('periode', '<=', $endDate);
            if ($terrainId) $chgQuery->where('terrain_id', $terrainId);

            $chgQuery->get()->each(function($c) use ($transactions) {
                $total = $c->frais_tel + $c->internet + $c->loyer_bureau + $c->fournitures_bureau + $c->employes_bureau + $c->impots + $c->gasoil;
                if ($total > 0) {
                    $transactions->push([
                        'id' => 'CHG-' . $c->id,
                        'date' => Carbon::parse($c->periode)->toDateString(),
                        'amount' => (float)$total,
                        'flow' => 'OUT',
                        'is_cash' => true,
                        'category' => 'Frais Bureau',
                        'entity' => 'Charges Fixes',
                        'bank' => $c->rib ?: 'Prélèvement Auto',
                        'reference' => $c->rib,
                        'method' => 'Prélèvement',
                        'project' => $c->terrain?->nom_projet ?? 'Global',
                        'notes' => 'Charges mensuelles'
                    ]);
                }
            });

            // 6. Purchase Invoices (OUT) - ENGAGEMENT
            $piQuery = PurchaseInvoice::with(['supplier', 'terrain']);
            if ($startDate) $piQuery->whereDate('created_at', '>=', $startDate);
            if ($endDate) $piQuery->whereDate('created_at', '<=', $endDate);
            if ($terrainId) $piQuery->where('terrain_id', $terrainId);

            $piQuery->get()->each(function($pi) use ($transactions) {
                $transactions->push([
                    'id' => 'INV-' . $pi->id,
                    'date' => Carbon::parse($pi->created_at)->toDateString(),
                    'amount' => (float)$pi->total_ttc,
                    'flow' => 'OUT',
                    'is_cash' => false,
                    'category' => 'Achat (Matériaux)',
                    'entity' => $pi->supplier?->nom_societe ?? 'Fournisseur Inconnu',
                    'bank' => 'Engagement Interne',
                    'reference' => $pi->invoice_no,
                    'method' => 'Facturation',
                    'project' => $pi->terrain?->nom_projet ?? 'Global',
                    'notes' => 'Facture fournisseur reçue'
                ]);
            });

            // 7. Worker Missions (OUT) - ENGAGEMENT
            $missionQuery = OuvrierMission::with(['ouvrier', 'terrain']);
            if ($startDate) $missionQuery->whereDate('end_date', '>=', $startDate);
            if ($endDate) $missionQuery->whereDate('end_date', '<=', $endDate);
            if ($terrainId) $missionQuery->where('terrain_id', $terrainId);

            $missionQuery->get()->each(function($m) use ($transactions) {
                $transactions->push([
                    'id' => 'MSN-' . $m->id,
                    'date' => Carbon::parse($m->end_date ?: $m->created_at)->toDateString(),
                    'amount' => (float)$m->total_amount,
                    'flow' => 'OUT',
                    'is_cash' => false,
                    'category' => 'Mission Ouvrier',
                    'entity' => $m->ouvrier?->name ?? 'Ouvrier Inconnu',
                    'bank' => 'Engagement Interne',
                    'reference' => $m->status,
                    'method' => 'Accord/Prestation',
                    'project' => $m->terrain?->nom_projet ?? 'Global',
                    'notes' => ($m->description ?: 'Prestation') . " (" . $m->quantity . " x " . $m->unit_price . " DH)"
                ]);
            });

            // 8. Service Provider Invoices (OUT) - ENGAGEMENT
            $spQuery = \App\Models\ProviderInvoice::with(['serviceProvider', 'terrain']);
            if ($startDate) $spQuery->whereDate('invoice_date', '>=', $startDate);
            if ($endDate) $spQuery->whereDate('invoice_date', '<=', $endDate);
            if ($terrainId) $spQuery->where('terrain_id', $terrainId);

            $spQuery->get()->each(function($spi) use ($transactions) {
                $transactions->push([
                    'id' => 'SINV-' . $spi->id,
                    'date' => \Carbon\Carbon::parse($spi->invoice_date)->toDateString(),
                    'amount' => (float)$spi->amount,
                    'flow' => 'OUT',
                    'is_cash' => false,
                    'category' => 'Abonnement / Service',
                    'entity' => $spi->serviceProvider?->nom ?? 'Société Inconnue',
                    'bank' => 'Engagement (Service)',
                    'reference' => $spi->reference,
                    'method' => 'Facturation',
                    'project' => $spi->terrain?->nom_projet ?? 'Global',
                    'notes' => $spi->notes ?: ($spi->serviceProvider?->categorie ?? 'Service')
                ]);
            });
        }

        return response()->json($transactions->sortByDesc('date')->values());
    }
}
