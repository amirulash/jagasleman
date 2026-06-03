import React, { useEffect, useMemo, useState } from 'react';
import { beritaSleman } from '@/data/beritaSleman';
import { JagaPageHero } from '@/Components/JagaPageHero';
import {
    ArrowLeft,
    ArrowRight,
    ArrowUpRight,
    CalendarDays,
    Eye,
    FileText,
    MapPin,
    Megaphone,
    Newspaper,
    Search,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Tag,
    X,
} from 'lucide-react';

type RawNewsItem = {
    id?: number | string;
    date?: string;
    tanggal?: string;
    title?: string;
    judul?: string;
    category?: string;
    kategori?: string;
    excerpt?: string;
    cuplikan?: string;
    summary?: string;
    ringkasan?: string;
    source?: string;
    sumber?: string;
    url?: string;
    link?: string;
    location?: string;
    lokasi?: string;
};

type NewsItem = {
    id: number | string;
    date: string;
    title: string;
    category: string;
    excerpt: string;
    source: string;
    url: string;
    location: string;
};

type GeneralCategory = 'Keamanan' | 'Kejahatan' | 'Himbauan' | 'Ketertiban Umum';

const ITEMS_PER_PAGE = 6;

const NEWS_CATEGORIES: Array<'Semua' | GeneralCategory> = [
    'Semua',
    'Keamanan',
    'Kejahatan',
    'Himbauan',
    'Ketertiban Umum',
];

const MONTHS_ID: Record<string, string> = {
    jan: '01',
    januari: '01',
    feb: '02',
    februari: '02',
    mar: '03',
    maret: '03',
    apr: '04',
    april: '04',
    mei: '05',
    jun: '06',
    juni: '06',
    jul: '07',
    juli: '07',
    agu: '08',
    agt: '08',
    agustus: '08',
    sep: '09',
    september: '09',
    okt: '10',
    oktober: '10',
    nov: '11',
    november: '11',
    des: '12',
    desember: '12',
};

const clampStyle = (lines: number): React.CSSProperties => ({
    display: '-webkit-box',
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: lines,
    overflow: 'hidden',
});

function getCleanUrl(url: string) {
    if (!url) return '';

    return url
        .replace('?utm_source=chatgpt.com', '')
        .replace('&utm_source=chatgpt.com', '')
        .trim();
}

function isValidUrl(url: string) {
    return /^https?:\/\//i.test(url);
}

function getSourceFromUrl(url: string) {
    const cleanUrl = getCleanUrl(url);

    if (!isValidUrl(cleanUrl)) return 'Sumber Berita';

    try {
        const host = new URL(cleanUrl).hostname.replace('www.', '');
        const main = host.split('.')[0];

        return main
            .replace(/-/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    } catch {
        return 'Sumber Berita';
    }
}

function normalizeNewsData(data: RawNewsItem[]): NewsItem[] {
    return data
        .map((item, index) => {
            const url = getCleanUrl(item.url ?? item.link ?? '');

            return {
                id: item.id ?? index + 1,
                date: item.date ?? item.tanggal ?? '',
                title: item.title ?? item.judul ?? '',
                category: item.category ?? item.kategori ?? 'Keamanan',
                excerpt: item.excerpt ?? item.cuplikan ?? item.summary ?? item.ringkasan ?? '',
                source: item.source ?? item.sumber ?? getSourceFromUrl(url),
                url,
                location: item.location ?? item.lokasi ?? 'Sleman',
            };
        })
        .filter((item) => item.title.trim() !== '');
}

function getDateObject(value: string) {
    if (!value) return null;

    const cleaned = value.trim().replace(/\s+/g, ' ');

    if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
        const parsed = new Date(cleaned);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const match = cleaned.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ]+)\s+(\d{4})$/);

    if (match) {
        const day = match[1].padStart(2, '0');
        const month = MONTHS_ID[match[2].toLowerCase()];
        const year = match[3];

        if (month) {
            const parsed = new Date(`${year}-${month}-${day}T00:00:00`);
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }
    }

    const fallback = new Date(cleaned);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function getDateTimestamp(value: string) {
    return getDateObject(value)?.getTime() ?? 0;
}

function formatTanggal(value: string) {
    const date = getDateObject(value);

    if (!date) return value || 'Tanpa tanggal';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatTanggalPendek(value: string) {
    const date = getDateObject(value);

    if (!date) return value || 'Tanpa tanggal';

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

function getYear(value: string) {
    const date = getDateObject(value);
    return date ? String(date.getFullYear()) : 'Tanpa Tahun';
}

function sortNewest(data: NewsItem[]) {
    return [...data].sort((a, b) => getDateTimestamp(b.date) - getDateTimestamp(a.date));
}

function getGeneralCategory(item: NewsItem): GeneralCategory {
    const text = `${item.category} ${item.title} ${item.excerpt}`.toLowerCase();

    if (
        text.includes('himbau') ||
        text.includes('imbau') ||
        text.includes('edukasi') ||
        text.includes('sosialisasi') ||
        text.includes('pesan kamtibmas') ||
        text.includes('goes to school') ||
        text.includes('pembinaan')
    ) {
        return 'Himbauan';
    }

    if (
        text.includes('balap liar') ||
        text.includes('petasan') ||
        text.includes('perang sahur') ||
        text.includes('perang sarung') ||
        text.includes('kenakalan remaja') ||
        text.includes('nongkrong') ||
        text.includes('ketertiban')
    ) {
        return 'Ketertiban Umum';
    }

    if (
        text.includes('patroli') ||
        text.includes('pengamanan') ||
        text.includes('siskamling') ||
        text.includes('pos kamling') ||
        text.includes('ronda') ||
        text.includes('kamtibmas') ||
        text.includes('cegah') ||
        text.includes('antisipasi')
    ) {
        return 'Keamanan';
    }

    if (
        text.includes('curanmor') ||
        text.includes('pencurian') ||
        text.includes('klitih') ||
        text.includes('kriminal') ||
        text.includes('kejahatan jalanan') ||
        text.includes('bacok') ||
        text.includes('celurit') ||
        text.includes('tersangka') ||
        text.includes('pelaku')
    ) {
        return 'Kejahatan';
    }

    return 'Keamanan';
}

function getCategoryClass(category: GeneralCategory) {
    if (category === 'Kejahatan') {
        return 'border-rose-200 bg-rose-50 text-rose-700';
    }

    if (category === 'Himbauan') {
        return 'border-[#BDE7E1] bg-[#F2FAF6] text-[#F47B52]';
    }

    if (category === 'Ketertiban Umum') {
        return 'border-[#BDE7E1] bg-[#F2FAF6] text-[#F47B52]';
    }

    return 'border-[#BDE7E1] bg-[#F2FAF6] text-[#07324A]';
}

function getCategoryIcon(category: GeneralCategory) {
    if (category === 'Kejahatan') {
        return <ShieldAlert className="h-4 w-4" />;
    }

    if (category === 'Himbauan') {
        return <Megaphone className="h-4 w-4" />;
    }

    if (category === 'Ketertiban Umum') {
        return <ShieldCheck className="h-4 w-4" />;
    }

    return <ShieldCheck className="h-4 w-4" />;
}

function getCategorySubtitle(category: GeneralCategory) {
    if (category === 'Kejahatan') return 'Kasus dan tindak kriminal';
    if (category === 'Himbauan') return 'Pesan pencegahan warga';
    if (category === 'Ketertiban Umum') return 'Aktivitas rawan gangguan';
    return 'Patroli dan pengamanan';
}

function getReadingTime(text: string) {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.ceil(words / 180));

    return `${minutes} menit`;
}

export default function News() {
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<'Semua' | GeneralCategory>('Semua');
    const [year, setYear] = useState('Semua');
    const [page, setPage] = useState(1);
    const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);

    const newsData = useMemo(() => {
        return normalizeNewsData(beritaSleman as RawNewsItem[]);
    }, []);

    const sortedNews = useMemo(() => {
        return sortNewest(newsData);
    }, [newsData]);

    const featuredNews = sortedNews[0];
    const quickHighlights = sortedNews.slice(1, 4);

    const years = useMemo(() => {
        return ['Semua', ...Array.from(new Set(sortedNews.map((item) => getYear(item.date))))];
    }, [sortedNews]);

    const filteredNews = useMemo(() => {
        const keyword = search.toLowerCase().trim();

        return sortedNews.filter((item) => {
            const generalCategory = getGeneralCategory(item);

            const searchText = [
                item.title,
                item.excerpt,
                item.category,
                item.source,
                item.location,
                generalCategory,
            ]
                .join(' ')
                .toLowerCase();

            const matchSearch = !keyword || searchText.includes(keyword);
            const matchCategory = category === 'Semua' || generalCategory === category;
            const matchYear = year === 'Semua' || getYear(item.date) === year;

            return matchSearch && matchCategory && matchYear;
        });
    }, [sortedNews, search, category, year]);

    const totalPages = Math.max(1, Math.ceil(filteredNews.length / ITEMS_PER_PAGE));

    const visibleNews = useMemo(() => {
        const start = (page - 1) * ITEMS_PER_PAGE;
        return filteredNews.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredNews, page]);

    const categoryCounts = useMemo(() => {
        const counts = NEWS_CATEGORIES
            .filter((item) => item !== 'Semua')
            .reduce<Record<GeneralCategory, number>>((acc, item) => {
                acc[item as GeneralCategory] = 0;
                return acc;
            }, {} as Record<GeneralCategory, number>);

        sortedNews.forEach((item) => {
            const generalCategory = getGeneralCategory(item);
            counts[generalCategory] = (counts[generalCategory] || 0) + 1;
        });

        return counts;
    }, [sortedNews]);

    const yearCounts = useMemo(() => {
        return sortedNews.reduce<Record<string, number>>((acc, item) => {
            const itemYear = getYear(item.date);
            acc[itemYear] = (acc[itemYear] || 0) + 1;
            return acc;
        }, {});
    }, [sortedNews]);

    const latestDate = featuredNews ? formatTanggalPendek(featuredNews.date) : '-';
    const activeFilter = search || category !== 'Semua' || year !== 'Semua';

    useEffect(() => {
        setPage(1);
    }, [search, category, year]);

    const resetFilter = () => {
        setSearch('');
        setCategory('Semua');
        setYear('Semua');
        setPage(1);
    };

    return (
        <div className="jaga-news-page min-h-full theme-shell px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <JagaPageHero
                    page="news"
                    eyebrow="Info Kamtibmas Sleman"
                    title="Berita Keamanan Sleman"
                    subtitle="Pantau kabar keamanan, kriminalitas, himbauan, dan ketertiban umum dalam tampilan yang ringkas dan mudah dibaca."
                    actions={[
                        { label: 'Buka Peta', href: '/webgis', tone: 'primary' },
                        { label: 'Kontak Bantuan', href: '/emergency', tone: 'secondary' },
                    ]}
                    metrics={[
                        { label: 'Total Berita', value: sortedNews.length, note: 'Seluruh berita tersedia' },
                        { label: 'Kategori', value: NEWS_CATEGORIES.length - 1, note: 'Keamanan, kriminal, himbauan' },
                        { label: 'Update Terbaru', value: latestDate, note: 'Tanggal pembaruan terakhir' },
                        { label: 'Sorotan', value: featuredNews ? 'Aktif' : '-', note: featuredNews?.title ? featuredNews.title.slice(0, 42) : 'Belum tersedia' },
                    ]}
                    sideTitle={featuredNews?.title || 'Sorotan Utama'}
                    sideText={featuredNews?.excerpt || 'Baca pembaruan keamanan dan ketertiban terbaru dari wilayah Sleman.'}
                    sideItems={['Cari berita', 'Filter kategori', 'Baca detail']}
                />

                <section className="rounded-[1.8rem] border border-slate-100 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] p-4 shadow-sm sm:p-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                        <label className="relative block">
                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-300 dark:text-slate-300" />
                            <input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Cari berita, lokasi, sumber, atau kategori..."
                                className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 pl-11 pr-4 text-sm font-semibold text-slate-800 dark:text-white outline-none transition placeholder:text-slate-500 dark:text-slate-300 dark:text-slate-300 focus:border-[#0B6E78] focus:bg-white dark:bg-[#102538] dark:bg-[#07324A] focus:ring-4 focus:ring-[#BDE7E1]/35"
                            />
                        </label>

                        <select
                            value={year}
                            onChange={(event) => setYear(event.target.value)}
                            className="h-12 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 px-4 text-sm font-black text-slate-700 dark:text-slate-100 outline-none transition focus:border-[#0B6E78] focus:bg-white dark:bg-[#102538] dark:bg-[#07324A] focus:ring-4 focus:ring-[#BDE7E1]/35"
                        >
                            {years.map((item) => (
                                <option key={item} value={item}>
                                    {item === 'Semua' ? 'Semua Tahun' : item}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {NEWS_CATEGORIES.map((item) => {
                            const active = category === item;
                            const total = item === 'Semua' ? sortedNews.length : categoryCounts[item as GeneralCategory] || 0;

                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => setCategory(item)}
                                    className={`shrink-0 rounded-full border px-4 py-2 text-xs font-black transition ${
                                        active
                                            ? 'border-[#07324A] bg-[#07324A] text-white shadow-sm'
                                            : 'border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] text-slate-600 dark:text-slate-200 hover:border-[#BDE7E1] hover:bg-[#F2FAF6] hover:text-[#F47B52]'
                                    }`}
                                >
                                    {item} <span className="ml-1 opacity-70">({total})</span>
                                </button>
                            );
                        })}

                        {activeFilter && (
                            <button
                                type="button"
                                onClick={resetFilter}
                                className="shrink-0 rounded-full border border-rose-100 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1fr_330px]">
                    <main className="space-y-6">
                        {quickHighlights.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-3">
                                {quickHighlights.map((item) => {
                                    const generalCategory = getGeneralCategory(item);

                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => setSelectedNews(item)}
                                            className="group rounded-[1.5rem] border border-slate-100 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-[#BDE7E1] hover:shadow-md"
                                        >
                                            <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${getCategoryClass(generalCategory)}`}>
                                                {getCategoryIcon(generalCategory)}
                                                {generalCategory}
                                            </div>

                                            <h3
                                                className="text-base font-black leading-snug text-foreground transition group-hover:text-[#F47B52]"
                                                style={clampStyle(3)}
                                            >
                                                {item.title}
                                            </h3>

                                            <div className="mt-4 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-300 dark:text-slate-300">
                                                <span>{formatTanggalPendek(item.date)}</span>
                                                <Eye className="h-4 w-4" />
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-foreground">Eksplor Berita</h2>
                                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200 dark:text-slate-300">
                                    {filteredNews.length} berita ditemukan. Pilih kartu untuk melihat detail berita.
                                </p>
                            </div>

                            <div className="rounded-full bg-white dark:bg-[#102538] dark:bg-[#07324A] px-4 py-2 text-xs font-black text-slate-600 dark:text-slate-200 dark:text-slate-300 shadow-sm ring-1 ring-slate-100">
                                Halaman {page} / {totalPages}
                            </div>
                        </div>

                        {visibleNews.length > 0 ? (
                            <div className="grid gap-4 md:grid-cols-2">
                                {visibleNews.map((item) => {
                                    const generalCategory = getGeneralCategory(item);

                                    return (
                                        <article
                                            key={item.id}
                                            className="group overflow-hidden rounded-[1.7rem] border border-slate-100 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] shadow-sm transition hover:-translate-y-1 hover:border-[#BDE7E1] hover:shadow-md"
                                        >
                                            <div className="h-2" />

                                            <div className="p-5">
                                                <div className="mb-4 flex flex-wrap items-center gap-2">
                                                    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${getCategoryClass(generalCategory)}`}>
                                                        {getCategoryIcon(generalCategory)}
                                                        {generalCategory}
                                                    </span>

                                                    <span className="rounded-full bg-slate-100 dark:bg-[#17324A] px-3 py-1 text-xs font-bold text-slate-600 dark:text-slate-200 dark:text-slate-300">
                                                        {formatTanggalPendek(item.date)}
                                                    </span>
                                                </div>

                                                <h3
                                                    className="text-lg font-black leading-snug text-foreground transition group-hover:text-[#F47B52]"
                                                    style={clampStyle(2)}
                                                >
                                                    {item.title}
                                                </h3>

                                                <p
                                                    className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-200"
                                                    style={clampStyle(2)}
                                                >
                                                    {item.excerpt}
                                                </p>

                                                <div className="mt-4 grid gap-2 text-xs font-bold text-slate-600 dark:text-slate-200 dark:text-slate-300">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-[#F47B52]" />
                                                        <span>{item.location}</span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <FileText className="h-4 w-4 text-[#F47B52]" />
                                                        <span>{item.source}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-5 flex gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => setSelectedNews(item)}
                                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-[#07324A]"
                                                    >
                                                        Ringkasan
                                                        <Eye className="h-4 w-4" />
                                                    </button>

                                                    {isValidUrl(item.url) && (
                                                        <a
                                                            href={item.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] px-4 py-2.5 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:border-[#BDE7E1] hover:bg-[#F2FAF6] hover:text-[#F47B52]"
                                                            aria-label="Buka sumber berita"
                                                        >
                                                            <ArrowUpRight className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-[1.7rem] border border-dashed border-slate-300 bg-white dark:bg-[#102538] dark:bg-[#07324A] p-10 text-center">
                                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#17324A] text-slate-600 dark:text-slate-200 dark:text-slate-300">
                                    <Search className="h-6 w-6" />
                                </div>

                                <h3 className="text-xl font-black text-foreground">Berita tidak ditemukan</h3>

                                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-200 dark:text-slate-300">
                                    Coba gunakan kata kunci lain atau reset filter.
                                </p>

                                <button
                                    type="button"
                                    onClick={resetFilter}
                                    className="mt-5 rounded-2xl bg-[#07324A] px-5 py-3 text-sm font-black text-white transition hover:bg-[#07324A]"
                                >
                                    Reset Filter
                                </button>
                            </div>
                        )}

                        {filteredNews.length > ITEMS_PER_PAGE && (
                            <div className="flex flex-col gap-3 rounded-[1.7rem] border border-slate-100 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                                <button
                                    type="button"
                                    disabled={page === 1}
                                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ArrowLeft className="h-4 w-4" />
                                    Sebelumnya
                                </button>

                                <div className="flex justify-center gap-2">
                                    {Array.from({ length: totalPages }).map((_, index) => {
                                        const currentPage = index + 1;
                                        const active = currentPage === page;

                                        return (
                                            <button
                                                key={currentPage}
                                                type="button"
                                                onClick={() => setPage(currentPage)}
                                                className={`h-10 w-10 rounded-xl text-sm font-black transition ${
                                                    active
                                                        ? 'bg-[#07324A] text-white'
                                                        : 'bg-slate-100 dark:bg-[#17324A] text-slate-600 dark:text-slate-200 hover:bg-[#F2FAF6] hover:text-[#F47B52]'
                                                }`}
                                            >
                                                {currentPage}
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    disabled={page === totalPages}
                                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] px-4 py-3 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Berikutnya
                                    <ArrowRight className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </main>

                    <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
                        <div className="rounded-[1.7rem] border border-slate-100 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <Tag className="h-5 w-5 text-[#F47B52]" />
                                <h3 className="font-black text-foreground">Kategori Cepat</h3>
                            </div>

                            <div className="space-y-2">
                                {Object.entries(categoryCounts).map(([name, total]) => {
                                    const categoryName = name as GeneralCategory;

                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => setCategory(categoryName)}
                                            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition ${
                                                category === categoryName
                                                    ? 'bg-[#07324A] text-white'
                                                    : 'bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 text-slate-600 dark:text-slate-200 hover:bg-[#F2FAF6] hover:text-[#F47B52]'
                                            }`}
                                        >
                                            <span>
                                                <span className="flex items-center gap-2 text-sm font-black">
                                                    {getCategoryIcon(categoryName)}
                                                    {categoryName}
                                                </span>
                                                <span className={`mt-0.5 block text-xs ${category === categoryName ? 'text-white/70' : 'text-slate-500 dark:text-slate-300 dark:text-slate-300'}`}>
                                                    {getCategorySubtitle(categoryName)}
                                                </span>
                                            </span>

                                            <span className="text-sm font-black">{total}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="rounded-[1.7rem] border border-slate-100 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] p-5 shadow-sm">
                            <div className="mb-4 flex items-center gap-2">
                                <CalendarDays className="h-5 w-5 text-[#F47B52]" />
                                <h3 className="font-black text-foreground">Arsip Tahun</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {Object.entries(yearCounts)
                                    .sort(([a], [b]) => Number(b) - Number(a))
                                    .map(([name, total]) => (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => setYear(name)}
                                            className={`rounded-2xl px-4 py-3 text-left transition ${
                                                year === name
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:bg-[#17324A]'
                                            }`}
                                        >
                                            <span className="block text-sm font-black">{name}</span>
                                            <span className={`mt-0.5 block text-xs font-bold ${year === name ? 'text-white/70' : 'text-slate-500 dark:text-slate-300 dark:text-slate-300'}`}>
                                                {total} berita
                                            </span>
                                        </button>
                                    ))}
                            </div>
                        </div>

                        <div className="rounded-[1.7rem] border border-[#BDE7E1] bg-white p-5 shadow-sm dark:bg-[#102538]">
                            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#07324A] text-white">
                                <Sparkles className="h-5 w-5" />
                            </div>

                            <h3 className="font-black text-[#07324A] dark:text-white">Mode Baca Cepat</h3>
                            <p className="mt-2 text-sm leading-6 text-[#07324A] dark:text-slate-200">
                                Klik kartu berita untuk melihat detail tanpa membuka tab baru.
                            </p>
                        </div>
                    </aside>
                </section>
            </div>

            {selectedNews && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
                    <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white dark:bg-[#102538] dark:bg-[#07324A] shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-white/10 p-5 sm:p-6">
                            <div>
                                <div className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${getCategoryClass(getGeneralCategory(selectedNews))}`}>
                                    {getCategoryIcon(getGeneralCategory(selectedNews))}
                                    {getGeneralCategory(selectedNews)}
                                </div>

                                <h3 className="text-xl font-black leading-snug text-foreground sm:text-2xl">
                                    {selectedNews.title}
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedNews(null)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#17324A] text-slate-600 dark:text-slate-200 transition hover:bg-slate-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 sm:p-6">
                            <div className="mb-5 grid gap-3 sm:grid-cols-3">
                                <div className="rounded-2xl bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 p-4">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300 dark:text-slate-300">Tanggal</p>
                                    <p className="mt-1 text-sm font-black text-slate-800 dark:text-white">{formatTanggal(selectedNews.date)}</p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 p-4">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300 dark:text-slate-300">Sumber</p>
                                    <p className="mt-1 text-sm font-black text-slate-800 dark:text-white">{selectedNews.source}</p>
                                </div>

                                <div className="rounded-2xl bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70 p-4">
                                    <p className="text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300 dark:text-slate-300">Baca</p>
                                    <p className="mt-1 text-sm font-black text-slate-800 dark:text-white">{getReadingTime(selectedNews.excerpt)}</p>
                                </div>
                            </div>

                            <p className="text-sm leading-7 text-slate-600 dark:text-slate-200 sm:text-base">
                                {selectedNews.excerpt}
                            </p>

                            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-[#F2FAF6] p-4 text-sm font-bold text-[#07324A]">
                                <MapPin className="h-4 w-4 shrink-0" />
                                <span>{selectedNews.location}</span>
                            </div>

                            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() => setSelectedNews(null)}
                                    className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] dark:bg-[#07324A] px-5 py-3 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-slate-50 dark:bg-[#17324A] dark:bg-[#07324A]/70"
                                >
                                    Tutup
                                </button>

                                {isValidUrl(selectedNews.url) && (
                                    <a
                                        href={selectedNews.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#07324A] px-5 py-3 text-sm font-black text-white transition hover:bg-[#07324A]"
                                    >
                                        Buka Sumber
                                        <ArrowUpRight className="h-4 w-4" />
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
