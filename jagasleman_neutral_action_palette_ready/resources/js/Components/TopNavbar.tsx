import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Map, FileWarning, BarChart3, Newspaper, Phone, Menu, X, LogIn, Shield } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Beranda", url: "/", icon: Home, label: "Home" },
  { title: "Peta Kejadian", url: "/webgis", icon: Map, label: "Map" },
  { title: "Laporkan", url: "/report", icon: FileWarning, label: "Report" },
  { title: "Statistik", url: "/statistics", icon: BarChart3, label: "Stats" },
  { title: "Berita", url: "/news", icon: Newspaper, label: "News" },
  { title: "Kontak Bantuan", url: "/emergency", icon: Phone, label: "Help" },
];

export function TopNavbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="jaga-top-navbar z-50 border-b border-[#D8E4ED]/70 bg-white/90 shadow-[0_14px_40px_rgba(15,31,46,.10)] backdrop-blur-xl">
      <div className="mx-auto max-w-[96rem] px-3 py-2.5 sm:px-4">
        <div className="flex h-14 items-center justify-between gap-2 rounded-[1.45rem] border border-[#D8E4ED]/85 bg-white/95 px-2 shadow-[0_10px_30px_rgba(15,31,46,.08)]">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5 rounded-2xl p-1 transition hover:-translate-y-0.5">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[1.05rem] border border-[#D8E4ED] bg-[#EFF4F8] shadow-sm transition group-hover:border-[#5BAE8A]/70 group-hover:bg-white">
              <Shield className="h-5 w-5 text-[#27527A]" />
              <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#5BAE8A]" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm font-black tracking-tight text-[#0F1F2E]">JagaSleman</span>
              <p className="truncate text-[10px] font-bold leading-none text-[#35506D]">Keamanan Kab. Sleman</p>
            </div>
          </Link>

          <nav className="hidden min-w-0 items-center gap-1 rounded-full border border-[#D8E4ED]/80 bg-[#EFF4F8] p-1 xl:flex">
            {menuItems.map((item) => {
              const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
              const Icon = item.icon;
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  className={cn(
                    "jaga-nav-link group inline-flex items-center gap-1.5 rounded-full px-2.5 py-2 text-[13px] font-black transition-all duration-200",
                    isActive
                      ? "is-active bg-[#0F1F2E] text-white shadow-md shadow-[#0F1F2E]/20"
                      : "text-[#1A3348] hover:-translate-y-0.5 hover:bg-white hover:text-[#D95F5F] hover:shadow-sm"
                  )}
                >
                  <span className={cn(
                    "jaga-nav-icon flex h-7 w-7 items-center justify-center rounded-full transition",
                    isActive ? "bg-white/15 text-white" : "bg-white text-[#27527A] group-hover:bg-[#D95F5F] group-hover:text-white"
                  )}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="whitespace-nowrap">{item.title}</span>
                </Link>
              );
            })}
          </nav>

          <div className="hidden items-center gap-1.5 xl:flex">
            <Button asChild size="sm" className="rounded-xl bg-[#27527A] px-3 font-black text-white shadow-md transition hover:-translate-y-0.5 hover:bg-[#1A3348]">
              <Link to="/login"><LogIn className="mr-1.5 h-4 w-4" />Masuk</Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 xl:hidden">
            <button
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] text-[#0F1F2E] shadow-sm transition hover:border-[#5BAE8A]/70 hover:bg-white"
              onClick={() => setMobileOpen(!mobileOpen)}
              type="button"
              aria-label="Buka menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-[#D8E4ED] bg-white/95 px-4 pb-4 shadow-xl backdrop-blur-xl xl:hidden">
          <nav className="grid gap-2 pt-3">
            {menuItems.map((item) => {
              const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
              const Icon = item.icon;
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "jaga-mobile-nav-link group flex items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-black transition-all",
                    isActive
                      ? "is-active border-[#0F1F2E] bg-[#0F1F2E] text-white shadow-md"
                      : "border-[#D8E4ED] bg-[#EFF4F8] text-[#0F1F2E] hover:border-[#5BAE8A]/70 hover:bg-white"
                  )}
                >
                  <span className={cn("jaga-mobile-nav-icon flex h-8 w-8 items-center justify-center rounded-xl", isActive ? "bg-white/15 text-white" : "bg-white text-[#27527A]") }>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span>{item.title}</span>
                  <span className={cn("ml-auto text-[10px] font-black uppercase tracking-[0.16em]", isActive ? "text-white/65" : "text-[#35506D]")}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 border-t border-[#D8E4ED] pt-3">
            <Button asChild size="sm" className="w-full rounded-xl bg-[#27527A] font-black text-white hover:bg-[#1A3348]">
              <Link to="/login" onClick={() => setMobileOpen(false)}><LogIn className="mr-1.5 h-4 w-4" />Masuk</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
