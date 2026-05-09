<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Pour un ERP local, nous pouvons soit utiliser une authentification réelle 
     * soit un identifiant par défaut pour simplifier.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ], [
            'email.required' => 'L\'adresse email est obligatoire.',
            'email.email' => 'L\'adresse email n\'est pas valide.',
            'password.required' => 'Le mot de passe est obligatoire.',
        ]);

        // Pour ce projet local, on accepte admin@techstock.ma / admin123
        // Ou on vérifie dans la base si un utilisateur existe.
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Identifiants invalides. Veuillez réessayer.'
            ], 401);
        }

        $token = $user->createToken('erp-token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user,
            'message' => 'Connexion réussie.'
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnecté avec succès.']);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();
        $data = $request->validate([
            'name'  => 'required|string|max:255',
            'email' => "required|email|unique:users,email,{$user->id}",
        ], [
            'name.required'  => 'Le nom est obligatoire.',
            'email.required' => 'L\'adresse email est obligatoire.',
            'email.email'    => 'L\'adresse email n\'est pas valide.',
            'email.unique'   => 'Cette adresse email est déjà utilisée.',
        ]);

        $user->update($data);
        return response()->json(['user' => $user, 'message' => 'Profil mis à jour avec succès.']);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'password'         => 'required|min:8|confirmed',
        ], [
            'current_password.required' => 'Le mot de passe actuel est obligatoire.',
            'password.required'         => 'Le nouveau mot de passe est obligatoire.',
            'password.min'              => 'Le nouveau mot de passe doit faire au moins 8 caractères.',
            'password.confirmed'        => 'La confirmation du mot de passe ne correspond pas.',
        ]);

        $user = $request->user();

        if (!Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Le mot de passe actuel est incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);
        return response()->json(['message' => 'Mot de passe modifié avec succès.']);
    }
}
