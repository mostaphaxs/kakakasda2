<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DefaultUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 🛡️ Only create the user if the email is not already in the database
        if (!User::where('email', 'admin123@gmail.com')->exists()) {
            User::create([
                'name' => 'Aziz',
                'email' => 'admin123@gmail.com',
                'password' => Hash::make('admin123'),
            ]);
            
        }
    }
}