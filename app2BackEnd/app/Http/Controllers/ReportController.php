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
        // 1. Revenue History (Last 30 days)
        $revenue_history = Sale::select(
            DB::raw('date(created_at) as date'),
            DB::raw('SUM(sale_price) as total')
        )
        ->where('created_at', '>=', now()->subDays(30))
        ->groupBy('date')
        ->orderBy('date', 'ASC')
        ->get();

        // 1b. Total Revenue (All time or this month, let's say Total)
        $total_revenue = Sale::sum('sale_price');

        // 1c. Realized Net Profit (Total Sales - Purchase Price of Sold Items)
        $net_profit_realized = Sale::join('devices', 'sales.device_id', '=', 'devices.id')
            ->sum(DB::raw('sales.sale_price - devices.purchase_price'));

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

        // 6. Purchases / Expenses
        $total_purchases = \App\Models\Purchase::sum('total_amount');
        $unpaid_supplier_debt = \App\Models\Purchase::sum(DB::raw('total_amount - paid_amount'));

        // 7. Top Customers
        $top_customers = Sale::select('customers.name', DB::raw('COUNT(sales.id) as purchases_count'), DB::raw('SUM(sales.sale_price) as total_spent'))
            ->join('customers', 'sales.customer_id', '=', 'customers.id')
            ->groupBy('customers.id', 'customers.name')
            ->orderBy('total_spent', 'DESC')
            ->limit(5)
            ->get();

        // 8. Stock Allocation by Brand
        $stock_by_brand = Device::select('brand', DB::raw('COUNT(*) as count'))
            ->whereNull('sold_at')
            ->groupBy('brand')
            ->orderBy('count', 'DESC')
            ->get();

        return response()->json([
            'revenue_history'      => $revenue_history,
            'total_revenue'        => (float) $total_revenue,
            'net_profit_realized'  => (float) $net_profit_realized,
            'top_devices'          => $top_devices,
            'inventory_value'      => (float) $inventory_value,
            'expected_profit'      => (float) $expected_profit,
            'sales_by_condition'   => $sales_by_condition,
            'total_devices'        => $total_devices ?: 1,
            'total_purchases'      => (float) $total_purchases,
            'unpaid_supplier_debt' => (float) $unpaid_supplier_debt,
            'top_customers'        => $top_customers,
            'stock_by_brand'       => $stock_by_brand,
        ]);
    }
}
