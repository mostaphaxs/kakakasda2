<?php

namespace App\Services;

use App\Models\Echeance;
use App\Models\payments;
use App\Support\PaymentMath;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Derives the status of each instalment from the client's real payments.
 *
 * Payments (excluding cancelled ones) are allocated oldest-due first. Money the
 * client had already paid when the plan was created (paid_before) is not
 * counted against the plan.
 */
class EcheanceAllocator
{
    public static function paidTotal(int $clientId): float
    {
        // same rule as every other screen (see PaymentMath)
        return (float) (payments::where('client_id', $clientId)->selectRaw(PaymentMath::sqlSum() . ' as t')->value('t') ?? 0);
    }

    /**
     * @param  Collection<Echeance>  $rows  any set of échéances (any clients)
     * @return Collection<array>  rows enriched with paid/remaining/status/days_late
     */
    public static function enrich(Collection $rows): Collection
    {
        $today = Carbon::today();
        $out = collect();

        foreach ($rows->groupBy('client_id') as $clientId => $clientRows) {
            // Allocation must consider ALL of the client's instalments, not only the filtered ones.
            $all = Echeance::where('client_id', $clientId)->orderBy('due_date')->orderBy('id')->get();
            $baseline = (float) ($all->min('paid_before') ?? 0);

            $payments = payments::where('client_id', $clientId)
                ->orderBy('payment_date')->orderBy('id')
                ->get();
            // Net money actually counted for the plan (refunds, commissions and
            // "Reprise" included); positive payments fill instalments oldest-first
            // until this pool is used up.
            $pool = max(0, array_sum($payments->map(fn ($p) => PaymentMath::net($p))->all()) - $baseline);

            // Walk payments oldest first: skip what was paid before the plan, then fill instalments in order.
            $covered = array_fill_keys($all->pluck('id')->all(), 0.0);
            $allocations = array_fill_keys($all->pluck('id')->all(), []);
            $idx = 0;
            $list = $all->values();
            $skipBefore = $baseline;
            foreach ($payments as $p) {
                $left = PaymentMath::net($p);
                if ($left <= 0) continue;
                $skip = min($skipBefore, $left);
                $skipBefore -= $skip;
                $left = min($left - $skip, $pool);
                $pool -= $left;
                while ($left > 0.009 && $idx < $list->count()) {
                    $e = $list[$idx];
                    $need = (float) $e->amount - $covered[$e->id];
                    $apply = min($left, $need);
                    if ($apply > 0) {
                        $covered[$e->id] += $apply;
                        $left -= $apply;
                        $allocations[$e->id][] = [
                            'payment_id' => $p->id,
                            'applied' => round($apply, 2),
                            'payment_amount' => PaymentMath::net($p),
                            'payment_date' => Carbon::parse($p->getRawOriginal('payment_date'))->toDateString(),
                            'type' => $p->type,
                            'method' => $p->method,
                            'reference_no' => $p->reference_no,
                            'bank_name' => $p->bank_name,
                            'receipt_path' => $p->receipt_path,
                        ];
                    }
                    if ($covered[$e->id] >= (float) $e->amount - 0.009) {
                        $idx++;
                    }
                }
            }

            $computed = [];
            foreach ($all as $e) {
                $cov = $covered[$e->id];
                $remaining = round((float) $e->amount - $cov, 2);
                $due = Carbon::parse($e->due_date);

                if ($remaining <= 0.009) {
                    $status = 'payee';
                } elseif ($due->lt($today)) {
                    $status = 'en_retard';
                } elseif ($cov > 0) {
                    $status = 'partielle';
                } else {
                    $status = 'a_venir';
                }

                $computed[$e->id] = [
                    'paid' => round($cov, 2),
                    'remaining' => max(0, $remaining),
                    'status' => $status,
                    'days_late' => $status === 'en_retard' ? (int) $due->diffInDays($today) : 0,
                    'allocations' => $allocations[$e->id],
                ];
            }

            foreach ($clientRows as $row) {
                $out->push(array_merge($row->toArray(), $computed[$row->id] ?? []));
            }
        }

        return $out->sortBy('due_date')->values();
    }
}
