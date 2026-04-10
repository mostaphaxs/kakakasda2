<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User; 
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class UserController extends Controller
{
    public function login(Request $request)
    {
        $credentiels = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required']
        ]);

        if (Auth::attempt($credentiels)) {
            // 1. Get the actual user object from Auth
            /** @var \App\Models\User $user */
            $user = Auth::user();

            // 2. Fix: Call createToken() ON the $user object
            $token = $user->createToken("auth_token")->plainTextToken;

            return response()->json([
                "status" => "success",
                "message" => "Login avec succès",
                // 3. Fix: Mapping the correct fields
                "user" => [
                    "name" => $user->name, 
                    "email" => $user->email
                ],
                "token" => $token
            ]);
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Les identifiants ne correspondent pas.',
        ], 401);
    }

    /**
     * Update user profile (email).
     */
    public function updateProfile(Request $request)
    {
        $user = Auth::user();
        if (!$user instanceof User) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        $validated = $request->validate([
            'email' => ['required', 'email', 'unique:users,email,' . $user->id],
            'name'  => ['required', 'string', 'max:255'],
        ]);

        $user->update($validated);

        return response()->json([
            "status" => "success",
            "message" => "Profil mis à jour avec succès",
            "user" => [
                "name" => $user->name,
                "email" => $user->email
            ]
        ]);
    }

    /**
     * Update user password.
     */
    public function updatePassword(Request $request)
    {
        $user = Auth::user();
        if (!$user instanceof User) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user->update([
            'password' => Hash::make($request->password),
        ]);

        return response()->json([
            "status" => "success",
            "message" => "Mot de passe mis à jour avec succès"
        ]);
    }
}