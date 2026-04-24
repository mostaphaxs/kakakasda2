<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ForceCors
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $origin = $request->header('Origin');
        
        // Define allowed origins or patterns
        $allowedOrigins = [
            'tauri://localhost',
            'http://tauri.localhost',
            'http://localhost',
            'http://127.0.0.1',
        ];

        // Determine the Origin header to send back
        $corsOrigin = '*';
        if ($origin) {
            foreach ($allowedOrigins as $allowed) {
                if (str_starts_with($origin, $allowed)) {
                    $corsOrigin = $origin;
                    break;
                }
            }
        }

        // Handle preflight (OPTIONS)
        if ($request->isMethod('OPTIONS')) {
            return response()->json('OK', 200, [
                'Access-Control-Allow-Origin' => $corsOrigin,
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers' => '*',
                'Access-Control-Allow-Credentials' => 'true',
                'Access-Control-Max-Age' => '86400',
            ]);
        }

        $response = $next($request);

        // Add headers to the response
        $response->headers->set('Access-Control-Allow-Origin', $corsOrigin);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', '*');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');

        return $response;
    }
}
