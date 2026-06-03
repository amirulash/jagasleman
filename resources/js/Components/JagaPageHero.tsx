import { ShieldCheck } from 'lucide-react';

type HeroAction = {
    label: string;
    href: string;
    tone?: 'primary' | 'secondary';
};

type JagaPageHeroProps = {
    page?: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    actions?: HeroAction[];
    sideTitle?: string;
    sideText?: string;
    sideItems?: string[];
};

export function JagaPageHero({
    eyebrow,
    title,
    subtitle,
}: JagaPageHeroProps) {
    return (
        <section className="relative isolate overflow-hidden bg-[#07324A] text-white">
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_15%,rgba(242,162,11,.22),transparent_24rem),radial-gradient(circle_at_84%_12%,rgba(189,231,225,.22),transparent_26rem),linear-gradient(135deg,#07324A_0%,#0B445B_58%,#0FA3A0_130%)]" />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#F4FBF8] to-transparent" />
            </div>

            <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 md:py-8 lg:px-8">
                <div className="max-w-4xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#BDE7E1] backdrop-blur">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {eyebrow}
                    </div>

                    <h1 className="mt-3 text-3xl font-black leading-tight tracking-[-0.045em] sm:text-4xl lg:text-5xl">
                        {title}
                    </h1>

                    <p className="mt-2 max-w-3xl text-sm font-semibold leading-7 text-[#E9F8F3]/86 md:text-base">
                        {subtitle}
                    </p>

                </div>
            </div>
        </section>
    );
}
