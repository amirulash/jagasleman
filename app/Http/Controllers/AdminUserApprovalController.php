<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserApprovalController extends Controller
{
    public function index(Request $request): Response
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $users = User::query()
            ->where('id', '!=', $request->user()->id)
            ->where(function ($query) {
                $query->where('role', 'user')
                    ->orWhere(function ($subQuery) {
                        $subQuery->where('role', 'admin')
                            ->whereNotNull('approved_by');
                    });
            })
            ->with('approver:id,name,email')
            ->latest()
            ->get(['id', 'name', 'email', 'role', 'approval_status', 'approved_by', 'approved_at', 'approval_note', 'created_at']);

        return Inertia::render('Admin/UserApprovals', [
            'users' => $users,
        ]);
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        if ($user->isAdmin()) {
            return back()->with('error', 'Akun admin utama tidak dapat diubah status persetujuannya.');
        }

        $validated = $request->validate([
            'approval_status' => ['required', 'in:approved,rejected'],
            'approval_note' => ['nullable', 'string', 'max:1000'],
        ]);

        if ($validated['approval_status'] === 'rejected' && blank($validated['approval_note'] ?? null)) {
            return back()->withErrors([
                'approval_note' => 'Catatan penolakan wajib diisi saat menolak pendaftar admin.',
            ]);
        }

        $user->update([
            'role' => $validated['approval_status'] === 'approved' ? 'admin' : 'user',
            'approval_status' => $validated['approval_status'],
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
            'approval_note' => $validated['approval_status'] === 'rejected' ? $validated['approval_note'] : null,
        ]);

        return back()->with('success', 'Status admin berhasil diperbarui.');
    }
}
