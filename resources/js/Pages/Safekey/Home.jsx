import { Link } from '@inertiajs/react';
import {
    Map,
    FileWarning,
    BarChart3,
    Newspaper,
    Phone,
    AlertTriangle,
    ArrowRight,
    Shield,
} from 'lucide-react';
import SafekeyLayout from '@/Layouts/SafekeyLayout';
import { Card, CardContent } from '@/Components/Safekey/ui/card';
import { Button } from '@/Components/Safekey/ui/button';
import { Badge } from '@/Components/Safekey/ui/badge';

const features = [
    {
        title: 'Peta Kejadian',
        desc: 'Pantau kejadian di seluruh Sleman secara real-time',
        icon: Map,
        url: '/webgis',
        color: 'text-police',
    },
    {
        title: 'Laporkan',
        desc: 'Laporkan kejadian yang Anda saksikan',
        icon: FileWarning,
        url: '/report',
        color: 'text-emergency',
    },
    {
        title: 'Statistik',
        desc: 'Analisis tren dan hotspot keamanan',
        icon: BarChart3,
        url: '/statistics',
        color: 'text-warning',
    },
    {
        title: 'Berita',
        desc: 'Informasi keamanan terkini',
        icon: Newspaper,
        url: '/news',
        color: 'text-success',
    },
    {
        title: 'Kontak Bantuan',
        desc: 'Cari Polsek, rumah sakit, dan nomor bantuan resmi',
        icon: Phone,
        url: '/emergency',
        color: 'text-[#F47B52]',
    },
];

const recentIncidents = [
    { id: '1', type: 'Pencurian', status: 'Aktif', description: 'Pencurian motor di area parkir minimarket', date: '19 Apr 2026', time: '21:30' },
    { id: '2', type: 'Kecelakaan', status: 'Ditangani', description: 'Tabrakan beruntun di Ring Road Utara', date: '19 Apr 2026', time: '18:10' },
    { id: '3', type: 'Vandalisme', status: 'Selesai', description: 'Perusakan fasilitas umum di kawasan kampus', date: '18 Apr 2026', time: '23:45' },
    { id: '4', type: 'Perampokan', status: 'Aktif', description: 'Perampokan minimarket di wilayah Depok', date: '18 Apr 2026', time: '20:15' },
];

const statusBadge = {
    Aktif: 'bg-emergency/10 text-emergency border-emergency/20',
    Ditangani: 'bg-warning/10 text-warning border-warning/20',
    Selesai: 'bg-success/10 text-success border-success/20',
};

export default function Home() {
    return (
        <SafekeyLayout>
            <div className="min-h-[calc(100vh-4rem)] from-primary/95 via-primary to-police pb-8">
                <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 space-y-6 text-white">
                    <div className="relative overflow-hidden rounded-2xl border border-white/20 bg-black/15 backdrop-blur-sm">
                        <img src="/images/crime-alert.png" alt="Tekstur keamanan" className="absolute inset-0 w-full h-full object-cover opacity-15" />
                        <div className="relative z-10 grid lg:grid-cols-[1.05fr_1fr] gap-6 p-5 md:p-7">
                            <div className="space-y-5">
                                <div className="flex items-center gap-2">
                                    <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <span className="text-sm font-medium text-white/90">Sistem Pemantauan Keamanan Sleman</span>
                                </div>

                                <div>
                                    <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">Selamat Datang di JagaSleman WebGIS</h1>
                                    <p className="text-white/80 mt-3 max-w-xl">
                                        Sebuah Platform WebGIS Interaktif untuk memantau dan melaporkan kejadian kejahatan Jalanan di Kabupaten Sleman
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <p className="font-semibold">Statistik Keamanan Sleman</p>
                                    <div className="grid sm:grid-cols-2 gap-2">
                                        <div className="rounded-lg border border-white/20 bg-black/20 p-3">
                                            <p className="text-xs text-white/75">Jumlah Kejadian Terkini</p>
                                            <p className="text-xl font-bold">96</p>
                                        </div>
                                        <div className="rounded-lg border border-white/20 bg-black/20 p-3">
                                            <p className="text-xs text-white/75">Kriminalitas Terbanyak</p>
                                            <p className="text-xl font-bold">Pencurian</p>
                                        </div>
                                        <div className="rounded-lg border border-white/20 bg-black/20 p-3 sm:col-span-2">
                                            <p className="text-xs text-white/75">Area Dominan</p>
                                            <p className="text-xl font-bold">Caturtunggal</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button asChild variant="secondary" className="text-police font-semibold">
                                        <Link href="/webgis">
                                            <Map className="w-4 h-4 mr-2" />
                                            Telusuri Peta
                                        </Link>
                                    </Button>
                                    <Button
                                        asChild
                                        variant="outline"
                                        className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                                    >
                                        <Link href="/report">
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Buat Laporan
                                        </Link>
                                    </Button>
                                </div>
                            </div>

                            <Card className="bg-card/95 border-police/40 overflow-hidden">
                                <CardContent className="p-3 md:p-4 space-y-3">
                                    <div className="rounded-xl overflow-hidden border border-border">
                                        <img src="/images/map-preview.png" alt="Preview peta kejadian" className="w-full h-[320px] object-cover" />
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        <Badge variant="outline" className="bg-emergency/10 text-emergency border-emergency/30">Darurat</Badge>
                                        <Badge variant="outline" className="bg-police/10 text-police border-police/30">Kejahatan</Badge>
                                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">Keamanan</Badge>
                                        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">Informasi</Badge>
                                    </div>
                                    <Button asChild className="w-full bg-police text-police-foreground hover:bg-police/90">
                                        <Link href="/webgis">Telusuri Peta</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
                        {features.map((feature) => (
                            <Link key={feature.url} href={feature.url}>
                                <Card className="h-full border-white/15 bg-black/20 hover:bg-black/30 transition-colors">
                                    <CardContent className="p-4 flex items-start gap-3">
                                        <div className={`p-2 rounded-lg bg-white/10 ${feature.color}`}>
                                            <feature.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-white">{feature.title}</p>
                                            <p className="text-xs text-white/70">{feature.desc}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>

                    <Card className="border-white/15 bg-black/20">
                        <CardContent className="p-4 md:p-5">
                            <div className="flex items-center justify-between mb-3">
                                <h2 className="font-bold text-white">Kejadian Terbaru</h2>
                                <Button asChild variant="ghost" size="sm" className="text-white hover:bg-white/10">
                                    <Link href="/webgis">
                                        Lihat Semua
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </Button>
                            </div>
                            <div className="space-y-2">
                                {recentIncidents.map((inc) => (
                                    <div
                                        key={inc.id}
                                        className="rounded-lg border border-white/10 bg-black/20 p-3 flex items-center gap-3"
                                    >
                                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                                            <AlertTriangle className="w-4 h-4 text-white/80" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="font-semibold text-sm text-white">{inc.type}</span>
                                                <Badge variant="outline" className={`text-[10px] ${statusBadge[inc.status]}`}>
                                                    {inc.status}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-white/70 truncate">{inc.description}</p>
                                        </div>
                                        <div className="text-right flex-shrink-0 text-white/75">
                                            <p className="text-xs font-medium">{inc.date}</p>
                                            <p className="text-xs">{inc.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </SafekeyLayout>
    );
}
