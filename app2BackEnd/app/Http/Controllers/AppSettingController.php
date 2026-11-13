<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Application settings (Paramètres): company identity used on documents,
 * preferences and AI configuration. Stored in storage/app/app_settings.json,
 * separate from the pricing settings (settings.json).
 */
class AppSettingController extends Controller
{
    private const FILE = 'app_settings.json';

    public static function defaults(): array
    {
        return [
            'company' => [
                'name' => 'Amical El Ouaha',
                'tagline' => 'Promotion Immobilière & Travaux Divers',
                'legal_form' => 'S.A.R.L',
                'address' => '',
                'city' => 'Casablanca',
                'phone' => '',
                'email' => '',
                'website' => '',
                'ice' => '',
                'rc' => '',
                'if' => '',
                'patente' => '',
                'cnss' => '',
                'capital' => '',
                'logo_path' => null,
                'manager_name' => '',
                'manager_title' => 'Gérant',
                'bank_name' => '',
                'bank_agency' => '',
                'rib' => '',
                'stamp_path' => null,
            ],
            'documents' => [
                'receipt_prefix' => 'R-',
                'receipt_note' => '',
                'show_stamp' => true,
                'show_bank_on_statement' => true,
                'penalty_percent' => 10,
                'notice_days' => 15,
                'delivery_months' => '',
                'extra_clause' => '',
            ],
            'notifications' => [
                'echeances' => true,
                'cheques' => true,
                'contrats' => true,
                'stock' => true,
                'audiences' => true,
                'taches' => true,
                'upcoming_days' => 7,
                'cheque_days' => 7,
                'hearing_days' => 14,
                'stock_threshold' => 10,
            ],
            'preferences' => [
                'owner_name' => 'M. Aziz',
                'signing_city' => 'Casablanca',
                'whatsapp_lang' => 'fr',
                'text_scale' => 'normal',     // petit | normal | grand
                'hide_amounts_default' => true,
            ],
            'ai' => [
                'gemini_key' => '',
                'model_text' => '',
                'model_vision' => '',
            ],
            // Pages & modules the company uses (false = hidden everywhere in the app)
            'modules' => array_fill_keys([
                'taches', 'dashboard', 'transactions', 'notifications', 'assistant',
                'terrains', 'properties', 'disponibilites', 'clients', 'echeancier', 'messages', 'contentieux',
                'contractors', 'intervenants', 'workers', 'salaries', 'travaux',
                'articles', 'suppliers', 'achats', 'stock_exit', 'stock',
                'cheques', 'rentabilite', 'charges', 'services_tiers', 'factures',
            ], true),
        ];
    }

    /** Current settings, for other controllers (notifications…). */
    public static function current(): array
    {
        return (new self())->load();
    }

    private function load(): array
    {
        $saved = Storage::exists(self::FILE) ? (json_decode(Storage::get(self::FILE), true) ?? []) : [];
        $d = self::defaults();
        foreach ($d as $section => $values) {
            $d[$section] = array_merge($values, is_array($saved[$section] ?? null) ? $saved[$section] : []);
        }
        return $d;
    }

    public function show(): JsonResponse
    {
        return response()->json($this->load());
    }

    public function update(Request $request): JsonResponse
    {
        $v = $request->validate([
            'company' => 'sometimes|array',
            'company.name' => 'sometimes|required|string|max:150',
            'company.*' => 'nullable',
            'preferences' => 'sometimes|array',
            'preferences.owner_name' => 'sometimes|nullable|string|max:80',
            'preferences.signing_city' => 'sometimes|nullable|string|max:80',
            'preferences.whatsapp_lang' => 'sometimes|in:fr,ar',
            'preferences.text_scale' => 'sometimes|in:petit,normal,grand',
            'preferences.hide_amounts_default' => 'sometimes|boolean',
            'documents' => 'sometimes|array',
            'documents.receipt_prefix' => 'sometimes|nullable|string|max:12',
            'documents.receipt_note' => 'sometimes|nullable|string|max:300',
            'documents.show_stamp' => 'sometimes|boolean',
            'documents.show_bank_on_statement' => 'sometimes|boolean',
            'documents.penalty_percent' => 'sometimes|numeric|min:0|max:100',
            'documents.notice_days' => 'sometimes|integer|min:1|max:180',
            'documents.delivery_months' => 'sometimes|nullable',
            'documents.extra_clause' => 'sometimes|nullable|string|max:2000',
            'notifications' => 'sometimes|array',
            'notifications.*' => 'nullable',
            'notifications.upcoming_days' => 'sometimes|integer|min:1|max:60',
            'notifications.cheque_days' => 'sometimes|integer|min:0|max:60',
            'notifications.hearing_days' => 'sometimes|integer|min:1|max:90',
            'notifications.stock_threshold' => 'sometimes|numeric|min:0',
            'ai' => 'sometimes|array',
            'ai.gemini_key' => 'sometimes|nullable|string|max:200',
            'ai.model_text' => 'sometimes|nullable|string|max:80',
            'ai.model_vision' => 'sometimes|nullable|string|max:80',
            'modules' => 'sometimes|array',
            'modules.*' => 'boolean',
        ]);

        $settings = $this->load();
        $defaults = self::defaults();
        foreach (['company', 'preferences', 'documents', 'notifications', 'ai', 'modules'] as $section) {
            if (!isset($v[$section])) continue;
            // only known keys are stored; image paths are managed by the upload endpoints
            foreach ($v[$section] as $key => $value) {
                if (!array_key_exists($key, $defaults[$section]) || in_array($key, ['logo_path', 'stamp_path'], true)) continue;
                $def = $defaults[$section][$key];
                if (is_bool($def)) $value = filter_var($value, FILTER_VALIDATE_BOOLEAN);
                elseif (is_int($def)) $value = (int) $value;
                elseif (is_string($value)) $value = trim($value);
                $settings[$section][$key] = $value;
            }
        }
        Storage::put(self::FILE, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return response()->json(['message' => 'Paramètres enregistrés.', 'settings' => $settings]);
    }

    private function saveFile(array $settings): void
    {
        Storage::put(self::FILE, json_encode($settings, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }

    /** POST /settings/image/{kind} — kind: logo | stamp */
    public function uploadImage(Request $request, string $kind): JsonResponse
    {
        abort_unless(in_array($kind, ['logo', 'stamp'], true), 404);
        $request->validate(['image' => 'required|image|mimes:png,jpg,jpeg,webp|max:2048']);
        $key = "{$kind}_path";
        $settings = $this->load();
        if (!empty($settings['company'][$key])) Storage::disk('public')->delete($settings['company'][$key]);
        $settings['company'][$key] = $request->file('image')->store('branding', 'public');
        $this->saveFile($settings);
        return response()->json(['message' => $kind === 'logo' ? 'Logo enregistré.' : 'Cachet enregistré.', 'settings' => $settings]);
    }

    /** DELETE /settings/image/{kind} */
    public function deleteImage(string $kind): JsonResponse
    {
        abort_unless(in_array($kind, ['logo', 'stamp'], true), 404);
        $key = "{$kind}_path";
        $settings = $this->load();
        if (!empty($settings['company'][$key])) Storage::disk('public')->delete($settings['company'][$key]);
        $settings['company'][$key] = null;
        $this->saveFile($settings);
        return response()->json(['message' => $kind === 'logo' ? 'Logo supprimé.' : 'Cachet supprimé.', 'settings' => $settings]);
    }

    /** GET /settings/about — data overview for the "À propos" tab. */
    public function about(): JsonResponse
    {
        $db = config('database.connections.' . config('database.default') . '.database');
        $count = fn ($t) => \Illuminate\Support\Facades\Schema::hasTable($t) ? \Illuminate\Support\Facades\DB::table($t)->count() : 0;
        return response()->json([
            'counts' => [
                'projets' => $count('terrains'),
                'biens' => $count('biens'),
                'clients' => $count('clients'),
                'paiements' => $count('payments'),
                'echeances' => $count('echeances'),
                'taches' => $count('tasks'),
                'fournisseurs' => $count('suppliers'),
                'documents' => $count('media'),
            ],
            'database_size' => ($db && ($f = is_file($db) ? $db : base_path($db)) && is_file($f)) ? filesize($f) : null,
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'server_time' => now()->format('d/m/Y H:i'),
        ]);
    }
}
