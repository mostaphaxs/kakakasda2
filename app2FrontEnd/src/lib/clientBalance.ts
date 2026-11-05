// clientBalance.ts — THE rule for client money, identical to the server
// (app2BackEnd/app/Support/PaymentMath.php). Prefer the server value
// `client.balance` when the API provides it.
//
//   valid payment     : amount − refund − bank commission
//   cancelled payment : amount − refund (never negative)
//   "Reprise"         : −amount (money given back to the client)

type Pay = { amount: number | string; type?: string | null; status?: string | null; refund_amount?: number | string | null; bank_commission?: number | string | null };
type Bien = { prix_global_finition?: number | string | null; prix_global_non_finition?: number | string | null; annex_units?: { prix: number | string }[] };
type ClientLike = { avec_finition?: number | boolean | null; biens?: Bien[]; payments?: Pay[]; balance?: { prix: number; paid: number; remaining: number } };

const n = (v: unknown) => Number(v) || 0;

export function paymentNet(p: Pay): number {
    const amount = n(p.amount);
    if (p.type === 'Reprise') return -amount;
    const refund = n(p.refund_amount);
    if (p.status === 'Cancelled') return Math.max(0, amount - refund);
    return amount - refund - n(p.bank_commission);
}

export function clientPaid(c?: ClientLike | null): number {
    if (!c) return 0;
    if (c.balance) return c.balance.paid;
    return (c.payments ?? []).reduce((a, p) => a + paymentNet(p), 0);
}

export function clientPrice(c?: ClientLike | null): number {
    if (!c) return 0;
    if (c.balance) return c.balance.prix;
    return (c.biens ?? []).reduce((a, b) => a
        + n(c.avec_finition ? b.prix_global_finition : b.prix_global_non_finition)
        + (b.annex_units ?? []).reduce((x, u) => x + n(u.prix), 0), 0);
}

export function clientBalance(c?: ClientLike | null) {
    const prix = clientPrice(c);
    const paid = clientPaid(c);
    return { prix, paid, reste: Math.max(0, prix - paid) };
}
