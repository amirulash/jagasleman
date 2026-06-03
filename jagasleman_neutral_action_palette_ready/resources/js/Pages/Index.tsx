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
        desc: 'Telusuri persebaran kejadian secara visual dan cepat.',
        detail: 'Memudahkan pengguna memahami lokasi kejadian melalui tampilan peta yang ringkas dan informatif.',
        icon: MapIcon,
        href: '/webgis',
        label: 'Buka peta',
        bg: 'bg-[#EFF4F8]',
        text: 'text-[#D95F5F]',
        border: 'border-[#D8E4ED]',
        solid: 'bg-[#D95F5F]',
        soft: 'bg-[#D8E4ED]',
    },
    {
        title: 'Hotspot Rawan',
        desc: 'Area prioritas pengawasan tampil lebih menonjol.',
        detail: 'Visual hotspot membantu mengenali pola kerawanan sebagai perhatian utama pengguna.',
        icon: Radar,
        href: '/webgis',
        label: 'Lihat hotspot',
        bg: 'bg-[#EFF4F8]',
        text: 'text-[#D95F5F]',
        border: 'border-[#D8E4ED]',
        solid: 'bg-[#27527A]',
        soft: 'bg-[#D8E4ED]',
    },
    {
        title: 'Lapor Cepat',
        desc: 'Laporkan kejadian secara praktis melalui formulir yang terstruktur.',
        detail: 'Alur pelaporan dibuat singkat agar masyarakat dapat menyampaikan informasi dengan cepat dan jelas.',
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
        desc: 'Pantau tren kejadian dan status laporan dalam satu halaman.',
        detail: 'Statistik disajikan secara visual untuk membantu pembacaan data secara cepat dan akurat.',
        icon: BarChart3,
        href: '/statistics',
        label: 'Cek statistik',
        bg: 'bg-[#EFF4F8]',
        text: 'text-[#D95F5F]',
        border: 'border-[#D8E4ED]',
        solid: 'bg-[#D95F5F]',
        soft: 'bg-[#D8E4ED]',
    },
    {
        title: 'Berita Keamanan',
        desc: 'Ikuti pembaruan informasi keamanan secara singkat dan relevan.',
        detail: 'Berita dirangkum agar mudah dipindai tanpa kehilangan konteks penting.',
        icon: Newspaper,
        href: '/news',
        label: 'Baca berita',
        bg: 'bg-[#EFF4F8]',
        text: 'text-[#D95F5F]',
        border: 'border-[#D8E4ED]',
        solid: 'bg-[#D95F5F]',
        soft: 'bg-[#D8E4ED]',
    },
    {
        title: 'Kontak Bantuan',
        desc: 'Temukan layanan bantuan resmi saat dibutuhkan.',
        detail: 'Kontak resmi, rute bantuan, dan nomor penting dihimpun dalam satu halaman agar lebih cepat diakses.',
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
            badge: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
            icon: 'bg-[#D8E4ED] text-[#D95F5F]',
        };
    }

    if (text.includes('himbauan') || text.includes('imbauan')) {
        return {
            badge: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
            icon: 'bg-[#D8E4ED] text-[#D95F5F]',
        };
    }

    return {
        badge: 'bg-[#EFF4F8] text-[#D95F5F] border-[#D8E4ED]',
        icon: 'bg-[#D8E4ED] text-[#D95F5F]',
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#27527A]">
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
                                    className={`flex ${
                                        message.role === 'user'
                                            ? 'justify-end'
                                            : 'justify-start'
                                    }`}
                                >
                                    <div
                                        className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                                            message.role === 'user'
                                                ? 'rounded-br-md bg-[#D95F5F] text-white'
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
                                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-[#D95F5F] hover:text-[#0F1F2E] dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
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
                                className="h-10 flex-1 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-500 focus:border-[#D95F5F] dark:border-white/10 dark:bg-[#081521] dark:text-white dark:placeholder:text-white/55"
                            />

                            <button
                                type="button"
                                onClick={() => sendMessage()}
                                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#D95F5F] text-white hover:bg-[#1A3348]"
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
                className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_18px_45px_rgba(15,23,42,.25)] hover:bg-[#1A3348]"
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
                .mascot-img-wave { animation: mascot-wave 0.6s ease-in-out; }
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
            <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-[#D8E4ED] p-6 shadow-2xl shadow-[#0F1F2E]/20">
                {/* Decorative circles */}
                <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/5" />
                <div className="pointer-events-none absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-black/10" />
                <div className="pointer-events-none absolute right-4 top-24 h-20 w-20 rounded-full bg-[#D95F5F]/20" />

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
                            className={`relative z-10 select-none transition-transform ${
                                isBouncing ? 'mascot-bounce' : 'mascot-float'
                            }`}
                        >
                            <img
                                src="Images/Maskot_Web.png"
                                alt="Maskot Polisi JagaSleman"
                                className={`h-44 w-auto drop-shadow-2xl ${
                                    isWaving ? 'mascot-img-wave' : ''
                                }`}
                                draggable={false}
                            />
                        </div>

                        {/* Tap hint ring */}
                        <span className="absolute inset-0 rounded-full transition-all duration-300 group-hover:bg-white/5 group-focus-visible:ring-2 group-focus-visible:ring-white/50" />

                        {/* Pop badge on click */}
                        {showBadge && (
                            <div className="badge-pop absolute -right-4 -top-2 z-20 whitespace-nowrap rounded-full border border-white/30 bg-[#D95F5F] px-3 py-1 text-[11px] font-black text-white shadow-lg">
                                ✨ Tips baru!
                            </div>
                        )}
                    </button>

                    <p className="mt-1 text-center text-[11px] font-semibold text-white/40">
                        Sentuh maskot untuk melihat pesan singkat
                    </p>
                </div>

                {/* Speech bubble / tip */}
                <div className="relative mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                    {/* Tail */}
                    <div className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-sm border-l border-t border-white/20 bg-white/10" />

                    <p className="text-center text-sm font-semibold leading-relaxed text-white">
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
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    i === tipIndex
                                        ? 'w-5 bg-white'
                                        : 'w-1.5 bg-white/30 hover:bg-white/50'
                                }`}
                                aria-label={`Tip ${i + 1}`}
                            />
                        ))}
                    </div>
                </div>
                {/* CTA */}
                <Link
                    to="/report"
                    className="mascot-card-shine relative mt-4 flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-white font-black text-[#D95F5F] shadow-lg transition hover:bg-[#EFF4F8] active:scale-[0.98]"
                >
                    <MapIcon className="h-4 w-4" />
                    Laporkan Kejadian
                    <ArrowRight className="h-4 w-4" />
                </Link>
            </div>
        </div>
    );
}

export default function Index() {
    const [activeFeature, setActiveFeature] = useState(0);
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

    const selectedFeature = features[activeFeature];
    const SelectedFeatureIcon = selectedFeature.icon;

    return (
        <main className="min-h-[92vh] theme-shell text-foreground">
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
                `}
            </style>

            {/* HERO */}
            <section className="relative overflow-hidden border-b theme-border theme-surface">
                {/* Subtle background decoration */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[#EFF4F8] opacity-60 blur-3xl" />
                    <div className="absolute -bottom-16 left-1/3 h-64 w-64 rounded-full bg-[#EFF4F8] opacity-50 blur-3xl" />
                </div>

                <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 md:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-16">
                    {/* LEFT — copy & CTA */}
                    <div>
                        <Badge className="mb-5 rounded-full border border-[#D8E4ED] bg-[#EFF4F8] px-3 py-1 text-[#D95F5F] hover:bg-[#EFF4F8]">
                            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                            JagaSleman
                        </Badge>

                        <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-foreground md:text-5xl">
                            JagaSleman, <span className="text-[#D95F5F]">lebih sigap</span> memantau dan melaporkan kejadian.
                        </h1>

                        <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-500 md:text-lg">
                            Platform WebGIS untuk pemetaan dan pelaporan kejahatan jalanan di Kabupaten Sleman.
                        </p>

                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <Button
                                asChild
                                className="h-12 rounded-full bg-[#D95F5F] px-7 text-white shadow-md shadow-[#D95F5F]/20 hover:bg-[#1A3348]"
                            >
                                <Link to="/webgis">
                                    Jelajahi Peta
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>

                            <Button
                                asChild
                                variant="outline"
                                className="h-12 rounded-full border-[#D8E4ED] bg-white px-7 text-[#1A3348] hover:bg-[#EFF4F8] dark:bg-white/5 dark:text-[#EFF4F8] dark:hover:bg-white/10"
                            >
                                <Link to="/report">
                                    Laporkan Kejadian
                                    <FileWarning className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>
                        </div>

                        {/* Stat chips */}
                        <div className="mt-8 flex flex-wrap gap-3">
                            <div className="flex items-center gap-2 rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] px-4 py-2.5">
                                <MapPin className="h-4 w-4 text-[#D95F5F]" />
                                <span className="text-sm font-black text-[#1A3348]">
                                    {homeStats.totalIncidentPoints}
                                </span>
                                <span className="text-xs font-semibold text-[#D95F5F]">
                                    Titik Polisi & Pelaporan
                                </span>
                            </div>

                            <div className="flex items-center gap-2 rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] px-4 py-2.5">
                                <Phone className="h-4 w-4 text-[#D95F5F]" />
                                <span className="text-sm font-black text-[#1A3348]">
                                    {homeStats.totalContacts}
                                </span>
                                <span className="text-xs font-semibold text-[#D95F5F]">
                                    Kontak Darurat Aktif
                                </span>
                            </div>

                            <div className="flex items-center gap-2 rounded-2xl border border-[#D8E4ED] bg-white px-4 py-2.5">
                                <Shield className="h-4 w-4 text-[#D95F5F]" />
                                <span className="text-sm font-black text-[#1A3348]">
                                    {homeStats.totalPolice}
                                </span>
                                <span className="text-xs font-semibold text-[#D95F5F]">
                                    Titik Polisi Aktif
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — interactive mascot */}
                    <MascotCard stats={homeStats} />
                </div>
            </section>

            {/* FEATURES */}
            <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
                <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D95F5F]">
                            Fitur Utama
                        </p>
                        <h2 className="mt-2 text-2xl font-black text-foreground md:text-3xl">
                            Akses utama tersusun rapi dan mudah dipahami.
                        </h2>
                    </div>

                    <Button
                        asChild
                        variant="outline"
                        className="rounded-full border-slate-300 bg-white"
                    >
                        <Link to={selectedFeature.href}>
                            {selectedFeature.label}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature, index) => {
                            const Icon = feature.icon;
                            const isActive = activeFeature === index;

                            return (
                                <Link
                                    key={feature.title}
                                    to={feature.href}
                                    onMouseEnter={() => setActiveFeature(index)}
                                    onFocus={() => setActiveFeature(index)}
                                    className={`group rounded-[1.5rem] border bg-white p-5 text-slate-900 shadow-sm transition dark:bg-[#102538] dark:text-white hover:-translate-y-1 hover:shadow-lg ${
                                        isActive
                                            ? `${feature.border} ring-2 ring-[#93C5FD] ring-offset-2 ring-offset-[#F6F8F3]`
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${feature.bg} ${feature.text}`}
                                        >
                                            <Icon className="h-5 w-5" />
                                        </div>

                                        <div>
                                            <h3 className="font-black text-foreground">
                                                {feature.title}
                                            </h3>
                                            <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-200">
                                                {feature.desc}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    <div className="jagasleman-feature-panel group relative overflow-hidden rounded-[1.7rem] border border-[#D8E4ED]/20 bg-[#0F1F2E] p-5 text-white shadow-[0_22px_60px_rgba(15,31,46,.26)]">
                        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#5BAE8A]/20 blur-2xl" />
                        <div className="pointer-events-none absolute -bottom-20 -left-16 h-48 w-48 rounded-full bg-[#D95F5F]/20 blur-2xl" />

                        <div className="relative z-10 flex items-center justify-between gap-3">
                            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${selectedFeature.solid} text-white shadow-lg shadow-black/15 ring-1 ring-white/15`}>
                                <SelectedFeatureIcon className="h-6 w-6" />
                            </div>

                            <Badge className="rounded-full border border-white/25 bg-white px-3 py-1 text-[#B84F4F] shadow-sm hover:bg-white">
                                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                                Fitur Pilihan
                            </Badge>
                        </div>

                        <h3 className="relative z-10 mt-5 text-2xl font-black leading-tight text-white">
                            {selectedFeature.title}
                        </h3>

                        <p className="relative z-10 mt-2 text-sm leading-relaxed text-[#EAF3F8]">
                            {selectedFeature.detail}
                        </p>

                        <div className="relative z-10 mt-5 grid grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-white/15 bg-white p-4 text-[#0F1F2E] shadow-sm transition group-hover:-translate-y-0.5">
                                <MousePointer2 className="mb-2 h-5 w-5 text-[#D95F5F]" />
                                <p className="text-xs font-black text-[#1A3348]">
                                    Akses cepat
                                </p>
                            </div>

                            <div className="rounded-2xl border border-white/15 bg-white p-4 text-[#0F1F2E] shadow-sm transition group-hover:-translate-y-0.5">
                                <Eye className="mb-2 h-5 w-5 text-[#D95F5F]" />
                                <p className="text-xs font-black text-[#1A3348]">
                                    Mudah dibaca
                                </p>
                            </div>
                        </div>

                        <Button
                            asChild
                            className="relative z-10 mt-5 h-11 w-full rounded-full bg-[#D95F5F] text-white shadow-lg shadow-[#D95F5F]/25 transition hover:-translate-y-0.5 hover:bg-[#C94F4F] hover:text-white"
                        >
                            <Link to={selectedFeature.href}>
                                {selectedFeature.label}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* NEWS */}
            <section className="mx-auto max-w-7xl px-4 pb-10 md:px-8">
                <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
                    <div>
                        <p className="text-sm font-black uppercase tracking-[0.22em] text-[#D95F5F]">
                            Berita Terbaru
                        </p>

                        <h2 className="mt-2 text-2xl font-black text-foreground md:text-3xl">
                            Informasi terbaru tersaji ringkas dan mudah ditelusuri.
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
                                                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#D95F5F] hover:text-[#1A3348]"
                                                >
                                                    Baca
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                </a>
                                            ) : (
                                                <Link
                                                    to="/news"
                                                    className="inline-flex items-center gap-1.5 text-xs font-black text-[#D95F5F] hover:text-[#1A3348]"
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

            {/* FINAL CTA */}
            <section className="mx-auto max-w-7xl px-4 pb-14 md:px-8">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                    <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
                        <div>
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EFF4F8] text-[#D95F5F]">
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
                                className="h-11 rounded-full bg-[#D95F5F] px-5 text-white hover:bg-[#1A3348]"
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
            <footer className="border-t border-white/10 bg-slate-950 text-white backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
                    <div className="mb-10 grid gap-10 md:grid-cols-4">
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
                                WebGIS keamanan jalanan untuk melihat titik kejadian,
                                area rawan, berita, dan laporan masyarakat.
                            </p>

                            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
                                    Pengembang
                                </p>
                                <p className="mt-1 text-xs font-semibold text-[#D8E4ED]">
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

                        <div>
                            <p className="mb-4 text-[10px] font-semibold uppercase tracking-widest text-white/70">
                                Jam Operasional
                            </p>

                            <ul className="space-y-2.5">
                                {[
                                    {
                                        hari: 'Senin – Jumat',
                                        jam: '08.00 – 16.00 WIB',
                                        open: true,
                                    },
                                    {
                                        hari: 'Sabtu',
                                        jam: '08.00 – 12.00 WIB',
                                        open: true,
                                    },
                                    {
                                        hari: 'Minggu & Libur',
                                        jam: 'Tutup',
                                        open: false,
                                    },
                                ].map(({ hari, jam, open }) => (
                                    <li
                                        key={hari}
                                        className="flex items-center justify-between gap-2"
                                    >
                                        <span className="text-xs text-white/50">
                                            {hari}
                                        </span>

                                        <span
                                            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                open
                                                    ? 'bg-[#D95F5F]/10 text-[#D95F5F]'
                                                    : 'bg-white/8 text-white/35'
                                            }`}
                                        >
                                            {jam}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
                                <div className="mb-1 flex items-center gap-2">
                                    <Clock3 className="h-3.5 w-3.5 text-white/35" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                                        Catatan
                                    </p>
                                </div>

                                <p className="text-xs leading-relaxed text-white/55">
                                    Untuk keadaan darurat yang sedang berlangsung,
                                    utamakan keselamatan dan segera hubungi pihak
                                    kepolisian.
                                </p>
                            </div>
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

                        <div className="flex flex-wrap items-center justify-center gap-4">
                            {(
                                [
                                    'Kebijakan Privasi',
                                    'Syarat Penggunaan',
                                    'Aksesibilitas',
                                ] as string[]
                            ).map((item) => (
                                <a
                                    key={item}
                                    href="#"
                                    className="text-xs text-white/30 transition-colors hover:text-white/65"
                                >
                                    {item}
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>

            <FloatingHelpChat />
        </main>
    );
}
