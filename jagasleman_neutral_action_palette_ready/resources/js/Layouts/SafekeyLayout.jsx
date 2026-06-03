import TopNavbar from '@/Components/Safekey/TopNavbar';

export default function SafekeyLayout({ children }) {
    return (
        <div className="jagasleman-layout-shell theme-shell min-h-dvh text-foreground">
            <div className="jagasleman-top-navbar sticky top-0 z-50 shrink-0">
                <TopNavbar />
            </div>

            <main className="jagasleman-layout-main w-full overflow-visible overflow-x-hidden">
                {children}
            </main>
        </div>
    );
}
