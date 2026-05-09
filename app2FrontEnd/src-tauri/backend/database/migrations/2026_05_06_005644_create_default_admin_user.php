<?php

use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Hash;

return new class extends Migration {
    public function up(): void {
        // Créer l'utilisateur admin par défaut s'il n'existe pas
        if (User::where('email', 'admin@techstock.ma')->count() === 0) {
            User::create([
                'name' => 'Administrateur',
                'email' => 'admin@techstock.ma',
                'password' => Hash::make('admin123'),
            ]);
        }
    }

    public function down(): void {
        User::where('email', 'admin@techstock.ma')->delete();
    }
};
