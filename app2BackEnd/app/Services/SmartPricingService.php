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
    protected $apiKey;
    protected string $model = 'gemini-1.5-flash';

    public function __construct()
    {
        $this->apiKey = config('services.gemini.api_key', env('GEMINI_API_KEY'));
        if (!$this->apiKey) {
            \Log::error('SmartPricingService: GEMINI_API_KEY is missing in .env');
        }
    }

    /**
     * Suggest a retail price for a device.
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

    /**
     * Fetch technical specs for a given query (e.g. "iPhone 15 Pro") using AI.
     */
    public function fetchTechnicalSpecs(string $query): ?array
    {
        if (!$this->apiKey) return null;

        $prompt = <<<PROMPT
You are a technical database expert. Based on this query: "{$query}", identify the device and provide its official specs.

Return ONLY a JSON object with these exact keys: 
- "brand": e.g. "Apple"
- "model": e.g. "iPhone 15 Pro"
- "category": must be one of [Smartphone, Tablette, Ordinateur, Audio, Accessoire, Lumina, Autre]
- "storage_capacity": e.g. "128GB"
- "color": e.g. "Titanium Black"
- "processeur": e.g. "A17 Pro"
- "ram": e.g. "8GB"
- "batterie": e.g. "4441mAh"
- "ecran": e.g. "6.7 inch OLED"
- "appareil_photo": e.g. "48MP"
- "os": e.g. "iOS 17"

Respond ONLY with RAW JSON.
PROMPT;

        $response = Http::withOptions(['verify' => false])
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}", [
                'contents' => [['parts' => [['text' => $prompt]]]]
            ]);

        if (!$response->ok()) return null;

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text', '');
        preg_match('/\{[\s\S]*\}/', $text, $matches);
        return isset($matches[0]) ? json_decode($matches[0], true) : null;
    }

    /**
     * Analyze a document (image) and extract device specs using AI Vision.
     */
    public function analyzeDocument(string $base64Data, string $mimeType): ?array
    {
        if (!$this->apiKey) return null;

        $prompt = <<<PROMPT
Analyze this image or document (could be a photo of a box, a datasheet, or a technical sheet).
Extract all technical specifications and basic information for the device shown.
If you find multiple devices, focus on the main one.

Return ONLY a JSON object with these exact keys: 
- "brand"
- "model"
- "category": must be one of [Smartphone, Tablette, Ordinateur, Audio, Accessoire, Lumina, Autre]
- "storage_capacity"
- "color"
- "processeur"
- "ram"
- "batterie"
- "ecran"
- "appareil_photo"
- "os"

Respond ONLY with RAW JSON.
PROMPT;

        $payload = [
            'contents' => [
                [
                    'parts' => [
                        ['text' => $prompt],
                        [
                            'inline_data' => [
                                'mime_type' => $mimeType,
                                'data' => $base64Data
                            ]
                        ]
                    ]
                ]
            ]
        ];

        $response = Http::withOptions(['verify' => false])
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}", $payload);

        if (!$response->ok()) {
            \Log::error('SmartPricingService Vision API Error', [
                'status' => $response->status(),
                'body' => $response->body()
            ]);
            return null;
        }

        $text = data_get($response->json(), 'candidates.0.content.parts.0.text', '');
        
        if (empty($text)) {
            \Log::error('SmartPricingService Vision Error: Empty response from Gemini');
            return null;
        }

        // Robust JSON extraction (handles markdown ```json ... ```)
        if (preg_match('/\{[\s\S]*\}/', $text, $matches)) {
            $json = json_decode($matches[0], true);
            if ($json) return $json;
        }

        \Log::error('SmartPricingService Vision Error: Could not parse JSON from AI response', ['raw_text' => $text]);
        return null;
    }
}
