<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    private string $settingsFile = 'settings.json';

    private function loadSettings(): array
    {
        if (!Storage::exists($this->settingsFile)) {
            return [];
        }
        return json_decode(Storage::get($this->settingsFile), true) ?? [];
    }

    private function saveSettings(array $settings): void
    {
        Storage::put($this->settingsFile, json_encode($settings, JSON_PRETTY_PRINT));
    }

    /**
     * GET /api/settings/pricing
     * Returns all project pricing configs plus the global default.
     */
    public function getPricing()
    {
        $settings = $this->loadSettings();

        return response()->json([
            'default_prix_m2_finition'    => (float)($settings['default']['finition']    ?? 9000),
            'default_prix_m2_gros_oeuvre' => (float)($settings['default']['gros_oeuvre'] ?? 7000),
            'projects'                    => $settings['projects'] ?? [],
        ]);
    }

    /**
     * POST /api/settings/pricing
     * Payload options:
     *   1. Global defaults: { default_prix_m2_finition, default_prix_m2_gros_oeuvre }
     *   2. Per-project:    { terrain_id, prix_m2_finition, prix_m2_gros_oeuvre }
     */
    public function updatePricing(Request $request)
    {
        $settings = $this->loadSettings();
        if (!isset($settings['projects'])) $settings['projects'] = [];
        if (!isset($settings['default'])) $settings['default'] = ['finition' => 9000, 'gros_oeuvre' => 7000];

        if ($request->has('terrain_id')) {
            // Per-project update
            $validated = $request->validate([
                'terrain_id'           => 'required|integer',
                'prix_m2_finition'     => 'required|numeric|min:0',
                'prix_m2_gros_oeuvre'  => 'required|numeric|min:0',
            ]);

            $tid = (string)$validated['terrain_id'];
            $settings['projects'][$tid] = [
                'finition'    => (float)$validated['prix_m2_finition'],
                'gros_oeuvre' => (float)$validated['prix_m2_gros_oeuvre'],
            ];

            $this->saveSettings($settings);

            // Recalculate all biens for this terrain
            \DB::table('biens')
                ->where('terrain_id', $validated['terrain_id'])
                ->update([
                    'prix_par_m2_finition'     => $validated['prix_m2_finition'],
                    'prix_global_finition'     => \DB::raw('surface_m2 * ' . $validated['prix_m2_finition']),
                    'prix_par_m2_non_finition' => $validated['prix_m2_gros_oeuvre'],
                    'prix_global_non_finition' => \DB::raw('surface_m2 * ' . $validated['prix_m2_gros_oeuvre']),
                ]);

        } else {
            // Global defaults update
            $validated = $request->validate([
                'default_prix_m2_finition'    => 'required|numeric|min:0',
                'default_prix_m2_gros_oeuvre' => 'required|numeric|min:0',
            ]);

            $settings['default'] = [
                'finition'    => (float)$validated['default_prix_m2_finition'],
                'gros_oeuvre' => (float)$validated['default_prix_m2_gros_oeuvre'],
            ];

            $this->saveSettings($settings);

            // Apply to all biens that DON'T have per-project overrides
            $projectIds = array_keys($settings['projects']);
            $query = \DB::table('biens');
            if (!empty($projectIds)) {
                $query->whereNotIn('terrain_id', $projectIds);
            }
            $query->update([
                'prix_par_m2_finition'     => $validated['default_prix_m2_finition'],
                'prix_global_finition'     => \DB::raw('surface_m2 * ' . $validated['default_prix_m2_finition']),
                'prix_par_m2_non_finition' => $validated['default_prix_m2_gros_oeuvre'],
                'prix_global_non_finition' => \DB::raw('surface_m2 * ' . $validated['default_prix_m2_gros_oeuvre']),
            ]);
        }

        return response()->json([
            'message'  => 'Configuration enregistrée.',
            'settings' => $settings,
        ]);
    }
}
