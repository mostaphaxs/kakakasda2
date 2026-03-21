<?php

namespace App\Http\Controllers;

use App\Models\Terrain;
use App\Models\payments;
use App\Models\Client;
use App\Models\Charge;
use App\Models\ContractorPayment;
use App\Models\Bien;
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

        // 7. Total Global (Investissement + All Charges)
        $totalCharges = $chargesBureau + $chargesIntervenants + $chargesContractors;
        $coutGlobal = $totalInvested + $totalCharges;

        // 8. Detail: Property Status
        $biensStatus = Bien::select('statut', \DB::raw('count(*) as count'))
            ->groupBy('statut')
            ->pluck('count', 'statut')
            ->toArray();

        // 9. Detail: Recent Clients
        $recentClients = Client::with('bien')
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // 10. Detail: Recent Payments
        $recentPayments = payments::with(['client.bien'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();

        // 11. Detail: Per-Terrain Stats
        $terrains = Terrain::all();
        $terrainsStats = [];
        $globalChiffreAffaires = 0;
        $globalBiensTypes = [];

        foreach ($terrains as $terrain) {
            $tInvested = $terrain->total ?? 0;

            $tEncaissements = payments::whereIn('bien_id', function ($query) use ($terrain) {
                $query->select('id')->from('biens')->where('terrain_id', $terrain->id);
            })->selectRaw('SUM(CAST(amount AS DECIMAL(15,2)) - CAST(COALESCE(refund_amount, 0) AS DECIMAL(15,2))) as net_total')
              ->value('net_total') ?? 0;

            $tReservations = Client::whereIn('bien_id', function ($query) use ($terrain) {
                $query->select('id')->from('biens')->where('terrain_id', $terrain->id);
            })->count();

            $tChargesBureau = Charge::where('terrain_id', $terrain->id)->selectRaw('
                SUM(frais_tel + internet + loyer_bureau + fournitures_bureau + employes_bureau + impots + gasoil) as total
            ')->value('total') ?? 0;

            $tChargesIntervenants = ContractorPayment::where('payable_type', 'App\Models\Intervenant')
                ->whereIn('payable_id', function ($query) use ($terrain) {
                    $query->select('id')->from('intervenants')->where('terrain_id', $terrain->id);
                })->sum('amount');

            $tChargesContractors = ContractorPayment::where('payable_type', 'App\Models\Contractor')
                ->whereIn('payable_id', function ($query) use ($terrain) {
                    $query->select('id')->from('contractors')->where('terrain_id', $terrain->id);
                })->sum('amount');

            $tTotalCharges = $tChargesBureau + $tChargesIntervenants + $tChargesContractors;
            $tCoutGlobal = $tInvested + $tTotalCharges;

            $tBiensStatus = Bien::where('terrain_id', $terrain->id)
                ->select('statut', \DB::raw('count(*) as count'))
                ->groupBy('statut')
                ->pluck('count', 'statut')
                ->toArray();

            // Chiffre d'Affaires & Profitability
            $tChiffreAffaires = Bien::join('clients', 'biens.id', '=', 'clients.bien_id')
                ->where('biens.terrain_id', $terrain->id)
                ->selectRaw('SUM(CASE WHEN clients.avec_finition = 1 THEN biens.prix_global_finition ELSE biens.prix_global_non_finition END) as total_ca')
                ->value('total_ca') ?? 0;

            $tResteARecouvrer = max(0, $tChiffreAffaires - $tEncaissements);
            $tBeneficeEstime = $tChiffreAffaires - $tCoutGlobal;

            $tBiensTypes = Bien::where('terrain_id', $terrain->id)
                ->select('type_bien', \DB::raw('count(*) as count'))
                ->groupBy('type_bien')
                ->pluck('count', 'type_bien')
                ->toArray();

            $globalChiffreAffaires += $tChiffreAffaires;
            foreach ($tBiensTypes as $type => $count) {
                if (!isset($globalBiensTypes[$type])) {
                    $globalBiensTypes[$type] = 0;
                }
                $globalBiensTypes[$type] += $count;
            }

            $terrainsStats[] = [
                'id' => $terrain->id,
                'nom_terrain' => $terrain->nom_terrain,
                'investissement' => (float) $tInvested,
                'encaissements' => (float) $tEncaissements,
                'reservations' => $tReservations,
                'charges' => (float) $tTotalCharges,
                'charges_details' => [
                    'bureau' => (float) $tChargesBureau,
                    'intervenants' => (float) $tChargesIntervenants,
                    'contractors' => (float) $tChargesContractors,
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
            ],
            'cout_global' => (float) $coutGlobal,
            'chiffre_affaires' => (float) $globalChiffreAffaires,
            'reste_a_recouvrer' => (float) $globalResteARecouvrer,
            'benefice_estime' => (float) $globalBeneficeEstime,
            'biens_status' => $biensStatus,
            'biens_types' => $globalBiensTypes,
            'recent_clients' => $recentClients,
            'recent_payments' => $recentPayments,
            'terrains_stats' => $terrainsStats,
        ]);
    }
}
