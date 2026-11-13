<?php

namespace App\Support;

/**
 * THE rule for "how much a payment counts" — used everywhere (stats, reports,
 * échéancier, statements) so every screen shows the same balance:
 *
 *   valid payment     : amount − refund_amount − bank_commission
 *   cancelled payment : amount − refund_amount (never negative; the bank fee is the company's cost)
 *   "Reprise"         : −amount   (money given back to the client)
 *
 * A rejected cheque has refund_amount = amount, so it nets to 0.
 * Mirrors app2FrontEnd/src/lib/clientBalance.ts.
 */
class PaymentMath
{
    /** SQL expression for one row (optional table alias, e.g. "payments."). */
    public static function sqlNet(string $t = ''): string
    {
        $amount = "CAST({$t}amount AS DECIMAL(15,2))";
        $refund = "CAST(COALESCE({$t}refund_amount, 0) AS DECIMAL(15,2))";
        $fee = "CAST(COALESCE({$t}bank_commission, 0) AS DECIMAL(15,2))";
        return "(CASE WHEN {$t}type = 'Reprise' THEN -{$amount} "
            . "WHEN {$t}status = 'Cancelled' THEN (CASE WHEN {$amount} - {$refund} > 0 THEN {$amount} - {$refund} ELSE 0 END) "
            . "ELSE {$amount} - {$refund} - {$fee} END)";
    }

    /** SUM(...) of the rule, for selectRaw. */
    public static function sqlSum(string $t = ''): string
    {
        return 'SUM(' . self::sqlNet($t) . ')';
    }

    /** Price of a client's units (finition or not) + their annexes. */
    public static function clientPrice($client): float
    {
        return (float) $client->biens->sum(function ($b) use ($client) {
            $base = $client->avec_finition ? $b->prix_global_finition : $b->prix_global_non_finition;
            $annex = $b->relationLoaded('annexUnits') ? $b->annexUnits->sum('prix') : $b->annexUnits()->sum('prix');
            return (float) $base + (float) $annex;
        });
    }

    /** ['prix', 'paid', 'remaining'] for a client (biens & payments loaded). */
    public static function balance($client): array
    {
        $prix = self::clientPrice($client);
        $paid = (float) $client->payments->sum(fn ($p) => self::net($p));
        return ['prix' => round($prix, 2), 'paid' => round($paid, 2), 'remaining' => round(max(0, $prix - $paid), 2)];
    }

    /** Same rule for a single payment model/array. */
    public static function net($p): float
    {
        $get = fn ($k) => is_array($p) ? ($p[$k] ?? null) : ($p->{$k} ?? null);
        $amount = (float) $get('amount');
        if ($get('type') === 'Reprise') {
            return -$amount;
        }
        $refund = (float) ($get('refund_amount') ?? 0);
        if ($get('status') === 'Cancelled') {
            return max(0.0, $amount - $refund);
        }
        return $amount - $refund - (float) ($get('bank_commission') ?? 0);
    }
}
