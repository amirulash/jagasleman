<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'humas.ressleman@gmail.com'],
            [
                'name' => 'Admin JagaSleman',
                'password' => Hash::make('admin12345'),
                'email_verified_at' => now(),
                'role' => 'admin',
                'approval_status' => 'approved',
                'approved_at' => now(),
            ],
        );
    }
}
