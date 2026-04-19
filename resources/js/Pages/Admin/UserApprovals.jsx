import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const badgeClass = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-rose-100 text-rose-800',
};

export default function UserApprovals({ users }) {
    const { flash, errors } = usePage().props;
    const [rejectingId, setRejectingId] = useState(null);
    const [approvalNote, setApprovalNote] = useState('');

    const approveUser = (userId) => {
        router.patch(
            route('admin.users.update-status', userId),
            { approval_status: 'approved' },
            { preserveScroll: true },
        );
    };

    const openReject = (userId) => {
        setRejectingId(userId);
        setApprovalNote('');
    };

    const submitReject = (userId) => {
        router.patch(
            route('admin.users.update-status', userId),
            { approval_status: 'rejected', approval_note: approvalNote },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejectingId(null);
                    setApprovalNote('');
                },
            },
        );
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Admin User Approval</h2>}
        >
            <Head title="User Approval" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-2">
                        <Link
                            href={route('admin.reports.index')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                        >
                            Report Approval
                        </Link>
                        <Link
                            href={route('admin.users.index')}
                            className="rounded-md border border-indigo-600 bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
                        >
                            User Approval
                        </Link>
                    </div>

                    {flash?.success && (
                        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                            {flash.success}
                        </div>
                    )}

                    {flash?.error && (
                        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                            {flash.error}
                        </div>
                    )}

                    <div className="overflow-hidden rounded-lg bg-white shadow">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Nama</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Catatan</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Disetujui Oleh</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-4 py-3 align-top text-gray-900 font-semibold">{user.name}</td>
                                            <td className="px-4 py-3 align-top text-gray-700">{user.email}</td>
                                            <td className="px-4 py-3 align-top">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass[user.approval_status]}`}>
                                                    {user.approval_status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-top text-xs text-gray-600">{user.approval_note ?? '-'}</td>
                                            <td className="px-4 py-3 align-top text-xs text-gray-600">
                                                {user.approver?.name ?? '-'}
                                                <div>{user.approved_at ? new Date(user.approved_at).toLocaleString() : '-'}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                                                        onClick={() => approveUser(user.id)}
                                                    >
                                                        Setujui
                                                    </button>

                                                    {rejectingId === user.id ? (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                value={approvalNote}
                                                                onChange={(event) => setApprovalNote(event.target.value)}
                                                                rows={3}
                                                                className="w-56 rounded border-gray-300 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                                                                placeholder="Catatan penolakan"
                                                            />
                                                            {errors?.approval_note && (
                                                                <div className="text-xs text-rose-600">{errors.approval_note}</div>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                                                                    onClick={() => submitReject(user.id)}
                                                                >
                                                                    Konfirmasi Tolak
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="rounded border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700"
                                                                    onClick={() => setRejectingId(null)}
                                                                >
                                                                    Batal
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                                                            onClick={() => openReject(user.id)}
                                                        >
                                                            Tolak
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
