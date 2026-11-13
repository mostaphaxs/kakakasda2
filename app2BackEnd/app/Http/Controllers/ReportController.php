<?php

namespace App\Http\Controllers;

use App\Support\PaymentMath;

use App\Models\Bien;
use App\Models\Charge;
use App\Models\Client;
use App\Models\ContractorPayment;
use App\Models\Echeance;
use App\Models\GeneralWork;
use App\Models\OuvrierMission;
use App\Models\payments;
use App\Models\PurchaseInvoice;
use App\Models\Terrain;
use App\Services\EcheanceAllocator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Owner reports: profit per project and the monthly summary.
 * Figures reuse StatsController so they match the dashboard, plus worker
 * missions (ouvriers), which the dashboard does not count yet.
 */
class ReportController extends Controller
{
    private const BUREAU_SQL = 'SUM(loyer_bureau + fournitures_bureau + employes_bureau + impots + gasoil)';

    /** Profit per project. */
    public function profit(): JsonResponse
    {
        return response()->json($this->projects());
    }

    /** Monthly summary. ?month=YYYY-MM (default: current month). */
    public function monthly(Request $request): JsonResponse
    {
        $month = $request->input('month', now()->format('Y-m'));
        $start = Carbon::createFromFormat('Y-m-d', $month . '-01')->startOfDay();
        $end = $start->copy()->endOfMonth();
        $prevStart = $start->copy()->subMonthNoOverflow()->startOfMonth();
        $prevEnd = $prevStart->copy()->endOfMonth();

        $collected = fn ($a, $b) => (float) (payments::whereBetween('payment_date', [$a->toDateString(), $b->toDateString()])
            ->selectRaw(PaymentMath::sqlSum() . ' as t')->value('t') ?? 0);

        $byMethod = payments::whereBetween('payment_date', [$start->toDateString(), $end->toDateString()])
            ->selectRaw('method, COUNT(*) as n, ' . PaymentMath::sqlSum() . ' as total')
            ->groupBy('method')->get()
            ->map(fn ($r) => ['method' => $r->method ?: 'Autre', 'count' => (int) $r->n, 'total' => (float) $r->total])->values();

        $expenses = fn ($a, $b) => $this->expenses($a, $b);
        $exp = $expenses($start, $end);
        $prevExp = $expenses($prevStart, $prevEnd);

        // New clients / reservations this month
        $newClients = Client::with('biens:id,type_bien,num_appartement,nom')
            ->where(function ($q) use ($start, $end) {
                $q->whereBetween('date_reservation', [$start->toDateString(), $end->toDateString()])
                  ->orWhere(fn ($q2) => $q2->whereNull('date_reservation')->whereBetween('created_at', [$start, $end]));
            })->get()
            ->map(fn ($c) => [
                'name' => Str::title(trim("{$c->prenom} {$c->nom}")),
                'bien' => $c->biens->map(fn ($b) => trim("{$b->type_bien} " . ($b->num_appartement ?: $b->nom)))->implode(', '),
                'statut_choix' => $c->statut_choix,
            ])->values();

        // Late payments (situation today)
        $rows = EcheanceAllocator::enrich(Echeance::with('client:id,nom,prenom,tel')->get());
        $late = $rows->where('status', 'en_retard');
        $topLate = $late->groupBy('client_id')->map(fn ($g) => [
            'name' => Str::title(trim(($g->first()['client']['prenom'] ?? '') . ' ' . ($g->first()['client']['nom'] ?? ''))),
            'count' => $g->count(),
            'amount' => round($g->sum('remaining'), 2),
            'max_days' => $g->max('days_late'),
        ])->sortByDesc('amount')->take(5)->values();

        // Cheques
        $cheques = payments::where('method', 'Chèque')->get();
        $chq = fn ($s) => $cheques->filter(fn ($p) => ($p->cheque_status ?: 'recu') === $s);
        $rejectedThisMonth = $cheques->filter(fn ($p) => $p->cheque_status === 'rejete' && $p->cheque_rejected_at
            && Carbon::parse($p->getRawOriginal('cheque_rejected_at'))->between($start, $end));

        return response()->json([
            'month' => $month,
            'label' => Str::ucfirst($start->translatedFormat('F Y')),
            'collected' => round($collected($start, $end), 2),
            'collected_prev' => round($collected($prevStart, $prevEnd), 2),
            'collected_by_method' => $byMethod,
            'expenses' => $exp,
            'expenses_total' => round(array_sum($exp), 2),
            'expenses_prev_total' => round(array_sum($prevExp), 2),
            'new_clients' => $newClients,
            'units' => Bien::selectRaw('statut, COUNT(*) as n')->groupBy('statut')->pluck('n', 'statut'),
            'late' => [
                'count' => $late->count(),
                'clients' => $late->pluck('client_id')->unique()->count(),
                'amount' => round($late->sum('remaining'), 2),
                'top' => $topLate,
            ],
            'cheques' => [
                'to_deposit' => ['count' => $chq('recu')->count(), 'amount' => round($chq('recu')->sum('amount'), 2)],
                'deposited' => ['count' => $chq('depose')->count(), 'amount' => round($chq('depose')->sum('amount'), 2)],
                'rejected_month' => ['count' => $rejectedThisMonth->count(), 'amount' => round($rejectedThisMonth->sum('amount'), 2)],
            ],
            'projects' => $this->projects()['projects'],
        ]);
    }

    /** Expenses between two dates, by category (same sources as the dashboard + worker missions). */
    private function expenses(Carbon $a, Carbon $b): array
    {
        $d1 = $a->toDateString();
        $d2 = $b->toDateString();
        return [
            'bureau' => (float) (Charge::whereBetween('periode', [$d1, $d2])->selectRaw(self::BUREAU_SQL . ' as t')->value('t') ?? 0),
            'construction' => (float) ContractorPayment::where('payable_type', 'App\Models\Contractor')->whereBetween('payment_date', [$d1, $d2])->sum('amount'),
            'intervenants' => (float) ContractorPayment::where('payable_type', 'App\Models\Intervenant')->whereBetween('payment_date', [$d1, $d2])->sum('amount'),
            'achats' => (float) PurchaseInvoice::whereBetween('created_at', [$a->copy()->startOfDay(), $b->copy()->endOfDay()])->sum('total_ttc'),
            'travaux' => (float) GeneralWork::whereBetween('payment_date', [$d1, $d2])->sum('total_amount'),
            'ouvriers' => (float) OuvrierMission::whereBetween('start_date', [$d1, $d2])->sum('total_amount'),
        ];
    }

    /** Per-project revenue, costs, profit, units and progress. */
    private function projects(): array
    {
        $stats = app(StatsController::class)->index()->getData(true);
        $terrains = Terrain::all()->keyBy('id');
        $ouvriers = OuvrierMission::whereNotNull('terrain_id')->selectRaw('terrain_id, SUM(total_amount) as t')
            ->groupBy('terrain_id')->pluck('t', 'terrain_id');
        $biens = Bien::with('suiviFinition')->get()->groupBy('terrain_id');

        $projects = collect($stats['terrains_stats'])->map(function ($t) use ($terrains, $ouvriers, $biens) {
            $d = $t['charges_details'];
            $costs = [
                'terrain' => (float) $t['investissement'],
                'construction' => (float) $d['contractors'],
                'intervenants' => (float) $d['intervenants'],
                'achats' => (float) $d['achats'],
                'travaux' => (float) $d['general_works'],
                'ouvriers' => (float) ($ouvriers[$t['id']] ?? 0),
                'bureau' => (float) $d['bureau'],
            ];
            $totalCost = array_sum($costs);
            $revenue = (float) $t['chiffre_affaires'];
            $tb = $biens->get($t['id'], collect());
            $status = $tb->groupBy('statut')->map->count();
            $terrain = $terrains->get($t['id']);

            return [
                'id' => $t['id'],
                'name' => $terrain?->nom_projet ?: ($terrain?->nom_terrain ?: "Projet #{$t['id']}"),
                'revenue' => $revenue,
                'collected' => (float) $t['encaissements'],
                'remaining' => (float) $t['reste_a_recouvrer'],
                'costs' => $costs,
                'total_cost' => round($totalCost, 2),
                'profit' => round($revenue - $totalCost, 2),
                'margin' => $revenue > 0 ? round((($revenue - $totalCost) / $revenue) * 100, 1) : null,
                'cash_result' => round((float) $t['encaissements'] - $totalCost, 2),
                'units' => [
                    'total' => $tb->count(),
                    'libre' => (int) ($status['Libre'] ?? 0),
                    'reserve' => (int) ($status['Reserve'] ?? 0),
                    'vendu' => (int) ($status['Vendu'] ?? 0),
                ],
                'progress' => [
                    'gros_oeuvre' => $tb->count() ? (int) round($tb->avg('gros_oeuvre_pourcentage')) : 0,
                    'finition' => $tb->count() ? (int) round($tb->avg(fn ($b) => $b->finition_pourcentage)) : 0,
                ],
            ];
        })->values();

        // Costs recorded without a project (overheads)
        $gd = $stats['charges_details'];
        $assigned = fn ($k) => $projects->sum(fn ($p) => $p['costs'][$k]);
        $unassigned = [
            'bureau' => max(0, (float) $gd['bureau'] - $assigned('bureau')),
            'achats' => max(0, (float) $gd['achats'] - $assigned('achats')),
            'travaux' => max(0, (float) $gd['general_works'] - $assigned('travaux')),
            'construction' => max(0, (float) $gd['contractors'] - $assigned('construction')),
            'intervenants' => max(0, (float) $gd['intervenants'] - $assigned('intervenants')),
            'ouvriers' => (float) OuvrierMission::whereNull('terrain_id')->sum('total_amount'),
        ];

        return [
            'projects' => $projects,
            'unassigned' => $unassigned,
            'totals' => [
                'revenue' => round($projects->sum('revenue'), 2),
                'total_cost' => round($projects->sum('total_cost') + array_sum($unassigned), 2),
                'profit' => round($projects->sum('revenue') - $projects->sum('total_cost') - array_sum($unassigned), 2),
                'collected' => round($projects->sum('collected'), 2),
            ],
        ];
    }
}
