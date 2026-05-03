<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;

class SettingController extends Controller
{
    private string $settingsFile = 'settings.json';
    private array $propertyTypes = ['Appartement', 'Villa', 'Lot Villa', 'Local Commercial', 'Bureau', 'Autre'];

    private function loadSettings(): array
    {
        if (!Storage::exists($this->settingsFile)) {
            return $this->getDefaultSettings();
        }
        $settings = json_decode(Storage::get($this->settingsFile), true) ?? [];
        
        // Migrate old flat structure to nested structure if needed
        if (isset($settings['default']) && isset($settings['default']['finition']) && !is_array($settings['default']['finition'])) {
            $settings = $this->migrateOldSettings($settings);
        }

        return $settings;
    }
    
    private function getDefaultSettings(): array 
    {
        $defaultTypes = [];
        foreach ($this->propertyTypes as $type) {
            $defaultTypes[$type] = ['finition' => 9000, 'gros_oeuvre' => 7000];
        }
        return [
            'default' => $defaultTypes, 
            'projects' => []
        ];
    }
    
    private function migrateOldSettings(array $settings): array
    {
        $newSettings = $this->getDefaultSettings();
        
        if (isset($settings['default'])) {
            $oldFin = $settings['default']['finition'] ?? 9000;
            $oldGros = $settings['default']['gros_oeuvre'] ?? 7000;
            foreach ($this->propertyTypes as $type) {
                $newSettings['default'][$type] = ['finition' => $oldFin, 'gros_oeuvre' => $oldGros];
            }
        }
        
        if (isset($settings['projects'])) {
            foreach ($settings['projects'] as $tid => $projCfg) {
                if (isset($projCfg['finition']) && !is_array($projCfg['finition'])) {
                    $pFin = $projCfg['finition'];
                    $pGros = $projCfg['gros_oeuvre'];
                    $newProj = [];
                    foreach ($this->propertyTypes as $type) {
                        $newProj[$type] = ['finition' => $pFin, 'gros_oeuvre' => $pGros];
                    }
                    $newSettings['projects'][$tid] = $newProj;
                } else if (is_array($projCfg)) {
                     $newSettings['projects'][$tid] = $projCfg;
                }
            }
        }
        return $newSettings;
    }

    private function saveSettings(array $settings): void
    {
        Storage::put($this->settingsFile, json_encode($settings, JSON_PRETTY_PRINT));
    }

    /**
     * GET /api/settings/pricing
     */
    public function getPricing()
    {
        $settings = $this->loadSettings();

        return response()->json([
            'default'  => $settings['default'],
            'projects' => $settings['projects'] ?? [],
        ]);
    }

    /**
     * POST /api/settings/pricing
     */
    public function updatePricing(Request $request)
    {
        $settings = $this->loadSettings();
        
        if ($request->has('terrain_id')) {
            $validated = $request->validate([
                'terrain_id' => 'required|integer',
                'prices'     => 'required|array',
                'prices.*.finition' => 'required|numeric|min:0',
                'prices.*.gros_oeuvre' => 'required|numeric|min:0',
            ]);

            $tid = (string)$validated['terrain_id'];
            $settings['projects'][$tid] = [];
            
            foreach ($this->propertyTypes as $type) {
                if (isset($validated['prices'][$type])) {
                    $settings['projects'][$tid][$type] = [
                        'finition'    => (float)$validated['prices'][$type]['finition'],
                        'gros_oeuvre' => (float)$validated['prices'][$type]['gros_oeuvre'],
                    ];
                } else {
                    $settings['projects'][$tid][$type] = $settings['default'][$type] ?? ['finition' => 9000, 'gros_oeuvre' => 7000];
                }
            }

            $this->saveSettings($settings);

            // Recalculate all biens for this terrain
            foreach ($settings['projects'][$tid] as $type => $prices) {
                DB::table('biens')
                    ->where('terrain_id', $validated['terrain_id'])
                    ->where('type_bien', $type)
                    ->update([
                        'prix_par_m2_finition'     => $prices['finition'],
                        'prix_global_finition'     => DB::raw('surface_m2 * ' . $prices['finition']),
                        'prix_par_m2_non_finition' => $prices['gros_oeuvre'],
                        'prix_global_non_finition' => DB::raw('surface_m2 * ' . $prices['gros_oeuvre']),
                    ]);
            }

        } else {
            // Global defaults update
            $validated = $request->validate([
                'prices'     => 'required|array',
                'prices.*.finition' => 'required|numeric|min:0',
                'prices.*.gros_oeuvre' => 'required|numeric|min:0',
            ]);

            foreach ($this->propertyTypes as $type) {
                if (isset($validated['prices'][$type])) {
                    $settings['default'][$type] = [
                        'finition'    => (float)$validated['prices'][$type]['finition'],
                        'gros_oeuvre' => (float)$validated['prices'][$type]['gros_oeuvre'],
                    ];
                }
            }

            $this->saveSettings($settings);

            // Apply to all biens that DON'T have per-project overrides
            $projectIds = array_keys($settings['projects']);
            
            foreach ($settings['default'] as $type => $prices) {
                $query = DB::table('biens')->where('type_bien', $type);
                if (!empty($projectIds)) {
                    $query->whereNotIn('terrain_id', $projectIds);
                }
                $query->update([
                    'prix_par_m2_finition'     => $prices['finition'],
                    'prix_global_finition'     => DB::raw('surface_m2 * ' . $prices['finition']),
                    'prix_par_m2_non_finition' => $prices['gros_oeuvre'],
                    'prix_global_non_finition' => DB::raw('surface_m2 * ' . $prices['gros_oeuvre']),
                ]);
            }
        }

        return response()->json([
            'message'  => 'Configuration enregistrée.',
            'settings' => $settings,
        ]);
    }
}
