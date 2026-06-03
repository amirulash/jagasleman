import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';

const badgeClass = {
    pending: 'bg-[#D8E4ED] text-[#1A3348]',
    approved: 'bg-[#D8E4ED] text-[#1A3348]',
    rejected: 'bg-rose-100 text-rose-800',
};

export default function AdminReports({ reports }) {
    const { flash, errors } = usePage().props;
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');

    const approveReport = (reportId) => {
        router.patch(
            route('admin.reports.update-status', reportId),
            { status: 'approved' },
            { preserveScroll: true },
        );
    };

    const openReject = (reportId) => {
        setRejectingId(reportId);
        setRejectionReason('');
    };

    const submitReject = (reportId) => {
        router.patch(
            route('admin.reports.update-status', reportId),
            {
                status: 'rejected',
                rejection_reason: rejectionReason,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setRejectingId(null);
                    setRejectionReason('');
                },
            },
        );
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="text-xl font-semibold leading-tight text-gray-800">Admin Moderasi Laporan</h2>}
        >
            <Head title="Admin Reports" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-4 px-4 sm:px-6 lg:px-8">
                    <div className="flex gap-2">
                        <Link
                            href={route('admin.reports.index')}
                            className="rounded-md border border-stone-600 bg-stone-600 px-3 py-2 text-sm font-medium text-white"
                        >
                            Report Approval
                        </Link>
                        <Link
                            href={route('admin.users.index')}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
                        >
                            User Approval
                        </Link>
                    </div>

                    {flash?.success && (
                        <div className="rounded-md border border-[#D8E4ED] bg-[#EFF4F8] px-4 py-3 text-sm text-[#1A3348]">
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
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Judul</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Pelapor</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Lokasi</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Reviewer</th>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reports.map((report) => (
                                        <tr key={report.id}>
                                            <td className="px-4 py-3 align-top">
                                                <div className="font-semibold text-gray-900">{report.title}</div>
                                                <div className="mt-1 text-xs text-gray-500">{report.description}</div>
                                                {report.rejection_reason && (
                                                    <div className="mt-2 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700">
                                                        Alasan tolak: {report.rejection_reason}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 align-top text-gray-700">
                                                {report.user?.name ?? report.reporter_name ?? '-'}
                                                <div className="text-xs text-gray-500">{report.user?.email ?? report.reporter_email ?? '-'}</div>
                                                <div className="text-xs text-gray-500">{report.reporter_phone ?? '-'}</div>
                                            </td>
                                            <td className="px-4 py-3 align-top text-gray-700">{report.location ?? '-'}</td>
                                            <td className="px-4 py-3 align-top">
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeClass[report.status]}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 align-top text-gray-700">
                                                {report.reviewer?.name ?? '-'}
                                                <div className="text-xs text-gray-500">
                                                    {report.reviewed_at ? new Date(report.reviewed_at).toLocaleString() : '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        className="rounded bg-[#D95F5F] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1A3348]"
                                                        onClick={() => approveReport(report.id)}
                                                    >
                                                        Setujui
                                                    </button>

                                                    {rejectingId === report.id ? (
                                                        <div className="space-y-2">
                                                            <textarea
                                                                value={rejectionReason}
                                                                onChange={(event) => setRejectionReason(event.target.value)}
                                                                rows={3}
                                                                className="w-56 rounded border-gray-300 text-xs shadow-sm focus:border-stone-500 focus:ring-stone-500"
                                                                placeholder="Alasan penolakan"
                                                            />
                                                            {errors?.rejection_reason && (
                                                                <div className="text-xs text-rose-600">{errors.rejection_reason}</div>
                                                            )}
                                                            <div className="flex gap-2">
                                                                <button
                                                                    type="button"
                                                                    className="rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                                                                    onClick={() => submitReject(report.id)}
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
                                                            onClick={() => openReject(report.id)}
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
