import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
    ArrowRight,
    BarChart3,
    CalendarDays,
    ChevronRight,
    Clock3,
    ExternalLink,
    Eye,
    FileWarning,
    Flame,
    Layers3,
    Map as MapIcon,
    MapPin,
    MessageCircle,
    MousePointer2,
    Navigation,
    Newspaper,
    Phone,
    Radar,
    Route,
    Send,
    Shield,
    ShieldCheck,
    Siren,
    Sparkles,
    TrendingUp,
    Users,
    X,
    Zap,
} from 'lucide-react';

import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { HomeHero } from '@/Components/HomeHero';
import { incidents, emergencyContacts } from '@/data/dummy';
import { beritaSleman } from '@/data/beritaSleman';
import { MapView } from '@/Components/MapView';
import { analyzeKDE } from '@/lib/kdeAnalysis';

type ChatMessage = {
    role: 'admin' | 'user';
    text: string;
};

type HomeNews = {
    id: string | number;
    title: string;
    date: string;
    category: string;
    location?: string;
    excerpt?: string;
    summary?: string;
    source?: string;
    url?: string;
};

type MapMode = 'hotspot' | 'titik' | 'analisis';

const features = [
    {
        title: 'Peta Kejadian',
        desc: 'Lihat persebaran kejadian pada peta.',
        detail: 'Peta menampilkan titik kejadian, batas wilayah, hotspot, dan lokasi bantuan.',
        icon: MapIcon,
        href: '/webgis',
        label: 'Buka peta',
        bg: 'bg-[#F2FAF6]',
        text: 'text-[#F47B52]',
        border: 'border-[#BDE7E1]',
        solid: 'bg-[#F47B52]',
        soft: 'bg-[#BDE7E1]',
    },
    {
        title: 'Hotspot Rawan',
        desc: 'Kenali area dengan kejadian terbanyak.',
        detail: 'Hotspot membantu pengguna melihat wilayah yang memerlukan perhatian.',
        icon: Radar,
        href: '/webgis',
        label: 'Lihat hotspot',
        bg: 'bg-[#F2FAF6]',
        text: 'text-[#F47B52]',
        border: 'border-[#BDE7E1]',
        solid: 'bg-[#0B6E78]',
        soft: 'bg-[#BDE7E1]',
    },
    {
        title: 'Lapor Cepat',
        desc: 'Kirim laporan kejadian melalui formulir.',
        detail: 'Formulir memuat lokasi, jenis kejadian, waktu, keterangan, dan bukti foto.',
        icon: FileWarning,
        href: '/report',
        label: 'Buat laporan',
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        solid: 'bg-rose-600',
        soft: 'bg-rose-100',
    },
    {
        title: 'Statistik',
        desc: 'Lihat jumlah kejadian, kategori, wilayah, dan status laporan.',
        detail: 'Grafik membantu membaca perubahan data dari waktu ke waktu.',
        icon: BarChart3,
        href: '/statistics',
        label: 'Cek statistik',
        bg: 'bg-[#F2FAF6]',
        text: 'text-[#F47B52]',
        border: 'border-[#BDE7E1]',
        solid: 'bg-[#F47B52]',
        soft: 'bg-[#BDE7E1]',
    },
    {
        title: 'Berita Keamanan',
        desc: 'Baca pembaruan keamanan dan ketertiban.',
        detail: 'Berita menampilkan judul, tanggal, sumber, dan kategori.',
        icon: Newspaper,
        href: '/news',
        label: 'Baca berita',
        bg: 'bg-[#F2FAF6]',
        text: 'text-[#F47B52]',
        border: 'border-[#BDE7E1]',
        solid: 'bg-[#F47B52]',
        soft: 'bg-[#BDE7E1]',
    },
    {
        title: 'Kontak Bantuan',
        desc: 'Cari Polsek dan fasilitas kesehatan terdekat.',
        detail: 'Halaman bantuan memuat telepon, alamat, rute, dan jarak.',
        icon: Phone,
        href: '/emergency',
        label: 'Cari bantuan',
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-200',
        solid: 'bg-red-600',
        soft: 'bg-red-100',
    },
];

const quickChatQuestions = [
    'Bagaimana cara membuat laporan?',
    'Lihat hotspot rawan',
    'Cari bantuan terdekat',
];

const mapModeOptions: {
    key: MapMode;
    title: string;
    desc: string;
    icon: typeof Radar;
}[] = [
        {
            key: 'hotspot',
            title: 'Hotspot',
            desc: 'Fokus warna rawan',
            icon: Flame,
        },
        {
            key: 'titik',
            title: 'Titik',
            desc: 'Fokus lokasi kejadian',
            icon: MapPin,
        },
        {
            key: 'analisis',
            title: 'Analisis',
            desc: 'Hotspot + zona',
            icon: Layers3,
        },
    ];

function getDateValue(date: string) {
    const value = new Date(date).getTime();
    return Number.isFinite(value) ? value : 0;
}

function formatDate(date: string) {
    const value = getDateValue(date);

    if (!value) return date;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

function shortText(text = '', max = 100) {
    if (!text) return 'Ringkasan berita tersedia di halaman berita.';
    if (text.length <= max) return text;
    return `${text.slice(0, max).trim()}...`;
}

function simplifyCrimeType(type?: string) {
    const text = (type || '').toLowerCase();

    if (text.includes('curas') || text.includes('kekerasan')) return 'Curas';
    if (text.includes('sajam') || text.includes('senjata')) return 'Sajam';
    if (text.includes('pengeroyokan')) return 'Pengeroyokan';
    if (text.includes('penganiayaan')) return 'Penganiayaan';
    if (text.includes('pemerasan')) return 'Pemerasan';
    if (text.includes('pengrusakan')) return 'Pengrusakan';

    return type || 'Kejadian';
}

function getNewsTone(category?: string) {
    const text = (category || '').toLowerCase();

    if (text.includes('kejahatan') || text.includes('kriminal')) {
        return {
            badge: 'bg-rose-50 text-rose-700 border-rose-200',
            icon: 'bg-rose-100 text-rose-700',
        };
    }

    if (text.includes('keamanan')) {
        return {
            badge: 'bg-[#F2FAF6] text-[#F47B52] border-[#BDE7E1]',
            icon: 'bg-[#BDE7E1] text-[#F47B52]',
        };
    }

    if (text.includes('himbauan') || text.includes('imbauan')) {
        return {
            badge: 'bg-[#F2FAF6] text-[#F47B52] border-[#BDE7E1]',
            icon: 'bg-[#BDE7E1] text-[#F47B52]',
        };
    }

    return {
        badge: 'bg-[#F2FAF6] text-[#F47B52] border-[#BDE7E1]',
        icon: 'bg-[#BDE7E1] text-[#F47B52]',
    };
}

function getChatReply(message: string) {
    const text = message.toLowerCase();

    if (text.includes('lapor') || text.includes('kejadian')) {
        return 'Buka menu Laporkan, pilih titik lokasi, lengkapi informasi kejadian, lalu kirim laporan Anda.';
    }

    if (text.includes('rawan') || text.includes('hotspot') || text.includes('peta')) {
        return 'Buka menu Peta Kejadian untuk melihat sebaran titik laporan, titik polisi, dan area yang perlu mendapat perhatian.';
    }

    if (text.includes('kontak') || text.includes('darurat') || text.includes('bantuan')) {
        return 'Buka menu Kontak Bantuan untuk menemukan bantuan resmi terdekat dan petunjuk rutenya.';
    }

    return 'Saya dapat membantu penggunaan peta, pelaporan kejadian, pembacaan statistik, dan pencarian kontak bantuan.';
}

function FloatingHelpChat() {
    const [isOpen, setIsOpen] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: 'admin',
            text: 'Halo, ada yang bisa saya bantu di JagaSleman?',
        },
    ]);

    const sendMessage = (value?: string) => {
        const finalMessage = (value ?? chatInput).trim();

        if (!finalMessage) return;

        setMessages((current) => [
            ...current,
            { role: 'user', text: finalMessage },
            { role: 'admin', text: getChatReply(finalMessage) },
        ]);

        setChatInput('');
    };

    return (
        <div className="fixed bottom-4 right-4 z-[90] sm:bottom-5 sm:right-5">
            {isOpen && (
                <div className="mb-3 w-[calc(100vw-1.5rem)] max-w-[350px] overflow-hidden rounded-[1.4rem] border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,.18)]">
                    <div className="relative bg-slate-950 px-4 py-3 text-white">
                        <div className="flex items-center gap-3 pr-9">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0B6E78]">
                                <MessageCircle className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                                <h3 className="truncate text-sm font-black">Asisten JagaSleman</h3>
                                <p className="text-xs text-white/60">
                                    Chat terbaru seputar peta, laporan, dan bantuan
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                            aria-label="Tutup bantuan cepat"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="bg-slate-50 px-3 py-3 dark:bg-[#102538]">
                        <div className="max-h-[230px] space-y-2.5 overflow-y-auto pr-1">
                            {messages.slice(-4).map((message, index) => (
                                <div
                                    key={`${message.role}-${index}`}
                                    className={`flex ${message.role === 'user'
                                        ? 'justify-end'
                                        : 'justify-start'
                                        }`}
                                >
                                    <div
                                        className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${message.role === 'user'
                                            ? 'rounded-br-md bg-[#F47B52] text-white'
                                            : 'rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-white/10 dark:bg-[#17324A] dark:text-white'
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <p className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-300">Menampilkan chat terbaru</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                            {quickChatQuestions.map((question) => (
                                <button
                                    key={question}
                                    type="button"
                                    onClick={() => sendMessage(question)}
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-[#F47B52] hover:text-[#07324A] dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                                >
                                    {question}
                                </button>
                            ))}
                        </div>

                        <div className="mt-3 flex items-center gap-2">
                            <input
                                value={chatInput}
                                onChange={(event) => setChatInput(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') sendMessage();
                                }}
                                placeholder="Tulis pertanyaan singkat..."
                                className="h-10 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#F47B52] dark:border-white/10 dark:bg-[#081521] dark:text-white dark:placeholder:text-white/55"
                            />

                            <button
                                type="button"
                                onClick={() => sendMessage()}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F47B52] text-white hover:bg-[#07324A]"
                                aria-label="Kirim pesan"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,.25)] hover:bg-[#07324A]"
                aria-label="Buka bantuan cepat"
            >
                <MessageCircle className="h-6 w-6" />
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Mascot card                                                          */
/* ------------------------------------------------------------------ */

type MascotCardProps = {
    stats: {
        totalIncidents: number;
        totalHotspots: number;
        dominantType: string;
        dominantPercent: number;
    };
};

const mascotTips = [
    'Halo! Ada kejadian mencurigakan? Laporkan sekarang!',
    'Cek peta hotspot untuk tahu area mana yang perlu diwaspadai.',
    'Keselamatanmu nomor satu. Simpan nomor darurat 110!',
    'Bersama kita jaga Sleman tetap aman dan kondusif.',
    'Laporan dari warga sangat membantu kami bergerak cepat!',
];

function MascotCard({ stats }: MascotCardProps) {
    const [tipIndex, setTipIndex] = useState(0);
    const [isWaving, setIsWaving] = useState(false);
    const [isBouncing, setIsBouncing] = useState(false);
    const [showBadge, setShowBadge] = useState(false);

    const cycleTip = () => {
        setTipIndex((prev) => (prev + 1) % mascotTips.length);
        setIsWaving(true);
        setTimeout(() => setIsWaving(false), 700);
    };

    const handleMascotClick = () => {
        setIsBouncing(true);
        setShowBadge(true);
        cycleTip();
        setTimeout(() => {
            setIsBouncing(false);
            setShowBadge(false);
        }, 1200);
    };

    return (
        <div className="relative flex flex-col items-center justify-center">
            <style>{`
                @keyframes mascot-float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes mascot-bounce {
                    0%, 100% { transform: translateY(0) scale(1); }
                    30% { transform: translateY(-18px) scale(1.06); }
                    60% { transform: translateY(-4px) scale(0.97); }
                }
                @keyframes mascot-wave {
                    0%, 100% { transform: rotate(0deg); transform-origin: bottom right; }
                    25% { transform: rotate(20deg); transform-origin: bottom right; }
                    75% { transform: rotate(-8deg); transform-origin: bottom right; }
                }
                @keyframes badge-pop {
                    0% { transform: scale(0) translateY(8px); opacity: 0; }
                    60% { transform: scale(1.1) translateY(-4px); opacity: 1; }
                    100% { transform: scale(1) translateY(0); opacity: 1; }
                }
                @keyframes shine-sweep {
                    0% { left: -60%; }
                    100% { left: 120%; }
                }
                .mascot-float { animation: mascot-float 3.2s ease-in-out infinite; }
                .mascot-bounce { animation: mascot-bounce 0.7s cubic-bezier(.36,.07,.19,.97) both; }
                .badge-pop { animation: badge-pop 0.4s cubic-bezier(.34,1.56,.64,1) forwards; }
                .mascot-card-shine::after {
                    content: '';
                    position: absolute;
                    top: 0; bottom: 0; width: 40%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
                    animation: shine-sweep 2.8s ease-in-out infinite;
                }
            `}</style>

            {/* Card container */}
            <div className="jagasleman-mascot-card jaga-mascot-card relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/20 bg-[#07324A] p-6 text-white shadow-2xl">
                {/* Decorative circles */}
                <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/10" />
                <div className="pointer-events-none absolute right-4 top-24 h-20 w-20 rounded-full bg-[#F47B52]/20" />

                {/* Mascot area */}
                <div className="relative flex flex-col items-center pb-2 pt-2">
                    {/* Glow behind mascot */}
                    <div className="absolute top-4 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

                    {/* Mascot image */}
                    <button
                        type="button"
                        onClick={handleMascotClick}
                        className="group relative cursor-pointer outline-none"
                        aria-label="Sentuh maskot untuk melihat pesan singkat keamanan"
                    >
                        <div
                            className={`relative z-10 select-none transition-transform ${isBouncing ? 'mascot-bounce' : 'mascot-float'
                                }`}
                        >
                            <img
                                src="/images/Maskot_Web.png"
                                alt="Maskot Polisi JagaSleman"
                                className={`h-44 w-auto drop-shadow-2xl ${isWaving ? 'mascot-img-wave' : ''
                                    }`}
                                draggable={false}
                            />
                        </div>

                        {/* Tap hint ring */}
                        <span className="absolute inset-0 rounded-full transition-all duration-300 group-hover:bg-white/5 group-focus-visible:ring-2 group-focus-visible:ring-white/50" />

                        {/* Pop badge on click */}
                        {showBadge && (
                            <div className="badge-pop absolute -right-4 -top-2 z-20 whitespace-nowrap rounded-full border border-white/30 bg-[#F47B52] px-3 py-1 text-[11px] font-black text-white shadow-lg">
                                ✨ Tips baru!
                            </div>
                        )}
                    </button>

                    <p className="mascot-tip-caption mt-1 text-center text-[11px] font-bold text-[#E9F8F3]/85">
                        Sentuh maskot untuk melihat pesan singkat
                    </p>
                </div>

                {/* Speech bubble / tip */}
                <div className="jaga-mascot-tip relative mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    {/* Tail */}
                    <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-sm border-l border-t border-slate-200 bg-white" />

                    <p className="text-center text-sm font-bold leading-relaxed text-[#07324A]">
                        "{mascotTips[tipIndex]}"
                    </p>

                    {/* Tip dots */}
                    <div className="mt-3 flex items-center justify-center gap-1.5">
                        {mascotTips.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => {
                                    setTipIndex(i);
                                    setIsWaving(true);
                                    setTimeout(() => setIsWaving(false), 700);
                                }}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i === tipIndex
                                    ? 'w-5 bg-[#F47B52]'
                                    : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                                    }`}
                                aria-label={`Tip ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                    {[
                        { label: 'Laporan', value: stats.totalIncidents },
                        { label: 'Hotspot', value: stats.totalHotspots },
                        { label: 'Dominan', value: stats.dominantType },
                    ].map((item) => (
                        <div key={item.label} className="rounded-2xl border border-white/14 bg-white/10 px-3 py-2 text-center backdrop-blur">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#BDE7E1]">{item.label}</p>
                            <p className="mt-1 truncate text-sm font-black text-white">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function Index() {
    const [mapMode, setMapMode] = useState<MapMode>('hotspot');

    const hotspotClusters = useMemo(() => analyzeKDE(incidents, 2.5), []);

    const homeStats = useMemo(() => {
        const districtMap = new globalThis.Map<string, number>();
        const typeMap = new globalThis.Map<string, number>();

        incidents.forEach((item) => {
            const district = item.kecamatan || 'Tidak diketahui';
            const type = simplifyCrimeType(item.type || item.kategori);

            districtMap.set(district, (districtMap.get(district) || 0) + 1);
            typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });

        const topDistricts = Array.from(districtMap.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);

        const topTypes = Array.from(typeMap.entries())
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);

        const maxDistrictTotal = Math.max(
            ...topDistricts.map((item) => item.total),
            1,
        );

        const dominantType = topTypes[0]?.name || 'Kejadian';
        const dominantTotal = topTypes[0]?.total || 0;

        return {
            totalIncidents: incidents.length,
            totalHotspots: hotspotClusters.length,
            totalContacts: emergencyContacts.length,
            totalPolice: emergencyContacts.filter((item: any) => String(item.type || "").toLowerCase().includes("polsek")).length,
            totalIncidentPoints: incidents.length + emergencyContacts.filter((item: any) => String(item.type || "").toLowerCase().includes("polsek")).length,
            topDistricts,
            topTypes,
            dominantType,
            dominantTotal,
            maxDistrictTotal,
            dominantPercent: incidents.length
                ? Math.round((dominantTotal / incidents.length) * 100)
                : 0,
        };
    }, [hotspotClusters]);

    const latestNews = useMemo(() => {
        return [...(beritaSleman as HomeNews[])]
            .sort((a, b) => getDateValue(b.date) - getDateValue(a.date))
            .slice(0, 3);
    }, []);

    const primaryFeatures = features.filter((feature) =>
        ['Peta Kejadian', 'Lapor Cepat', 'Statistik', 'Kontak Bantuan'].includes(feature.title),
    );
    return (
        <main className="jaga-home-page min-h-[92vh] theme-shell text-foreground">
            <style>
                {`
                    .home-map-preview .leaflet-control-attribution {
                        font-size: 10px;
                    }

                    .home-map-preview .leaflet-control-layers {
                        display: none !important;
                    }

                    .home-map-preview.is-hotspot .leaflet-marker-icon {
                        opacity: .22 !important;
                    }

                    .home-map-preview.is-hotspot .leaflet-marker-shadow {
                        opacity: 0 !important;
                    }

                    .home-map-preview.is-analisis .leaflet-marker-icon {
                        opacity: .45 !important;
                    }

                    .home-map-preview .leaflet-container {
                        background: #eef6ef;
                    }

                    /* === BERANDA PATCH: aman khusus Index.tsx === */
                    .jaga-home-page {
                        background:
                            radial-gradient(circle at 10% 8%, rgba(14, 165, 160, 0.18), transparent 24rem),
                            radial-gradient(circle at 88% 10%, rgba(245, 158, 11, 0.16), transparent 25rem),
                            radial-gradient(circle at 50% 72%, rgba(14, 58, 83, 0.10), transparent 30rem),
                            linear-gradient(180deg, #EEF8F6 0%, #F7FBF7 48%, #FFF7ED 100%);
                        color: #062333;
                    }

                    .jaga-home-hero {
                        position: relative;
                        background:
                            radial-gradient(circle at 82% 12%, rgba(245, 158, 11, 0.20), transparent 20rem),
                            radial-gradient(circle at 18% 16%, rgba(14, 165, 160, 0.22), transparent 24rem),
                            linear-gradient(135deg, #F1FBF8 0%, #E9F7F8 48%, #FFF7ED 100%) !important;
                        color: #062333 !important;
                    }

                    .jaga-home-hero::before {
                        content: "";
                        position: absolute;
                        inset: 0;
                        pointer-events: none;
                        background-image:
                            linear-gradient(rgba(15, 31, 46, 0.035) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(15, 31, 46, 0.035) 1px, transparent 1px);
                        background-size: 42px 42px;
                        mask-image: linear-gradient(180deg, black 0%, transparent 88%);
                    }

                    .jaga-home-hero::after {
                        content: "";
                        position: absolute;
                        right: 5%;
                        top: 18%;
                        width: 300px;
                        height: 300px;
                        border-radius: 999px;
                        pointer-events: none;
                        background:
                            radial-gradient(circle, rgba(14, 165, 160, 0.18), transparent 58%),
                            radial-gradient(circle, rgba(245, 158, 11, 0.18), transparent 70%);
                        filter: blur(2px);
                        animation: jagaHomeFloat 5s ease-in-out infinite;
                    }

                    @keyframes jagaHomeFloat {
                        0%, 100% { transform: translateY(0) scale(1); }
                        50% { transform: translateY(-12px) scale(1.03); }
                    }

                    .jaga-home-hero-badge {
                        color: #063447 !important;
                        background: rgba(255, 255, 255, 0.72) !important;
                        border-color: rgba(14, 165, 160, 0.24) !important;
                        box-shadow: 0 16px 34px rgba(6, 35, 51, 0.10) !important;
                        backdrop-filter: blur(18px);
                    }

                    .jaga-home-hero-badge *,
                    .jaga-home-hero-badge svg {
                        color: #07324A !important;
                        stroke: currentColor !important;
                    }

                    .jaga-home-brand-title,
                    .jaga-home-hero-title {
                        display: inline-block;
                        color: #07324A !important;
                        text-wrap: balance;
                        filter: drop-shadow(0 12px 24px rgba(15, 31, 46, 0.08));
                    }

                    .jaga-home-brand-title {
                        background: linear-gradient(90deg, #062333 0%, #0B6E78 34%, #0FA3A0 68%, #F2A20B 100%);
                        background-size: 160% 100%;
                        -webkit-background-clip: text;
                        background-clip: text;
                        -webkit-text-fill-color: transparent;
                        transition: transform 220ms ease, background-position 420ms ease, filter 220ms ease;
                    }

                    .jaga-home-brand-title:hover {
                        transform: translateY(-4px) scale(1.012);
                        background-position: 100% 50%;
                        filter: drop-shadow(0 20px 30px rgba(15, 31, 46, 0.16));
                    }

                    .jaga-home-brand-title::after {
                        content: "";
                        display: block;
                        width: 68%;
                        height: 8px;
                        margin: 10px auto 0;
                        border-radius: 999px;
                        background: linear-gradient(90deg, #0FA3A0, #F7C948, #F97316);
                        opacity: 0.5;
                        transition: width 220ms ease, opacity 220ms ease, transform 220ms ease;
                    }

                    .jaga-home-brand-title:hover::after {
                        width: 82%;
                        opacity: 0.78;
                        transform: translateY(2px);
                    }

                    .jaga-home-hero-desc {
                        color: #385B64 !important;
                    }

                    .jaga-home-hero a[href="/webgis"],
                    .jaga-home-hero a[href="/webgis"] * {
                        color: #FFFFFF !important;
                    }

                    .jaga-home-hero a[href="/report"],
                    .jaga-home-hero a[href="/report"] * {
                        color: #07324A !important;
                    }

                    .jaga-home-feature-grid {
                        width: 100% !important;
                    }

                    .jaga-home-feature-grid > a {
                        background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(235,250,247,0.78)) !important;
                        color: #062333 !important;
                        border-color: rgba(14, 165, 160, 0.18) !important;
                        min-height: 178px !important;
                        box-shadow: 0 18px 42px rgba(6, 35, 51, 0.09) !important;
                        backdrop-filter: blur(18px);
                    }

                    .jaga-home-feature-grid > a:hover {
                        transform: translateY(-4px);
                        border-color: rgba(14, 165, 160, 0.42) !important;
                        box-shadow: 0 24px 56px rgba(6, 35, 51, 0.14) !important;
                    }

                    .jaga-home-feature-grid h3,
                    .jaga-home-feature-grid p,
                    .jaga-home-feature-grid span,
                    .jaga-home-feature-grid div {
                        color: #07324A !important;
                    }

                    .jaga-home-feature-grid p {
                        color: #385B64 !important;
                    }

                    .jaga-home-page :is(h1,h2,h3,h4,p,span,strong,small,label,a,button,li) {
                        text-shadow: none !important;
                    }

                    .jaga-home-footer {
                        position: relative;
                        overflow: hidden;
                        background:
                            radial-gradient(circle at 18% 0%, rgba(14, 165, 160, 0.22), transparent 22rem),
                            radial-gradient(circle at 78% 8%, rgba(245, 158, 11, 0.20), transparent 24rem),
                            linear-gradient(135deg, #041421 0%, #063447 52%, #0F766E 100%) !important;
                        color: #FFFFFF !important;
                        border-top: 1px solid rgba(255, 255, 255, 0.15) !important;
                    }

                    .jaga-home-footer::before {
                        content: "";
                        position: absolute;
                        inset: 0;
                        pointer-events: none;
                        background-image:
                            linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
                        background-size: 38px 38px;
                        opacity: 0.45;
                    }

                    .jaga-home-footer > div {
                        position: relative;
                        z-index: 1;
                    }

                    .jaga-home-footer :is(h1,h2,h3,h4,p,span,li,a,strong,small,div) {
                        color: #FFFFFF !important;
                        text-shadow: none !important;
                    }

                    .jaga-home-footer :is(p,li,a,span) {
                        opacity: 1 !important;
                    }

                    .jaga-home-footer .text-white\/30,
                    .jaga-home-footer .text-white\/35,
                    .jaga-home-footer .text-white\/40,
                    .jaga-home-footer .text-white\/45,
                    .jaga-home-footer .text-white\/50,
                    .jaga-home-footer .text-white\/55,
                    .jaga-home-footer .text-white\/60,
                    .jaga-home-footer .text-white\/70 {
                        color: #BDE7E1 !important;
                        opacity: 1 !important;
                    }

                    .jaga-home-footer a {
                        color: #BDE7E1 !important;
                        transition: color 0.18s ease, transform 0.18s ease;
                    }

                    .jaga-home-footer a:hover {
                        color: #FFFFFF !important;
                        transform: translateX(2px);
                    }

                    .jaga-home-footer svg {
                        color: #BDE7E1 !important;
                        stroke: currentColor !important;
                    }

                    .jaga-home-footer .bg-white\/5,
                    .jaga-home-footer .bg-white\/10,
                    .jaga-home-footer .bg-white\/8 {
                        background: rgba(255, 255, 255, 0.08) !important;
                        border-color: rgba(255, 255, 255, 0.14) !important;
                    }

                    .jaga-home-footer .text-\[\#BDE7E1\] {
                        color: #BDE7E1 !important;
                    }

                    .jaga-home-footer .text-\[\#F47B52\] {
                        color: #FCA5A5 !important;
                    }

                    .jaga-home-footer .rounded-full {
                        color: #FCA5A5 !important;
                        background: rgba(255, 255, 255, 0.10) !important;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                    }

                    .jaga-home-footer .border-white\/10 {
                        border-color: rgba(255, 255, 255, 0.14) !important;
                    }

                    @media (max-width: 1024px) {
                        .jaga-home-hero::after {
                            width: 220px;
                            height: 220px;
                            right: -50px;
                            top: 20%;
                        }
                    }

                    @media (max-width: 768px) {
                        .jaga-home-brand-title,
                        .jaga-home-hero-title {
                            font-size: 2.35rem !important;
                            line-height: 1.05 !important;
                        }

                        .jaga-home-feature-grid > a {
                            min-height: auto !important;
                        }
                    }

                    @media (max-width: 480px) {
                        .jaga-home-brand-title,
                        .jaga-home-hero-title {
                            font-size: 2rem !important;
                        }

                        .jaga-home-footer {
                            padding-bottom: 2rem;
                        }
                    }

                `}
            </style>
            {/* HERO KHUSUS BERANDA */}
            <HomeHero
                title="JagaSleman"
                subtitle="WebGIS untuk Pemetaan dan Pelaporan Kejahatan Jalanan Sleman"
                metrics={[
                    { label: 'Total Laporan', value: homeStats.totalIncidents, note: 'Titik kejadian tercatat' },
                    { label: 'Hotspot Aktif', value: homeStats.totalHotspots, note: 'Area perlu perhatian' },
                    { label: 'Kontak Bantuan', value: homeStats.totalContacts, note: 'Polsek dan fasilitas kesehatan' },
                    { label: 'Monitoring', value: '24/7', note: 'Akses informasi kapan saja' },
                ]}
            />

            {/* FEATURES */}
            <section id="jaga-home-feature-grid" className="mx-auto max-w-7xl px-4 py-10 md:px-8">
                <div className="mb-7 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F47B52]">Fitur Utama</p>
                        <h2 className="mt-2 text-2xl font-black text-[#07324A] md:text-3xl">Pilih layanan yang Anda butuhkan.</h2>
                        <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                            Cari Tahu Lebih Lanjut fitur dan layanan yang tersedia.
                        </p>
                    </div>

                    <Button asChild variant="outline" className="rounded-full border-[#BDE7E1] bg-white text-[#07324A] hover:bg-[#F2FAF6]">
                        <Link to="/webgis">
                            Mulai dari Peta
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-4">
                    {primaryFeatures.map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <Link
                                key={feature.title}
                                to={feature.href}
                                className="group relative overflow-hidden rounded-[1.7rem] border border-[#BDE7E1] bg-white p-5 shadow-[0_18px_46px_rgba(7,50,74,.08)] transition hover:-translate-y-1 hover:border-[#0FA3A0] hover:shadow-[0_24px_60px_rgba(7,50,74,.14)]"
                            >
                                <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-[#F2FAF6] transition group-hover:bg-[#FFF8ED]" />
                                <div className="relative">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.bg} ${feature.text} shadow-sm`}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <span className="rounded-full bg-[#F6FBF8] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-[#0B6E78]">
                                            0{index + 1}
                                        </span>
                                    </div>

                                    <h3 className="mt-5 text-xl font-black leading-tight text-[#07324A]">{feature.title}</h3>
                                    <p className="mt-3 min-h-[56px] text-sm font-semibold leading-6 text-slate-600">{feature.detail}</p>

                                    <span className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#07324A] px-4 py-2 text-xs font-black text-white transition group-hover:bg-[#F47B52]">
                                        {feature.label}
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* NEWS */}
            <section className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
                <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F47B52]">
                            Berita Terbaru
                        </p>

                        <h2 className="mt-2 text-2xl font-black text-foreground md:text-3xl">
                            Kejadian Terkini Kejahatan Jalanan
                        </h2>
                    </div>

                    <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-slate-300 bg-white"
                    >
                        <Link to="/news">
                            Lihat Semua Berita
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    {latestNews.map((item) => {
                        const tone = getNewsTone(item.category);

                        return (
                            <Card
                                key={`${item.id}-${item.title}`}
                                className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                            >
                                <CardContent className="p-0">
                                    <div className="p-5">
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <Badge
                                                className={`rounded-full border px-3 py-1 ${tone.badge} hover:bg-white`}
                                            >
                                                {item.category}
                                            </Badge>

                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                {formatDate(item.date)}
                                            </div>
                                        </div>

                                        <div
                                            className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${tone.icon}`}
                                        >
                                            <Newspaper className="h-5 w-5" />
                                        </div>

                                        <h3 className="line-clamp-2 text-base font-black leading-snug text-foreground">
                                            {item.title}
                                        </h3>

                                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">
                                            {shortText(item.excerpt || item.summary || '', 118)}
                                        </p>

                                        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                                            <span className="line-clamp-1 text-xs font-bold text-slate-400">
                                                {item.source || item.location || 'JagaSleman'}
                                            </span>

                                            {item.url ? (
                                                <a
                                                    href={item.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#F47B52] hover:text-[#07324A]"
                                                >
                                                    Baca
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            ) : (
                                                <Link
                                                    to="/news"
                                                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#F47B52] hover:text-[#07324A]"
                                                >
                                                    Baca
                                                    <ArrowRight className="h-3.5 w-3.5" />
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* CONTACT */}
            <section className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
                <div className="grid gap-6 rounded-[2rem] border border-[#BDE7E1] bg-white p-6 shadow-[0_22px_60px_rgba(7,50,74,.08)] lg:grid-cols-[.9fr_1.1fr] md:p-8">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#F47B52]">Tanya & Konsultasi</p>
                        <h2 className="mt-3 text-3xl font-black text-[#07324A] md:text-4xl">Butuh bantuan keamanan?</h2>
                        <p className="mt-3 text-sm font-semibold leading-7 text-slate-600">
                            Gunakan halaman kontak untuk menemukan Polsek, rumah sakit, dan rute bantuan terdekat. Untuk kondisi darurat, segera hubungi 110.
                        </p>
                        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                            <Button asChild className="rounded-full bg-[#F47B52] text-white hover:bg-[#07324A]">
                                <Link to="/emergency">Kontak Bantuan <Phone className="ml-2 h-4 w-4" /></Link>
                            </Button>
                            <a href="tel:110" className="inline-flex h-10 items-center justify-center rounded-full border border-[#F2C99F] bg-[#FFF8ED] px-5 text-sm font-black text-[#D17415] transition hover:bg-[#FFEFD6]">
                                Darurat 110
                            </a>
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        {emergencyContacts.slice(0, 3).map((item: any) => (
                            <div key={item.id || item.name} className="rounded-[1.35rem] border border-[#BDE7E1] bg-[#F6FBF8] p-4">
                                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#0B6E78] shadow-sm">
                                    <Phone className="h-5 w-5" />
                                </div>
                                <h3 className="line-clamp-2 text-sm font-black text-[#07324A]">{item.name}</h3>
                                <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">{item.address || item.alamat || 'Kontak bantuan resmi wilayah Sleman'}</p>
                                <p className="mt-3 text-xs font-black text-[#F47B52]">{item.phone || item.telepon || 'Lihat detail'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FINAL CTA */}
            <section className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F2FAF6] text-[#F47B52]">
                                    <Users className="h-5 w-5" />
                                </div>

                                <Badge className="rounded-full border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-50">
                                    Partisipasi Masyarakat
                                </Badge>
                            </div>

                            <h2 className="text-2xl font-black text-foreground">
                                Laporan warga membuat peta semakin akurat.
                            </h2>

                            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                                Gunakan fitur laporan saat melihat atau mengalami kejadian.
                                Data yang rapi membantu pemantauan wilayah rawan.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                                asChild
                                className="h-11 rounded-full bg-[#F47B52] px-5 text-white hover:bg-[#07324A]"
                            >
                                <Link to="/report">
                                    Buat Laporan
                                    <FileWarning className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                className="h-11 rounded-full border-slate-300 bg-white px-5"
                            >
                                <Link to="/emergency">
                                    Kontak Bantuan
                                    <Phone className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="jaga-home-footer border-t border-white/10 text-white backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
                    <div className="mb-10 grid gap-10 md:grid-cols-3">
                        <div className="space-y-4 md:col-span-1">
                            <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-white/10">
                                    <img
                                        src="/images/logo_jagasleman.png"
                                        alt="Logo JagaSleman"
                                        className="h-full w-full object-contain"
                                    />
                                </div>

                                <div>
                                    <p className="text-sm font-bold leading-tight">
                                        JagaSleman
                                    </p>
                                    <p className="text-[10px] text-white/40">
                                        WebGIS Kabupaten Sleman
                                    </p>
                                </div>
                            </div>

                            <p className="text-xs leading-relaxed text-white/55">
                                WebGIS Interaktif Pemetaan kejahatan jalanan untuk melihat titik kejadian,
                                area rawan, berita, dan laporan masyarakat.
                            </p>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                                    Pengembang
                                </p>
                                <p className="mt-1 text-xs font-semibold text-[#BDE7E1]">
                                    Amirul Fahmi Ash-Shiddiqie
                                </p>
                            </div>
                        </div>

                        <div>
                            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                                Tautan Cepat
                            </p>

                            <ul className="space-y-2.5">
                                {[
                                    { label: 'Peta Kejadian', url: '/webgis' },
                                    { label: 'Buat Laporan', url: '/report' },
                                    { label: 'Statistik', url: '/statistics' },
                                    { label: 'Berita', url: '/news' },
                                    { label: 'Kontak Bantuan', url: '/emergency' },
                                ].map(({ label, url }) => (
                                    <li key={label}>
                                        <Link
                                            to={url}
                                            className="group flex items-center gap-1.5 text-xs text-white/45 transition-colors hover:text-white"
                                        >
                                            <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                            {label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div>
                            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                                Kontak Bantuan
                            </p>

                            <ul className="space-y-3">
                                {[
                                    {
                                        icon: Phone,
                                        label: 'Telepon Polresta',
                                        val: '(0274) 868424',
                                    },
                                    {
                                        icon: MapPin,
                                        label: 'Alamat',
                                        val: 'Jl. Magelang KM.12,5, Krapyak, Triharjo, Sleman, DIY 55514',
                                    },
                                    {
                                        icon: Route,
                                        label: 'Akses Bantuan',
                                        val: 'Cari Polsek terdekat melalui halaman Kontak Bantuan',
                                    },
                                ].map(({ icon: Icon, label, val }) => (
                                    <li key={label} className="flex items-start gap-2.5">
                                        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg bg-white/10">
                                            <Icon className="h-3.5 w-3.5 text-white/45" />
                                        </div>

                                        <div>
                                            <p className="text-[10px] text-white/30">
                                                {label}
                                            </p>
                                            <p className="text-xs leading-snug text-white/60">
                                                {val}
                                            </p>
                                        </div>
                                    </li>
                                ))}

                                <li className="mt-2 inline-flex items-center gap-2 rounded-lg border border-red-400/25 bg-red-500/15 px-3 py-1.5">
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-200">
                                        Darurat
                                    </span>
                                    <span className="text-sm font-extrabold text-white">
                                        110
                                    </span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 md:flex-row">
                        <div className="flex items-center gap-2 text-center md:text-left">
                            <Shield className="h-3.5 w-3.5 flex-shrink-0 text-white/25" />
                            <p className="text-xs text-white/35">
                                © {new Date().getFullYear()} JagaSleman — WebGIS
                                Pemetaan dan Pelaporan Kejahatan Jalanan di Kabupaten
                                Sleman. Hak cipta dilindungi.
                            </p>
                        </div>
                    </div>
                </div>
            </footer>

            <FloatingHelpChat />
        </main>
    );
}
