<?php

namespace App\Http\Controllers;

use App\Models\payments;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Client cheques: list + life cycle (recu → depose → encaisse | rejete).
 */
class ChequeController extends Controller
{
    public const STATUSES = ['recu', 'depose', 'encaisse', 'rejete'];

    public function index(): JsonResponse
    {
        $today = Carbon::today();
        $rows = payments::with(['client:id,nom,prenom,tel,tel_2,cin', 'bien:id,nom,num_appartement,type_bien'])
            ->where('method', 'Chèque')
            ->orderBy('payment_date')
            ->get()
            ->map(function ($p) use ($today) {
                $status = $p->cheque_status ?: 'recu';
                $date = Carbon::parse($p->getRawOriginal('payment_date'));
                return [
                    'id' => $p->id,
                    'client_id' => $p->client_id,
                    'client' => $p->client,
                    'bien' => $p->bien,
                    'amount' => (float) $p->amount,
                    'cheque_date' => $date->toDateString(),
                    'reference_no' => $p->reference_no,
                    'bank_name' => $p->bank_name,
                    'type' => $p->type,
                    'receipt_path' => $p->receipt_path,
                    'cheque_status' => $status,
                    'deposited_at' => $p->getRawOriginal('cheque_deposited_at'),
                    'cashed_at' => $p->getRawOriginal('cheque_cashed_at'),
                    'rejected_at' => $p->getRawOriginal('cheque_rejected_at'),
                    'reject_reason' => $p->cheque_reject_reason,
                    // to deposit and the cheque date has arrived
                    'due' => $status === 'recu' && $date->lte($today),
                    // deposited more than 7 days ago and still not cashed
                    'stale' => $status === 'depose' && $p->cheque_deposited_at
                        && Carbon::parse($p->getRawOriginal('cheque_deposited_at'))->lt($today->copy()->subDays(7)),
                ];
            });

        $sum = fn ($s) => [
            'count' => $rows->where('cheque_status', $s)->count(),
            'amount' => round($rows->where('cheque_status', $s)->sum('amount'), 2),
        ];

        return response()->json([
            'data' => $rows->values(),
            'summary' => [
                'recu' => $sum('recu'),
                'depose' => $sum('depose'),
                'encaisse' => $sum('encaisse'),
                'rejete' => $sum('rejete'),
                'due' => ['count' => $rows->where('due', true)->count(), 'amount' => round($rows->where('due', true)->sum('amount'), 2)],
            ],
        ]);
    }

    /** Move a cheque to another stage. Rejecting cancels the payment; leaving "rejeté" restores it. */
    public function updateStatus(Request $request, payments $payment): JsonResponse
    {
        if ($payment->method !== 'Chèque') {
            return response()->json(['message' => "Ce paiement n'est pas un chèque."], 422);
        }
        $v = $request->validate([
            'status' => 'required|in:' . implode(',', self::STATUSES),
            'date' => 'nullable|date',
            'reason' => 'nullable|string|max:255',
        ]);
        $date = $v['date'] ?? Carbon::today()->toDateString();
        $wasRejected = ($payment->cheque_status === 'rejete');

        $data = ['cheque_status' => $v['status']];
        switch ($v['status']) {
            case 'recu':
                $data += ['cheque_deposited_at' => null, 'cheque_cashed_at' => null, 'cheque_rejected_at' => null, 'cheque_reject_reason' => null];
                break;
            case 'depose':
                $data += ['cheque_deposited_at' => $date, 'cheque_cashed_at' => null, 'cheque_rejected_at' => null, 'cheque_reject_reason' => null];
                break;
            case 'encaisse':
                $data += ['cheque_cashed_at' => $date, 'cheque_rejected_at' => null, 'cheque_reject_reason' => null];
                if (!$payment->cheque_deposited_at) {
                    $data['cheque_deposited_at'] = $date;
                }
                break;
            case 'rejete':
                $data += [
                    'cheque_rejected_at' => $date,
                    'cheque_reject_reason' => $v['reason'] ?? null,
                    'cheque_cashed_at' => null,
                    // the money never arrived: neutralise the payment everywhere
                    'status' => 'Cancelled',
                    'refund_amount' => $payment->amount,
                ];
                break;
        }
        if ($wasRejected && $v['status'] !== 'rejete') {
            // cheque presented again: the payment counts again
            $data += ['status' => 'Active', 'refund_amount' => 0];
        }

        $payment->update($data);

        $labels = ['recu' => 'à déposer', 'depose' => 'déposé', 'encaisse' => 'encaissé', 'rejete' => 'rejeté'];
        return response()->json([
            'message' => 'Chèque marqué ' . $labels[$v['status']] . '.',
            'payment' => $payment->fresh(),
        ]);
    }
}
