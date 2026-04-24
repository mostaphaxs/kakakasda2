<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\Response;

class ParseFrenchDates
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $input = $request->all();

        foreach ($input as $key => $value) {
            // Check if string matches DD/MM/YYYY
            if (is_string($value) && preg_match('/^\d{2}\/\d{2}\/\d{4}$/', $value)) {
                try {
                    // Convert to YYYY-MM-DD for database/backend standard
                    $input[$key] = Carbon::createFromFormat('d/m/Y', $value)->format('Y-m-d');
                } catch (\Exception $e) {
                    // Skip if not a valid date
                }
            }
        }

        $request->merge($input);

        return $next($request);
    }
}
