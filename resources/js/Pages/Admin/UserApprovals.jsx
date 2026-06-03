import AdminLayout from '@/Layouts/AdminLayout';
import { Head, router, usePage } from '@inertiajs/react';
import { CheckCircle2, Clock3, ShieldCheck, UserPlus, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

const badgeClass = {
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rejected: 'border-red-200 bg-red-50 text-red-700',
};

const badgeLabel = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
};

export default function UserApprovals({ users = [] }) {
    const { flash, errors } = usePage().props;
    const [rejectingId, setRejectingId] = useState(null);
    const [approvalNote, setApprovalNote] = useState('');

    const summary = useMemo(() => ({
        pending: users.filter((user) => user.approval_status === 'pending').length,
        approved: users.filter((user) => user.approval_status === 'approved').length,
        rejected: users.filter((user) => user.approval_status === 'rejected').length,
    }), [users]);

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
        <AdminLayout title="Kelola Admin">
            <Head title="Kelola Admin" />

            <div className="space-y-6">
                <section className="overflow-hidden rounded-[2rem] border border-[#BDE7E1] bg-white p-6 shadow-xl shadow-slate-200/70 lg:p-8">
                    <div className="grid gap-5 lg:grid-cols-[1fr_.85fr] lg:items-center">
                        <div>
                            <div className="inline-flex items-center rounded-full border border-[#BDE7E1] bg-[#F2FAF6] px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#334155]">
                                <UserPlus className="mr-2 h-3.5 w-3.5" />
                                Kelola Admin
                            </div>
                            <h1 className="mt-4 text-3xl font-black tracking-tight text-[#07324A] md:text-4xl">
                                Setujui admin baru.
                            </h1>
                            <p className="mt-3 max-w-3xl text-sm font-semibold leading-relaxed text-slate-600">
                                Akun yang mendaftar akan muncul di sini sebelum dapat masuk ke dashboard admin.
                            </p>
                        </div>

                        <div className="grid grid-cols-3 gap-3 rounded-[2rem] border border-[#BDE7E1] bg-[#F8FAFC] p-4">
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-center text-amber-700">
                                <Clock3 className="mx-auto h-5 w-5" />
                                <p className="mt-2 text-2xl font-black">{summary.pending}</p>
                                <p className="text-[11px] font-black">Menunggu</p>
                            </div>
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-700">
                                <CheckCircle2 className="mx-auto h-5 w-5" />
                                <p className="mt-2 text-2xl font-black">{summary.approved}</p>
                                <p className="text-[11px] font-black">Disetujui</p>
                            </div>
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
                                <XCircle className="mx-auto h-5 w-5" />
                                <p className="mt-2 text-2xl font-black">{summary.rejected}</p>
                                <p className="text-[11px] font-black">Ditolak</p>
                            </div>
                        </div>
                    </div>
                </section>

                {flash?.success && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
                        {flash.success}
                    </div>
                )}

                {flash?.error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
                        {flash.error}
                    </div>
                )}

                <section className="overflow-hidden rounded-[2rem] border border-[#BDE7E1] bg-white shadow-xl shadow-slate-200/60">
                    <div className="border-b border-[#BDE7E1] px-5 py-4">
                        <h2 className="text-lg font-black text-[#07324A]">Daftar Pendaftar Admin</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">Setujui akun yang valid atau tolak akun yang tidak sesuai.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-[980px] w-full divide-y divide-[#BDE7E1] text-sm">
                            <thead className="bg-[#07324A] text-left text-[11px] uppercase tracking-[0.14em] text-white">
                                <tr>
                                    <th className="px-5 py-4 font-black">Nama</th>
                                    <th className="px-5 py-4 font-black">Email</th>
                                    <th className="px-5 py-4 font-black">Status</th>
                                    <th className="px-5 py-4 font-black">Catatan</th>
                                    <th className="px-5 py-4 font-black">Diproses Oleh</th>
                                    <th className="px-5 py-4 font-black">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#BDE7E1] bg-white">
                                {users.length ? users.map((user) => (
                                    <tr key={user.id} className="transition hover:bg-[#F8FAFC]">
                                        <td className="px-5 py-4 align-top font-black text-[#07324A]">{user.name}</td>
                                        <td className="px-5 py-4 align-top font-semibold text-slate-600">{user.email}</td>
                                        <td className="px-5 py-4 align-top">
                                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${badgeClass[user.approval_status] || badgeClass.pending}`}>
                                                {badgeLabel[user.approval_status] || user.approval_status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 align-top text-xs font-semibold text-slate-600">{user.approval_note ?? '-'}</td>
                                        <td className="px-5 py-4 align-top text-xs font-semibold text-slate-600">
                                            {user.approver?.name ?? '-'}
                                            <div>{user.approved_at ? new Date(user.approved_at).toLocaleString('id-ID') : '-'}</div>
                                        </td>
                                        <td className="px-5 py-4 align-top">
                                            {user.approval_status === 'pending' ? (
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        type="button"
                                                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700"
                                                        onClick={() => approveUser(user.id)}
                                                    >
                                                        Setujui
                                                    </button>

                                                    {rejectingId === user.id ? (
                                                        <div className="w-full space-y-2">
                                                            <textarea
                                                                value={approvalNote}
                                                                onChange={(event) => setApprovalNote(event.target.value)}
                                                                rows={3}
                                                                className="w-64 rounded-xl border border-[#BDE7E1] px-3 py-2 text-xs font-semibold shadow-sm focus:border-[#334155] focus:ring-[#BDE7E1]"
                                                                placeholder="Catatan penolakan"
                                                            />
                                                            {errors?.approval_note && (
                                                                <div className="text-xs font-bold text-red-600">{errors.approval_note}</div>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white hover:bg-red-700"
                                                                    onClick={() => submitReject(user.id)}
                                                                >
                                                                    Tolak
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    className="rounded-xl border border-[#BDE7E1] px-3 py-2 text-xs font-black text-slate-700"
                                                                    onClick={() => setRejectingId(null)}
                                                                >
                                                                    Batal
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700"
                                                            onClick={() => openReject(user.id)}
                                                        >
                                                            Tolak
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="inline-flex items-center gap-2 rounded-xl bg-[#F2FAF6] px-3 py-2 text-xs font-black text-[#334155]">
                                                    <ShieldCheck className="h-4 w-4" />
                                                    Selesai
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-sm font-bold text-slate-500">
                                            Belum ada pendaftar admin.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AdminLayout>
    );
}
