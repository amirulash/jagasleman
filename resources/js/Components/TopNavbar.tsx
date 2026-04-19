import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Map, FileWarning, BarChart3, Newspaper, Phone, Shield, Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Beranda", url: "/", icon: Home },
  { title: "Peta Kejadian", url: "/webgis", icon: Map },
  { title: "Laporkan", url: "/report", icon: FileWarning },
  { title: "Statistik", url: "/statistics", icon: BarChart3 },
  { title: "Berita", url: "/news", icon: Newspaper },
  { title: "Kontak Darurat", url: "/emergency", icon: Phone },
];

export function TopNavbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="h-full z-50 bg-gradient-to-r from-primary via-primary to-police border-b border-primary-foreground/20 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-full">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-primary-foreground">JagaSleman</span>
            <p className="text-[10px] text-primary-foreground/75 leading-none">Keamanan Kab. Sleman</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {menuItems.map((item) => {
            const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-foreground/15 text-primary-foreground"
                    : "text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Auth buttons */}
        <div className="hidden lg:flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
            <Link to="/login"><LogIn className="w-4 h-4 mr-1.5" />Masuk</Link>
          </Button>
          <Button asChild size="sm" className="bg-primary-foreground text-police hover:bg-primary-foreground/90">
            <Link to="/register">Daftar</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button className="lg:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-primary-foreground/20 bg-primary px-4 pb-4">
          <nav className="flex flex-col gap-1 pt-2">
            {menuItems.map((item) => {
              const isActive = item.url === "/" ? location.pathname === "/" : location.pathname.startsWith(item.url);
              return (
                <Link
                  key={item.url}
                  to={item.url}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary-foreground/15 text-primary-foreground"
                      : "text-primary-foreground/75 hover:text-primary-foreground hover:bg-primary-foreground/10"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <Button asChild variant="outline" size="sm" className="flex-1 border-primary-foreground/30 text-primary-foreground bg-transparent hover:bg-primary-foreground/10">
              <Link to="/login" onClick={() => setMobileOpen(false)}>Masuk</Link>
            </Button>
            <Button asChild size="sm" className="flex-1 bg-primary-foreground text-police hover:bg-primary-foreground/90">
              <Link to="/register" onClick={() => setMobileOpen(false)}>Daftar</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
