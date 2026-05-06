<?php

namespace App\Http\Controllers;

use App\Models\Sale;
use App\Models\Device;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    /**
     * GET /api/reports
     * Returns comprehensive analytics for the ERP.
     */
    public function index()
    {
        // 1. Revenue History (Last 7 days)
        $revenue_history = Sale::select(
            DB::raw('date(created_at) as date'),
            DB::raw('SUM(sale_price) as total')
        )
        ->where('created_at', '>=', now()->subDays(7))
        ->groupBy('date')
        ->orderBy('date', 'ASC')
        ->get();

        // 2. Top Selling Devices
        $top_devices = Sale::select('devices.model', 'devices.brand', DB::raw('COUNT(*) as sales_count'))
            ->join('devices', 'sales.device_id', '=', 'devices.id')
            ->groupBy('devices.model', 'devices.brand')
            ->orderBy('sales_count', 'DESC')
            ->limit(5)
            ->get();

        // 3. Inventory Value (Purchase price of unsold items)
        $inventory_value = Device::whereNull('sold_at')->sum('purchase_price');

        // 4. Expected Profit (Potential margin from unsold stock)
        $expected_profit = Device::whereNull('sold_at')->sum(DB::raw('suggested_price - purchase_price'));

        // 5. Sales by Condition
        $sales_by_condition = Device::select('condition', DB::raw('COUNT(*) as count'))
            ->whereNotNull('sold_at')
            ->groupBy('condition')
            ->pluck('count', 'condition');

        // Total unsold for percentage calc
        $total_devices = Device::whereNull('sold_at')->count();

        return response()->json([
            'revenue_history'    => $revenue_history,
            'top_devices'        => $top_devices,
            'inventory_value'    => (float) $inventory_value,
            'expected_profit'    => (float) $expected_profit,
            'sales_by_condition' => $sales_by_condition,
            'total_devices'      => $total_devices ?: 1,
        ]);
    }
}
