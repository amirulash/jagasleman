import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import {
  BarChart3,
  FileWarning,
  Home,
  LogIn,
  Map,
  Menu,
  Newspaper,
  Phone,
  X,
} from "lucide-react";
import { Button } from "@/Components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Beranda", url: "/", icon: Home },
  { title: "Peta Kejadian", url: "/webgis", icon: Map },
  { title: "Laporkan", url: "/report", icon: FileWarning },
  { title: "Statistik", url: "/statistics", icon: BarChart3 },
  { title: "Berita", url: "/news", icon: Newspaper },
  { title: "Kontak Bantuan", url: "/emergency", icon: Phone },
];

function isCurrentPath(pathname: string, url: string) {
  return url === "/" ? pathname === "/" : pathname.startsWith(url);
}

export function TopNavbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  const mobileNavigation = mobileOpen && typeof document !== "undefined"
    ? createPortal(
        <div
          id="jaga-mobile-navigation"
          className="jaga-mobile-navigation fixed inset-0 z-[9999] xl:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigasi utama JagaSleman"
        >
          <button
            type="button"
            className="jaga-mobile-navigation-backdrop absolute inset-0"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu navigasi"
          />

          <section className="jaga-mobile-navigation-panel absolute bottom-0 right-0 top-0 flex w-[min(420px,calc(100vw-18px))] flex-col overflow-hidden border-l border-[#BDE7E1] bg-white shadow-[-24px_0_70px_rgba(4,20,33,.30)]">
            <div className="jaga-mobile-navigation-header flex shrink-0 items-center justify-between gap-3 border-b border-[#DDECE8] px-4 py-4">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="jaga-mobile-drawer-brand min-w-0"
                aria-label="Buka Beranda JagaSleman"
              >
                <div className="jaga-logo-wordmark">
                  <span className="jaga-logo-wordmark-text">JagaSleman</span>
                  <span className="jaga-logo-wordmark-line" />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="jaga-mobile-drawer-close flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#BDE7E1] bg-[#F6FBF8] text-[#07324A]"
                aria-label="Tutup menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="jaga-mobile-navigation-body min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <div className="mb-3 px-1">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#0B6E78]">Navigasi Utama</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-[#5C7186]">Semua menu ditampilkan lengkap agar mudah dipilih pada perangkat mobile.</p>
              </div>

              <nav className="grid gap-2.5" aria-label="Navigasi mobile">
                {menuItems.map((item) => {
                  const active = isCurrentPath(location.pathname, item.url);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.url}
                      to={item.url}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "jaga-mobile-nav-link group flex min-h-[58px] w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-black transition-all",
                        active ? "is-active" : "is-inactive",
                      )}
                    >
                      <span className="jaga-mobile-nav-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border">
                        <Icon className="h-[19px] w-[19px]" strokeWidth={2.6} />
                      </span>
                      <span className="jaga-mobile-nav-label min-w-0 flex-1 text-left leading-tight">{item.title}</span>
                      <span className="jaga-mobile-nav-arrow" aria-hidden="true">›</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="jaga-mobile-navigation-footer shrink-0 border-t border-[#DDECE8] bg-white px-4 py-4">
              <Button asChild size="sm" className="jaga-mobile-login-button h-12 w-full rounded-xl bg-[#0B6E78] font-black text-white hover:bg-[#07324A]">
                <Link to="/login" className="jaga-auth-login-link" onClick={() => setMobileOpen(false)}>
                  <LogIn className="mr-2 h-4 w-4" />
                  Masuk ke Akun
                </Link>
              </Button>
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <header className="jaga-top-navbar relative z-[1000] shrink-0 border-b border-[#BDE7E1] bg-white">
        <div className="jaga-navbar-container mx-auto w-full max-w-[118rem] px-3 py-2 sm:px-4">
          <div className="jaga-navbar-shell flex min-h-[64px] items-center justify-between gap-3 rounded-[1.35rem] border border-[#BDE7E1] bg-white px-3 shadow-[0_10px_30px_rgba(15,31,46,.10)] sm:min-h-[68px] sm:px-4">
            <Link
              to="/"
              className="jaga-brand-link flex min-w-0 shrink items-center rounded-xl py-1 outline-none transition focus-visible:ring-4 focus-visible:ring-[#BDE7E1]/70"
              aria-label="Buka halaman Beranda JagaSleman"
            >
              <div className="jaga-logo-wordmark" aria-label="JagaSleman">
                <span className="jaga-logo-wordmark-text">JagaSleman</span>
                <span className="jaga-logo-wordmark-line" />
              </div>
            </Link>

            <nav className="jaga-navbar-menu hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-x-auto rounded-full border border-[#BDE7E1] bg-[#E9F8F3] p-1.5 xl:flex" aria-label="Navigasi utama">
              {menuItems.map((item) => {
                const active = isCurrentPath(location.pathname, item.url);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.url}
                    to={item.url}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "jaga-nav-link group inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-2 text-[12px] font-black transition-all duration-200 hover:-translate-y-0.5",
                      active ? "is-active" : "is-inactive",
                    )}
                  >
                    <span className="jaga-nav-icon flex h-7 w-7 items-center justify-center rounded-full border transition">
                      <Icon className="h-4 w-4" strokeWidth={2.7} />
                    </span>
                    <span className="jaga-nav-text whitespace-nowrap">{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="hidden shrink-0 items-center xl:flex">
              <Button asChild size="sm" className="jaga-auth-login-button rounded-xl bg-[#0B6E78] px-4 font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#07324A]">
                <Link to="/login" className="jaga-auth-login-link">
                  <LogIn className="mr-1.5 h-4 w-4" />
                  Masuk
                </Link>
              </Button>
            </div>

            <button
              className="jaga-mobile-menu-button inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#BDE7E1] bg-[#F6FBF8] px-3 text-sm font-black text-[#07324A] shadow-sm transition hover:border-[#0FA3A0] hover:bg-[#E9F8F3] xl:hidden"
              onClick={() => setMobileOpen((value) => !value)}
              type="button"
              aria-label={mobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
              aria-expanded={mobileOpen}
              aria-controls="jaga-mobile-navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="jaga-mobile-menu-label">Menu</span>
            </button>
          </div>
        </div>
      </header>
      {mobileNavigation}
    </>
  );
}
