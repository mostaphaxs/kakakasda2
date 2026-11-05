<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\Contentieux;
use App\Models\Echeance;
use App\Models\payments;
use App\Models\StockTracking;
use App\Services\EcheanceAllocator;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Aggregated, read-only alerts for the notification bell.
 * Each item has a stable `id` so the UI can remember what was already seen.
 */
class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        $today = Carbon::today();
        $items = [];

        // 1. Instalments overdue / due within 7 days (grouped per client)
        $rows = EcheanceAllocator::enrich(Echeance::with('client:id,nom,prenom,tel')->get());
        foreach ($rows->where('status', 'en_retard')->groupBy('client_id') as $clientId => $group) {
            $c = $group->first()['client'] ?? null;
            $items[] = [
                'id' => "retard-{$clientId}-" . $group->count() . '-' . (int) $group->sum('remaining'),
                'type' => 'echeance_retard',
                'severity' => 'critical',
                'title' => self::name($c) . ' — ' . $group->count() . ' échéance(s) en retard',
                'detail' => number_format($group->sum('remaining'), 0, ',', '.') . ' DH · retard max ' . $group->max('days_late') . ' j',
                'date' => $group->min('due_date'),
                'link' => "/echeancier?client={$clientId}",
            ];
        }
        $in7 = $today->copy()->addDays(7);
        foreach ($rows->filter(fn ($r) => in_array($r['status'], ['a_venir', 'partielle'])
            && Carbon::parse($r['due_date'])->between($today, $in7)) as $r) {
            $c = $r['client'] ?? null;
            $items[] = [
                'id' => "avenir-{$r['id']}",
                'type' => 'echeance_avenir',
                'severity' => 'warning',
                'title' => 'Échéance le ' . Carbon::parse($r['due_date'])->format('d/m') . ' — ' . self::name($c),
                'detail' => number_format($r['remaining'], 0, ',', '.') . ' DH',
                'date' => $r['due_date'],
                'link' => "/echeancier?client={$r['client_id']}",
            ];
        }

        // 2. Client cheques: to deposit (date reached or within 7 days), deposited but not cashed after 7 days
        $cheques = payments::with('client:id,nom,prenom')
            ->where('method', 'Chèque')
            ->where(fn ($q) => $q->whereNull('cheque_status')->orWhereIn('cheque_status', ['recu', 'depose']))
            ->where(fn ($q) => $q->whereNull('status')->orWhere('status', '!=', 'Cancelled'))
            ->orderBy('payment_date')->get();
        foreach ($cheques as $p) {
            $d = Carbon::parse($p->getRawOriginal('payment_date'));
            $status = $p->cheque_status ?: 'recu';
            $ref = $p->reference_no ? " n° {$p->reference_no}" : '';
            $who = self::name($p->client) . ' · ' . number_format((float) $p->amount, 0, ',', '.') . ' DH';
            if ($status === 'recu' && $d->lte($in7)) {
                $overdue = $d->lt($today);
                $items[] = [
                    'id' => "cheque-{$p->id}-recu",
                    'type' => 'cheque',
                    'severity' => $overdue ? 'critical' : 'warning',
                    'title' => ($overdue ? 'Chèque à déposer (daté du ' : 'Chèque à déposer le ') . $d->format('d/m') . ($overdue ? ')' : '') . $ref,
                    'detail' => $who,
                    'date' => $d->toDateString(),
                    'link' => '/cheques',
                ];
            } elseif ($status === 'depose' && $p->cheque_deposited_at
                && Carbon::parse($p->getRawOriginal('cheque_deposited_at'))->lt($today->copy()->subDays(7))) {
                $items[] = [
                    'id' => "cheque-{$p->id}-depose",
                    'type' => 'cheque',
                    'severity' => 'warning',
                    'title' => 'Chèque déposé non encaissé' . $ref,
                    'detail' => $who . ' · déposé le ' . Carbon::parse($p->getRawOriginal('cheque_deposited_at'))->format('d/m'),
                    'date' => $d->toDateString(),
                    'link' => '/cheques',
                ];
            }
        }

        // 3. Clients with a property but no signed contract
        $unsigned = Client::whereHas('biens')
            ->where(fn ($q) => $q->whereNull('statut')->orWhere('statut', '!=', 'Annulé'))
            ->where(fn ($q) => $q->whereNull('statut_choix')->orWhere('statut_choix', '!=', 'CONTRAT_SIGNE'))
            ->get(['id', 'nom', 'prenom', 'cin']);
        foreach ($unsigned as $c) {
            $items[] = [
                'id' => "contrat-{$c->id}",
                'type' => 'contrat',
                'severity' => 'info',
                'title' => 'Contrat non signé — ' . self::name($c),
                'detail' => 'Bien réservé sans contrat signé',
                'date' => null,
                'link' => '/clients?search=' . urlencode($c->cin ?? $c->nom),
            ];
        }

        // 4. Low stock (same rule as /stock/low)
        foreach (StockTracking::with('article')->where('remaining_stock', '<', 10)->get() as $s) {
            $items[] = [
                'id' => "stock-{$s->id}-" . (int) $s->remaining_stock,
                'type' => 'stock',
                'severity' => 'info',
                'title' => 'Stock faible — ' . ($s->article->name ?? 'Article'),
                'detail' => 'Restant : ' . rtrim(rtrim(number_format((float) $s->remaining_stock, 2, ',', '.'), '0'), ',') . ' ' . ($s->article->unit ?? ''),
                'date' => null,
                'link' => '/stock',
            ];
        }

        // 5. Court hearings within 14 days
        $hearings = Contentieux::whereNotNull('next_hearing_date')
            ->whereBetween('next_hearing_date', [$today->toDateString(), $today->copy()->addDays(14)->toDateString()])
            ->orderBy('next_hearing_date')->get();
        foreach ($hearings as $h) {
            $d = Carbon::parse($h->next_hearing_date);
            $items[] = [
                'id' => "audience-{$h->id}-" . $d->toDateString(),
                'type' => 'audience',
                'severity' => $d->diffInDays($today) <= 2 ? 'critical' : 'warning',
                'title' => 'Audience le ' . $d->format('d/m') . ($h->fileNumber ? " — dossier {$h->fileNumber}" : ''),
                'detail' => trim(($h->plaintiff ?? '') . ' c/ ' . ($h->defendant ?? ''), ' c/'),
                'date' => $d->toDateString(),
                'link' => '/contentieux',
            ];
        }

        // 6. Tasks due today or overdue (not done)
        $tasks = \App\Models\Task::with('client:id,nom,prenom')->whereNull('done_at')
            ->whereNotNull('due_date')->where('due_date', '<=', $today->toDateString())->get();
        foreach ($tasks as $t) {
            $d = Carbon::parse($t->getRawOriginal('due_date'));
            $late = $d->lt($today);
            $who = $t->client ? self::name($t->client) : ($t->contact_name ?: null);
            $items[] = [
                'id' => "task-{$t->id}-" . $d->toDateString(),
                'type' => 'task',
                'severity' => $late || $t->priority === 'haute' ? 'critical' : 'warning',
                'title' => $t->title,
                'detail' => trim(($late ? 'En retard depuis le ' . $d->format('d/m') : "Aujourd'hui" . ($t->due_time ? " à {$t->due_time}" : '')) . ($who ? " · {$who}" : '')),
                'date' => $d->toDateString(),
                'link' => '/taches',
            ];
        }

        $rank = ['critical' => 0, 'warning' => 1, 'info' => 2];
        usort($items, fn ($a, $b) => [$rank[$a['severity']], $a['date'] ?? '9999'] <=> [$rank[$b['severity']], $b['date'] ?? '9999']);

        return response()->json($items);
    }

    /** "mostapha farouss" -> "Mostapha Farouss" (works for arrays and models). */
    private static function name($c): string
    {
        if (!$c) return 'Client';
        $prenom = is_array($c) ? ($c['prenom'] ?? '') : ($c->prenom ?? '');
        $nom = is_array($c) ? ($c['nom'] ?? '') : ($c->nom ?? '');
        return Str::title(trim("$prenom $nom")) ?: 'Client';
    }
}
