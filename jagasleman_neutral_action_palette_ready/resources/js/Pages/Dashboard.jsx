import AdminLayout from '@/Layouts/AdminLayout';
import { Head, Link } from '@inertiajs/react';
import { useMemo } from 'react';
import { emergencyContacts, incidents } from '@/data/dummy';
import { ArrowRight, BarChart3, Download, FileCheck2, Home, MapPin, Shield, Siren } from 'lucide-react';

function StatCard({ label, value, description, icon: Icon }) {
    return (
        <div className="rounded-3xl border border-[#D8E4ED] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-[#1A3348]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D95F5F] dark:text-[#D95F5F]">{label}</p>
                    <p className="mt-2 text-3xl font-black text-[#0F1F2E] dark:text-[#EFF4F8]">{value}</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#1A3348]/65 dark:text-[#EFF4F8]/60">{description}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF4F8] text-[#D95F5F] dark:bg-[#0F1F2E]/70 dark:text-[#D95F5F]">
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const stats = useMemo(() => {
        const uniqueDistricts = new Set(incidents.map((incident) => incident.kecamatan)).size;
        const activeIncidents = incidents.filter((incident) => incident.status === 'Aktif').length;
        const topDistrict = incidents.reduce((acc, incident) => {
            const next = (acc.map[incident.kecamatan] ?? 0) + 1;
            acc.map[incident.kecamatan] = next;
            if (next > acc.max) {
                acc.max = next;
                acc.name = incident.kecamatan;
            }
            return acc;
        }, { map: {}, max: 0, name: '-' });

        return {
            totalIncidents: incidents.length,
            activeIncidents,
            totalContacts: emergencyContacts.length,
            uniqueDistricts,
            topDistrict: topDistrict.name,
        };
    }, []);

    return (
        <AdminLayout title="Dashboard Admin">
            <Head title="Dashboard Admin" />
            <div className="space-y-6">
                <section className="overflow-hidden rounded-[2rem] border border-white/10r p-6 text-white shadow-2xl shadow-[#0F1F2E]/20 md:p-8">
                    <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#D95F5F]">Admin Control Center</p>
                            <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-4xl">
                                Pantau WebGIS, validasi laporan, dan kelola data kejadian dari satu dashboard.
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-[#EFF4F8]/72">
                                Tampilan dashboard dibuat ringkas agar admin langsung masuk ke tugas utama tanpa daftar laporan panjang di halaman awal.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            <Link href="/" className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-[#0F1F2E] transition hover:bg-[#EFF4F8]">
                                <Home className="mr-2 h-4 w-4" />
                                Beranda
                            </Link>
                            <Link href={route('admin.reports.index')} className="inline-flex h-11 items-center justify-center rounded-2xl bg-[#D95F5F] px-4 text-sm font-black text-white transition hover:bg-[#79c5a2]">
                                <FileCheck2 className="mr-2 h-4 w-4" />
                                Validasi Laporan
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Total Kejadian" value={stats.totalIncidents} description="Data kepolisian yang masuk ke peta." icon={Siren} />
                    <StatCard label="Kejadian Aktif" value={stats.activeIncidents} description="Titik yang masih perlu pemantauan." icon={BarChart3} />
                    <StatCard label="Kontak Darurat" value={stats.totalContacts} description="Polsek dan fasilitas kesehatan." icon={Shield} />
                    <StatCard label="Kecamatan" value={stats.uniqueDistricts} description={`Area dominan: ${stats.topDistrict}`} icon={MapPin} />
                </section>

                <section className="grid gap-5 lg:grid-cols-3">
                    {[
                        { title: 'Manajemen Laporan', desc: 'Setujui, tolak, dan unduh data pelaporan masyarakat.', href: route('admin.reports.index'), icon: FileCheck2, cta: 'Buka Laporan' },
                        { title: 'Lihat WebGIS Publik', desc: 'Cek tampilan peta, hotspot, dan marker kejadian dari sisi pengguna.', href: '/webgis', icon: MapPin, cta: 'Buka Peta' },
                        { title: 'Export Data', desc: 'Fitur unduh Excel tersedia di halaman laporan masuk.', href: route('admin.reports.index'), icon: Download, cta: 'Unduh dari Laporan' },
                    ].map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link key={item.title} href={item.href} className="group rounded-[2rem] border border-[#D8E4ED] bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#D95F5F] hover:shadow-xl dark:border-white/10 dark:bg-[#1A3348]">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFF4F8] text-[#D95F5F] dark:bg-[#0F1F2E]/70 dark:text-[#D95F5F]">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <h3 className="mt-4 text-lg font-black text-[#0F1F2E] dark:text-[#EFF4F8]">{item.title}</h3>
                                <p className="mt-2 text-sm font-semibold leading-relaxed text-[#1A3348]/65 dark:text-[#EFF4F8]/60">{item.desc}</p>
                                <span className="mt-4 inline-flex items-center text-sm font-black text-[#D95F5F] dark:text-[#D95F5F]">
                                    {item.cta}
                                    <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" />
                                </span>
                            </Link>
                        );
                    })}
                </section>
            </div>
        </AdminLayout>
    );
}
