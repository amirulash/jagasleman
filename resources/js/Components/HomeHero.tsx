import {
    FileWarning,
    Map,
    ShieldCheck,
} from 'lucide-react';

type HomeHeroMetric = {
    label: string;
    value: string | number;
    note?: string;
};

type HomeHeroProps = {
    title: string;
    subtitle: string;
    metrics?: HomeHeroMetric[];
};

export function HomeHero({ title, subtitle }: HomeHeroProps) {
    return (
        <section className="jaga-home-hero jaga-home-hero-special relative isolate overflow-hidden bg-[#061F32] text-white">
            <style>{`
                @keyframes jagaMascotFloat {
                    0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
                    50% { transform: translate3d(0, -16px, 0) rotate(1.5deg); }
                }

                @keyframes jagaMascotGlow {
                    0%, 100% { opacity: .48; transform: scale(.98); }
                    50% { opacity: .78; transform: scale(1.04); }
                }

                .jaga-home-mascot-only {
                    animation: jagaMascotFloat 5.5s ease-in-out infinite;
                    transform-origin: bottom center;
                }

                .jaga-home-mascot-only:hover {
                    animation-play-state: paused;
                    transform: translateY(-18px) scale(1.035) rotate(1deg);
                }

                .jaga-home-mascot-glow {
                    animation: jagaMascotGlow 4.8s ease-in-out infinite;
                }

                .jaga-home-hero .jaga-home-hero-title {
                    color: #FFFFFF !important;
                    text-shadow: 0 5px 22px rgba(0,0,0,.46), 0 1px 0 rgba(255,255,255,.10);
                    filter: none !important;
                }

                .jaga-home-hero .jaga-home-hero-subtitle-strong {
                    display: inline-block;
                    color: #F4FFFB !important;
                    text-shadow: 0 4px 16px rgba(0,0,0,.40);
                    background: rgba(6, 31, 50, .38);
                    border: 1px solid rgba(255,255,255,.14);
                    border-radius: 1.25rem;
                    padding: .65rem .95rem;
                    backdrop-filter: blur(8px);
                }

                .jaga-home-hero .jaga-home-hero-eyebrow-strong {
                    color: #FFFFFF !important;
                    background: rgba(255,255,255,.18) !important;
                    border-color: rgba(255,255,255,.24) !important;
                    text-shadow: 0 2px 8px rgba(0,0,0,.34);
                }
            `}</style>

            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(242,162,11,.24),transparent_28rem),radial-gradient(circle_at_86%_24%,rgba(15,163,160,.28),transparent_30rem),linear-gradient(135deg,#061F32_0%,#07324A_56%,#0B5B6B_100%)]" />
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#F4FBF8] to-transparent" />
                <div className="absolute left-8 top-8 h-28 w-28 rounded-full border border-white/10" />
                <div className="absolute right-16 top-20 h-44 w-44 rounded-full border border-[#BDE7E1]/15" />
            </div>

            <div className="jaga-home-hero-inner mx-auto grid max-w-7xl items-center gap-8 px-4 md:px-8 lg:grid-cols-[1.08fr_.92fr] lg:gap-10">
                <div className="relative z-10 max-w-3xl">
                    <div className="jaga-home-hero-eyebrow-strong inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#BDE7E1] shadow-lg shadow-black/10 backdrop-blur">
                        <ShieldCheck className="h-4 w-4" />
                        WebGIS Interaktif · JagaSleman
                    </div>

                    <h1 className="jaga-home-hero-title mt-5 text-4xl font-black leading-[1.02] tracking-[-0.055em] sm:text-5xl lg:text-6xl">
                        {title}
                    </h1>

                    <p className="jaga-home-hero-subtitle-strong mt-4 max-w-2xl text-base font-semibold leading-8 md:text-lg">
                        {subtitle}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <a
                            href="/webgis"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0FA3A0] px-5 py-3 text-sm font-black text-white shadow-[0_18px_40px_rgba(15,163,160,.28)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#0C8A88] focus:outline-none focus:ring-4 focus:ring-[#BDE7E1]/50"
                        >
                            <Map className="h-4 w-4" />
                            Peta Kejadian
                        </a>
                        <a
                            href="/report"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-lg shadow-black/10 backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/18 focus:outline-none focus:ring-4 focus:ring-[#BDE7E1]/45"
                        >
                            <FileWarning className="h-4 w-4 text-[#F2A20B]" />
                            Laporkan Kejadian
                        </a>
                    </div>

                </div>

                <div className="jaga-home-mascot-wrap relative mx-auto flex w-full max-w-[390px] items-end justify-center">
                    <div className="jaga-home-mascot-glow pointer-events-none absolute bottom-6 h-[72%] w-[72%] rounded-full bg-[#BDE7E1]/25 blur-3xl" />
                    <button
                        type="button"
                        aria-label="Maskot interaktif JagaSleman"
                        className="jaga-home-mascot-only relative isolate cursor-pointer rounded-[2rem] outline-none transition duration-300 focus-visible:ring-4 focus-visible:ring-[#BDE7E1]/60"
                        onClick={() => {
                            const target = document.getElementById('jaga-home-feature-grid');
                            target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                    >
                        <img
                            src="/images/Maskot_Web.png"
                            alt="Maskot JagaSleman"
                            className="relative z-10 max-h-[330px] w-auto object-contain drop-shadow-[0_32px_46px_rgba(0,0,0,.36)] transition duration-300 md:max-h-[370px]"
                            draggable={false}
                            onError={(event) => {
                                event.currentTarget.src = '/images/maskot_polisi.png';
                            }}
                        />
                    </button>
                </div>
            </div>
        </section>
    );
}
