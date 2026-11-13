<?php

namespace Tests\Feature;

use App\Models\Bien;
use App\Models\Client;
use App\Models\payments;
use App\Models\Terrain;
use App\Models\User;
use App\Support\PaymentMath;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Money logic that must never silently break: one balance rule everywhere,
 * instalment allocation, cheque rejection, one-click reservation, tasks.
 * Runs on an in-memory database (php artisan test) — real data is never touched.
 */
class MoneyLogicTest extends TestCase
{
    use RefreshDatabase;

    private Terrain $terrain;

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
        $this->terrain = Terrain::create(['nom_projet' => 'Projet Test', 'nom_terrain' => 'Terrain Test']);
    }

    private function bien(string $statut = 'Libre', float $prix = 100000): Bien
    {
        $id = DB::table('biens')->insertGetId([
            'terrain_id' => $this->terrain->id, 'type_bien' => 'Appartement', 'surface_m2' => 100,
            'num_appartement' => 'A' . random_int(1, 99999), 'statut' => $statut,
            'prix_par_m2_finition' => $prix / 100, 'prix_global_finition' => $prix,
            'prix_par_m2_non_finition' => $prix / 100, 'prix_global_non_finition' => $prix,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        return Bien::find($id);
    }

    private function client(?Bien $bien = null): Client
    {
        $c = Client::create(['nom' => 'Test', 'prenom' => 'Client', 'cin' => 'AB' . random_int(10000, 99999), 'tel' => '0600000000', 'avec_finition' => true, 'statut' => 'Actif']);
        if ($bien) {
            $c->biens()->attach($bien->id);
            $bien->update(['statut' => 'Reserve']);
        }
        return $c;
    }

    private function pay(Client $c, float $amount, array $extra = []): payments
    {
        return payments::create(array_merge([
            'client_id' => $c->id, 'amount' => $amount, 'payment_date' => now()->toDateString(),
            'type' => 'Tranche', 'method' => 'Espèces',
        ], $extra));
    }

    // ── 1. The single rule ───────────────────────────────────────────────────
    public function test_payment_rule(): void
    {
        $this->assertSame(1000.0, PaymentMath::net(['amount' => 1000, 'type' => 'Tranche']));
        $this->assertSame(990.0, PaymentMath::net(['amount' => 1000, 'type' => 'Tranche', 'bank_commission' => 10]));
        $this->assertSame(-500.0, PaymentMath::net(['amount' => 500, 'type' => 'Reprise']));
        // cancelled/rejected: refund = amount → 0, and never negative because of a bank fee
        $this->assertSame(0.0, PaymentMath::net(['amount' => 200, 'type' => 'Avance', 'status' => 'Cancelled', 'refund_amount' => 200, 'bank_commission' => 10]));
        $this->assertSame(50.0, PaymentMath::net(['amount' => 200, 'type' => 'Avance', 'status' => 'Cancelled', 'refund_amount' => 150]));
    }

    public function test_every_screen_shows_the_same_paid_amount(): void
    {
        $c = $this->client($this->bien('Libre', 100000));
        $this->pay($c, 10000);
        $this->pay($c, 5000, ['bank_commission' => 20]);            // counts 4.980
        $this->pay($c, 2000, ['type' => 'Reprise']);                // −2.000
        $this->pay($c, 300, ['status' => 'Cancelled', 'refund_amount' => 300, 'bank_commission' => 10]); // 0
        $expected = 10000 + 4980 - 2000;

        $list = collect($this->getJson('/api/clients')->assertOk()->json())->firstWhere('id', $c->id);
        $this->assertEquals($expected, $list['balance']['paid']);
        $this->assertEquals(100000 - $expected, $list['balance']['remaining']);

        $this->assertEquals($expected, $this->getJson("/api/clients/{$c->id}/statement")->assertOk()->json('totals.paid'));
        $this->assertEquals($expected, $this->getJson('/api/stats')->assertOk()->json('encaissements'));
        $this->assertEquals($expected, $this->getJson('/api/reports/monthly?month=' . now()->format('Y-m'))->assertOk()->json('collected'));
    }

    // ── 2. Échéancier ────────────────────────────────────────────────────────
    public function test_instalments_are_filled_oldest_first(): void
    {
        $c = $this->client($this->bien());
        $this->postJson('/api/echeances/plan', [
            'client_id' => $c->id, 'total' => 3000, 'count' => 3,
            'start_date' => Carbon::today()->subMonths(2)->startOfMonth()->toDateString(), 'interval_months' => 1,
        ])->assertCreated();

        $this->pay($c, 1500);
        $rows = collect($this->getJson("/api/echeances?client_id={$c->id}")->assertOk()->json('data'))->sortBy('due_date')->values();

        $this->assertSame('payee', $rows[0]['status']);
        $this->assertEquals(500, $rows[1]['paid']);
        $this->assertSame('en_retard', $rows[1]['status']);       // due last month, only half paid
        $this->assertEquals(0, $rows[2]['paid']);
        // the detail view shows which payment covered what
        $this->assertEquals(1000, $rows[0]['allocations'][0]['applied']);
        $this->assertEquals(500, $rows[1]['allocations'][0]['applied']);
    }

    public function test_payments_made_before_the_plan_are_not_counted(): void
    {
        $c = $this->client($this->bien());
        $this->pay($c, 20000);                                    // advance before the plan
        $this->postJson('/api/echeances/plan', [
            'client_id' => $c->id, 'total' => 2000, 'count' => 2,
            'start_date' => Carbon::today()->addMonth()->toDateString(), 'interval_months' => 1,
        ])->assertCreated();

        $rows = $this->getJson("/api/echeances?client_id={$c->id}")->json('data');
        $this->assertEquals(0, collect($rows)->sum('paid'));
    }

    // ── 3. Cheques ───────────────────────────────────────────────────────────
    public function test_rejected_cheque_is_no_longer_counted_and_can_be_restored(): void
    {
        $c = $this->client($this->bien());
        $res = $this->postJson('/api/payments', [
            'client_id' => $c->id, 'amount' => 7000, 'payment_date' => now()->toDateString(),
            'type' => 'Tranche', 'method' => 'Chèque', 'reference_no' => 'CHQ-1',
        ])->assertCreated();
        $id = $res->json('payment.id');
        $this->assertSame('recu', payments::find($id)->cheque_status);

        $paid = fn () => $this->getJson("/api/clients/{$c->id}/statement")->json('totals.paid');
        $this->assertEquals(7000, $paid());

        $this->postJson("/api/cheques/{$id}/status", ['status' => 'depose'])->assertOk();
        $this->postJson("/api/cheques/{$id}/status", ['status' => 'rejete', 'reason' => 'Provision insuffisante'])->assertOk();
        $this->assertEquals(0, $paid());

        $this->postJson("/api/cheques/{$id}/status", ['status' => 'depose'])->assertOk();
        $this->assertEquals(7000, $paid());
        $this->assertSame('Active', payments::find($id)->status);
    }

    // ── 4. Reservation ───────────────────────────────────────────────────────
    public function test_one_click_reservation(): void
    {
        $bien = $this->bien('Libre');
        $c = $this->client();
        $this->postJson("/api/biens/{$bien->id}/reserve", ['client_id' => $c->id])->assertOk();
        $this->assertSame('Reserve', $bien->fresh()->statut);
        $this->assertTrue($c->biens()->where('biens.id', $bien->id)->exists());

        // same unit cannot be reserved twice; a client cannot hold two units
        $this->postJson("/api/biens/{$bien->id}/reserve", ['client_id' => $this->client()->id])->assertStatus(422);
        $this->postJson("/api/biens/{$this->bien('Libre')->id}/reserve", ['client_id' => $c->id])->assertStatus(422);
    }

    // ── 5. Tasks & notifications ─────────────────────────────────────────────
    public function test_overdue_task_appears_in_notifications_until_done(): void
    {
        $id = $this->postJson('/api/tasks', ['title' => 'Rappeler le notaire', 'due_date' => Carbon::yesterday()->toDateString()])
            ->assertCreated()->json('id');

        $titles = fn () => collect($this->getJson('/api/notifications')->assertOk()->json())->pluck('title');
        $this->assertContains('Rappeler le notaire', $titles());

        $this->putJson("/api/tasks/{$id}", ['done' => true])->assertOk();
        $this->assertNotContains('Rappeler le notaire', $titles());
    }
}
