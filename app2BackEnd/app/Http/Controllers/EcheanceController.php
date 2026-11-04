<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Echeance;
use App\Services\EcheanceAllocator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EcheanceController extends Controller
{
    /**
     * List instalments with derived status + a summary.
     * Query: status (en_retard|a_venir|partielle|payee), client_id
     */
    public function index(Request $request): JsonResponse
    {
        $q = Echeance::with(['client:id,nom,prenom,tel,tel_2,cin', 'bien:id,nom,num_appartement,type_bien']);
        if ($request->filled('client_id')) {
            $q->where('client_id', $request->integer('client_id'));
        }
        $rows = EcheanceAllocator::enrich($q->get());

        $today = Carbon::today();
        $in7 = $today->copy()->addDays(7);
        $overdue = $rows->where('status', 'en_retard');
        $upcoming = $rows->filter(fn ($r) => $r['status'] !== 'payee' && $r['status'] !== 'en_retard'
            && Carbon::parse($r['due_date'])->between($today, $in7));

        $summary = [
            'overdue_count' => $overdue->count(),
            'overdue_amount' => round($overdue->sum('remaining'), 2),
            'overdue_clients' => $overdue->pluck('client_id')->unique()->count(),
            'upcoming_count' => $upcoming->count(),
            'upcoming_amount' => round($upcoming->sum('remaining'), 2),
            'planned_total' => round($rows->sum('amount'), 2),
            'remaining_total' => round($rows->sum('remaining'), 2),
        ];

        if ($request->filled('status')) {
            $rows = $rows->where('status', $request->input('status'))->values();
        }

        return response()->json(['data' => $rows, 'summary' => $summary]);
    }

    /** Add a single instalment. */
    public function store(Request $request): JsonResponse
    {
        $v = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'bien_id' => 'nullable|exists:biens,id',
            'due_date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'label' => 'nullable|string|max:120',
            'notes' => 'nullable|string',
        ]);
        $existing = Echeance::where('client_id', $v['client_id'])->min('paid_before');
        $v['paid_before'] = $existing ?? EcheanceAllocator::paidTotal((int) $v['client_id']);

        return response()->json(Echeance::create($v), 201);
    }

    /** Generate a full plan: N instalments every `interval_months`, replacing the client's current plan. */
    public function plan(Request $request): JsonResponse
    {
        $v = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'bien_id' => 'nullable|exists:biens,id',
            'total' => 'required|numeric|min:1',
            'count' => 'required|integer|min:1|max:120',
            'start_date' => 'required|date',
            'interval_months' => 'required|integer|min:1|max:12',
        ]);

        $rows = DB::transaction(function () use ($v) {
            Echeance::where('client_id', $v['client_id'])->delete();
            $paidBefore = EcheanceAllocator::paidTotal((int) $v['client_id']);

            $count = (int) $v['count'];
            $base = floor(((float) $v['total'] / $count) * 100) / 100;
            $start = Carbon::parse($v['start_date']);
            $created = [];
            for ($i = 0; $i < $count; $i++) {
                $amount = $i === $count - 1 ? round((float) $v['total'] - $base * ($count - 1), 2) : $base;
                $created[] = Echeance::create([
                    'client_id' => $v['client_id'],
                    'bien_id' => $v['bien_id'] ?? null,
                    'due_date' => $start->copy()->addMonthsNoOverflow($i * (int) $v['interval_months']),
                    'amount' => $amount,
                    'label' => 'Échéance ' . ($i + 1) . '/' . $count,
                    'paid_before' => $paidBefore,
                ]);
            }
            return $created;
        });

        return response()->json(['message' => count($rows) . ' échéances créées.', 'data' => $rows], 201);
    }

    public function update(Request $request, Echeance $echeance): JsonResponse
    {
        $v = $request->validate([
            'due_date' => 'sometimes|date',
            'amount' => 'sometimes|numeric|min:0.01',
            'label' => 'nullable|string|max:120',
            'notes' => 'nullable|string',
        ]);
        $echeance->update($v);
        return response()->json($echeance);
    }

    public function destroy(Echeance $echeance): JsonResponse
    {
        $echeance->delete();
        return response()->json(['message' => 'Échéance supprimée.']);
    }

    /** Everything needed for a client statement (relevé de compte). */
    public function statement(Client $client): JsonResponse
    {
        $client->load('biens.terrain');
        $payments = $client->payments()->orderBy('payment_date')->get();
        $valid = $payments->filter(fn ($p) => $p->status !== 'Cancelled');
        // Same rule as StatsController: finition price or not, plus annexes
        $prix = (float) $client->biens->sum(function ($b) use ($client) {
            $base = $client->avec_finition ? $b->prix_global_finition : $b->prix_global_non_finition;
            return (float) $base + (float) \App\Models\annex_units::where('bien_id', $b->id)->sum('prix');
        });
        $paid = (float) $valid->sum('amount');

        return response()->json([
            'client' => $client,
            'payments' => $payments->values(),
            'echeances' => EcheanceAllocator::enrich(Echeance::where('client_id', $client->id)->get()),
            'totals' => [
                'prix' => $prix,
                'paid' => $paid,
                'remaining' => max(0, $prix - $paid),
            ],
        ]);
    }
}
