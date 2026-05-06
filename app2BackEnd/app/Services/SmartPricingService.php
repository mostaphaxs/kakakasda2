<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use App\Models\Device;

/**
 * SmartPricingService
 * Uses Gemini AI to suggest a competitive retail price for a device
 * based on its specs, condition, and purchase price.
 */
class SmartPricingService
{
    protected ?string $apiKey;
    protected string $model = 'gemini-2.0-flash-preview';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
    }

    /**
     * Suggest a retail price for a device.
     *
     * @param Device $device
     * @return float|null  The suggested price in MAD (or null on failure)
     */
    public function suggestPrice(Device $device): ?float
    {
        if (!$this->apiKey) {
            \Log::warning('SmartPricingService: GEMINI_API_KEY is not set.');
            return null;
        }
        $specs = json_encode($device->technical_specs ?? [], JSON_UNESCAPED_UNICODE);

        $prompt = <<<PROMPT
You are an expert electronics pricing analyst for the Moroccan market.

Based on the following device details, suggest the optimal retail price in MAD (Moroccan Dirhams).
Return ONLY a JSON object with the key "suggested_price" (number) and "reasoning" (one sentence).

Device:
- Brand: {$device->brand}
- Model: {$device->model}
- Condition: {$device->condition}
- Storage: {$device->storage_capacity}
- Color: {$device->color}
- Purchase Price: {$device->purchase_price} MAD
- Technical Specs: {$specs}

Rules:
- New: aim for 15-25% margin.
- Used: aim for 20-35% margin depending on condition.
- Refurbished: aim for 25-40% margin.
- Consider local market competition.

Respond ONLY with JSON: {"suggested_price": 1500, "reasoning": "..."}
PROMPT;

        $response = Http::withOptions(['verify' => false])
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}", [
                'contents' => [
                    ['parts' => [['text' => $prompt]]]
                ]
            ]);

        if (!$response->ok()) {
            \Log::error('SmartPricingService: Gemini API error', ['body' => $response->body()]);
            return null;
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text', '');

        // Extract JSON from response
        preg_match('/\{[\s\S]*\}/', $text, $matches);
        if (!isset($matches[0])) return null;

        $data = json_decode($matches[0], true);
        return isset($data['suggested_price']) ? (float) $data['suggested_price'] : null;
    }
}
