<?php

namespace App\Http\Controllers;

use App\Models\Device;
use App\Models\Customer;
use App\Models\Sale;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function index()
    {
        return response()->json([
            'total_devices'      => Device::count(),
            'new_devices'        => Device::where('condition', 'New')->count(),
            'used_devices'       => Device::where('condition', 'Used')->count(),
            'refurbished_devices'=> Device::where('condition', 'Refurbished')->count(),
            'total_customers'    => Customer::count(),
            'total_sales'        => Sale::count(),
            'revenue'            => Sale::whereMonth('created_at', now()->month)->sum('sale_price'),
        ]);
    }
}
