import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useMemo } from 'react';
import { MapView } from '@/components/MapView';
import { emergencyContacts, incidents } from '@/data/dummy';

export default function Dashboard() {
    const stats = useMemo(() => {
        const activeIncidents = incidents.filter((incident) => incident.status === 'Aktif').length;
        const resolvedIncidents = incidents.filter((incident) => incident.status === 'Selesai').length;
        const uniqueDistricts = new Set(incidents.map((incident) => incident.kecamatan)).size;
        const topDistrict = incidents.reduce(
            (accumulator, incident) => {
                const nextCount = (accumulator.map[incident.kecamatan] ?? 0) + 1;
                accumulator.map[incident.kecamatan] = nextCount;
                if (nextCount > accumulator.max) {
                    accumulator.max = nextCount;
                    accumulator.name = incident.kecamatan;
                }
                return accumulator;
            },
            { map: {}, max: 0, name: '-' },
        );

        return {
            totalIncidents: incidents.length,
            activeIncidents,
            resolvedIncidents,
            totalContacts: emergencyContacts.length,
            uniqueDistricts,
            topDistrict: topDistrict.name,
        };
    }, []);

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-semibold leading-tight text-gray-800">
                    Dashboard Keamanan Sleman
                </h2>
            }
        >
            <Head title="Dashboard" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Total Kejadian</p>
                            <p className="text-2xl font-bold text-red-600">{stats.totalIncidents}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Kejadian Aktif</p>
                            <p className="text-2xl font-bold text-amber-600">{stats.activeIncidents}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Kejadian Selesai</p>
                            <p className="text-2xl font-bold text-emerald-600">{stats.resolvedIncidents}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Kontak Darurat</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.totalContacts}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Total Kecamatan</p>
                            <p className="text-2xl font-bold text-slate-700">{stats.uniqueDistricts}</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-4">
                            <p className="text-xs text-gray-500">Area Dominan</p>
                            <p className="text-xl font-bold text-slate-800">{stats.topDistrict}</p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="border-b border-gray-200 px-4 py-3">
                            <h3 className="text-sm font-semibold text-gray-800">Peta Kejadian & Fasilitas Darurat</h3>
                            <p className="text-xs text-gray-500">Menampilkan titik kejadian, rumah sakit, dan polsek di Kabupaten Sleman.</p>
                        </div>
                        <div className="h-[65vh] min-h-[420px]">
                            <MapView incidents={incidents} contacts={emergencyContacts} zoom={12} center={[-7.716, 110.355]} />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
