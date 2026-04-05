<?php

namespace App\Http\Controllers;

use App\Models\Terrain;
use App\Models\payments;
use App\Models\Client;
use App\Models\Charge;
use App\Models\ContractorPayment;
use App\Models\Bien;
use App\Models\PurchaseInvoice;
use App\Models\GeneralWork;
use Illuminate\Http\JsonResponse;

class StatsController extends Controller
{
    /**
     * Get global stats for the dashboard.
     */
    public function index(): JsonResponse
    {
        // 1. Total Investissement (Sum of all Terrain totals)
        $totalInvested = Terrain::sum('total');

        // 2. Total Encaissements (Sum of payments minus refunds)
        $totalEncaissements = payments::selectRaw('SUM(CAST(amount AS DECIMAL(15,2)) - CAST(COALESCE(refund_amount, 0) AS DECIMAL(15,2))) as net_total')
            ->value('net_total') ?? 0;

        // 3. Total Réservations (Count of clients)
        $totalReservations = Client::count();

        // 4. Charges Bureau (Sum of specific charge columns)
        $chargesBureau = Charge::selectRaw('
            SUM(frais_tel + internet + loyer_bureau + fournitures_bureau + employes_bureau + impots + gasoil) as total
        ')->value('total') ?? 0;

        // 5. Charges Intervenants (Sum of payments to Intervenants)
        $chargesIntervenants = ContractorPayment::where('payable_type', 'App\Models\Intervenant')
            ->sum('amount');

        // 6. Charges Contractors (Sum of payments to Contractors)
        $chargesContractors = ContractorPayment::where('payable_type', 'App\Models\Contractor')
            ->sum('amount');
            
        // 6b. Achats (Sum of Purchase Invoices)
        $totalAchats = PurchaseInvoice::sum('total_ttc');

        // 6c. General Works (Sum of General Work totals)
        $totalGeneralWorks = GeneralWork::sum('total_amount');

        // 7. Total Global (Investissement + All Charges)
        $totalCharges = $chargesBureau + $chargesIntervenants + $chargesContractors + $totalAchats + $totalGeneralWorks;
        $coutGlobal = $totalInvested + $totalCharges;

        // 8. Detail: Property Status
        $biensStatus = Bien::select('statut', \DB::raw('count(*) as count'))
            ->groupBy('statut')
            ->pluck('count', 'statut')
            ->toArray();

        // 9. Detail: Recent Clients
        $recentClients = Client::with('biens')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        $recentPayments = payments::with(['client.biens'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();
            
        // 10b. Detail: Recent Purchases
        $recentPurchases = PurchaseInvoice::with('supplier')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // 11. Detail: Per-Terrain Stats
        $terrains = Terrain::all();
        $terrainsStats = [];
        $globalChiffreAffaires = 0;
        $globalBiensTypes = [];

        // Pre-fetch all necessary data in bulk to avoid N+1 queries
        $allBiens = Bien::with('clients')->get()->groupBy('terrain_id');
        
        $allPaymentsByTerrain = payments::join('biens', 'payments.bien_id', '=', 'biens.id')
            ->selectRaw('biens.terrain_id, SUM(CAST(payments.amount AS DECIMAL(15,2)) - CAST(COALESCE(payments.refund_amount, 0) AS DECIMAL(15,2))) as net_total')
            ->groupBy('biens.terrain_id')
            ->pluck('net_total', 'terrain_id');

        $allReservationsByTerrain = \DB::table('bien_client')
            ->join('biens', 'bien_client.bien_id', '=', 'biens.id')
            ->selectRaw('biens.terrain_id, count(distinct bien_client.client_id) as count')
            ->groupBy('biens.terrain_id')
            ->pluck('count', 'terrain_id');

        $allChargesBureauByTerrain = Charge::selectRaw('
                terrain_id,
                SUM(frais_tel + internet + loyer_bureau + fournitures_bureau + employes_bureau + impots + gasoil) as total
            ')
            ->groupBy('terrain_id')
            ->pluck('total', 'terrain_id');

        $allChargesIntervenantsByTerrain = ContractorPayment::where('payable_type', 'App\Models\Intervenant')
            ->join('intervenants', 'contractor_payments.payable_id', '=', 'intervenants.id')
            ->selectRaw('intervenants.terrain_id, SUM(contractor_payments.amount) as total')
            ->groupBy('intervenants.terrain_id')
            ->pluck('total', 'terrain_id');

        $allChargesContractorsByTerrain = ContractorPayment::where('payable_type', 'App\Models\Contractor')
            ->join('contractors', 'contractor_payments.payable_id', '=', 'contractors.id')
            ->selectRaw('contractors.terrain_id, SUM(contractor_payments.amount) as total')
            ->groupBy('contractors.terrain_id')
            ->pluck('total', 'terrain_id');

        $allAchatsByTerrain = PurchaseInvoice::selectRaw('terrain_id, SUM(total_ttc) as total')
            ->whereNotNull('terrain_id')
            ->groupBy('terrain_id')
            ->pluck('total', 'terrain_id');

        $allGeneralWorksByTerrain = GeneralWork::selectRaw('terrain_id, SUM(total_amount) as total')
            ->whereNotNull('terrain_id')
            ->groupBy('terrain_id')
            ->pluck('total', 'terrain_id');

        foreach ($terrains as $terrain) {
            $tInvested = $terrain->total ?? 0;
            $tId = $terrain->id;

            $tEncaissements = $allPaymentsByTerrain->get($tId, 0);
            $tReservations = $allReservationsByTerrain->get($tId, 0);
            $tChargesBureau = $allChargesBureauByTerrain->get($tId, 0);
            $tChargesIntervenants = $allChargesIntervenantsByTerrain->get($tId, 0);
            $tChargesContractors = $allChargesContractorsByTerrain->get($tId, 0);
            $tTotalAchats = $allAchatsByTerrain->get($tId, 0);
            $tTotalGeneralWorks = $allGeneralWorksByTerrain->get($tId, 0);

            $tTotalCharges = $tChargesBureau + $tChargesIntervenants + $tChargesContractors + $tTotalAchats + $tTotalGeneralWorks;
            $tCoutGlobal = $tInvested + $tTotalCharges;

            // Biens details for this terrain
            $tBiens = $allBiens->get($tId, collect());
            
            $tBiensStatus = $tBiens->groupBy('statut')->map->count()->toArray();
            $tBiensTypes = $tBiens->groupBy('type_bien')->map->count()->toArray();

            // Chiffre d'Affaires calculation (Property + Annexes)
            $tChiffreAffaires = $tBiens->filter(fn($b) => $b->clients->isNotEmpty())
                ->sum(function($b) {
                    $client = $b->clients->first();
                    $basePrice = $client->avec_finition ? $b->prix_global_finition : $b->prix_global_non_finition;
                    $annexPrice = \App\Models\annex_units::where('bien_id', $b->id)->sum('prix');
                    return $basePrice + $annexPrice;
                });

            $tResteARecouvrer = max(0, $tChiffreAffaires - $tEncaissements);
            $tBeneficeEstime = $tChiffreAffaires - $tCoutGlobal;

            $globalChiffreAffaires += $tChiffreAffaires;
            foreach ($tBiensTypes as $type => $count) {
                if (!isset($globalBiensTypes[$type])) {
                    $globalBiensTypes[$type] = 0;
                }
                $globalBiensTypes[$type] += $count;
            }

            $terrainsStats[] = [
                'id' => $tId,
                'nom_terrain' => $terrain->nom_terrain,
                'investissement' => (float) $tInvested,
                'encaissements' => (float) $tEncaissements,
                'reservations' => $tReservations,
                'charges' => (float) $tTotalCharges,
                'charges_details' => [
                    'bureau' => (float) $tChargesBureau,
                    'intervenants' => (float) $tChargesIntervenants,
                    'contractors' => (float) $tChargesContractors,
                    'achats' => (float) $tTotalAchats,
                    'general_works' => (float) $tTotalGeneralWorks,
                ],
                'cout_global' => (float) $tCoutGlobal,
                'biens_status' => $tBiensStatus,
                'chiffre_affaires' => (float) $tChiffreAffaires,
                'reste_a_recouvrer' => (float) $tResteARecouvrer,
                'benefice_estime' => (float) $tBeneficeEstime,
                'biens_types' => $tBiensTypes,
            ];
        }

        $globalResteARecouvrer = max(0, $globalChiffreAffaires - $totalEncaissements);
        $globalBeneficeEstime = $globalChiffreAffaires - $coutGlobal;

        return response()->json([
            'investissement' => (float) $totalInvested,
            'encaissements' => (float) $totalEncaissements,
            'reservations' => $totalReservations,
            'charges' => (float) $totalCharges,
            'charges_details' => [
                'bureau' => (float) $chargesBureau,
                'intervenants' => (float) $chargesIntervenants,
                'contractors' => (float) $chargesContractors,
                'achats' => (float) $totalAchats,
                'general_works' => (float) $totalGeneralWorks,
            ],
            'cout_global' => (float) $coutGlobal,
            'chiffre_affaires' => (float) $globalChiffreAffaires,
            'reste_a_recouvrer' => (float) $globalResteARecouvrer,
            'benefice_estime' => (float) $globalBeneficeEstime,
            'biens_status' => $biensStatus,
            'biens_types' => $globalBiensTypes,
            'recent_clients' => $recentClients,
            'recent_payments' => $recentPayments,
            'recent_purchases' => $recentPurchases,
            'terrains_stats' => $terrainsStats,
        ]);
    }
}
