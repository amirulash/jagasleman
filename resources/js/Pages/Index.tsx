import { Link } from "react-router-dom";
import { Map, FileWarning, BarChart3, Newspaper, Phone, AlertTriangle, ArrowRight, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { incidents } from "@/data/dummy";

const features = [
  { title: "Peta Kejadian", desc: "Pantau kejadian di seluruh Sleman secara real-time", icon: Map, url: "/webgis", color: "text-police" },
  { title: "Laporkan", desc: "Laporkan kejadian yang Anda saksikan", icon: FileWarning, url: "/report", color: "text-emergency" },
  { title: "Statistik", desc: "Analisis tren dan hotspot keamanan", icon: BarChart3, url: "/statistics", color: "text-warning" },
  { title: "Berita", desc: "Informasi keamanan terkini", icon: Newspaper, url: "/news", color: "text-success" },
  { title: "Kontak Darurat", desc: "Cari polsek dan rumah sakit terdekat", icon: Phone, url: "/emergency", color: "text-primary" },
];

const recentIncidents = incidents.slice(0, 4);

const statusBadge: Record<string, string> = {
  Aktif: "bg-emergency/10 text-emergency border-emergency/20",
  Ditangani: "bg-warning/10 text-warning border-warning/20",
  Selesai: "bg-success/10 text-success border-success/20",
};

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/95 via-primary to-police pb-8">
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 space-y-6 text-primary-foreground">
        <div className="relative overflow-hidden rounded-2xl border border-primary-foreground/20 bg-black/15 backdrop-blur-sm">
          <img src="/images/crime-alert.png" alt="Tekstur keamanan" className="absolute inset-0 w-full h-full object-cover opacity-15" />
          <div className="relative z-10 grid lg:grid-cols-[1.05fr_1fr] gap-6 p-5 md:p-7">
            <div className="space-y-5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary-foreground/15 border border-primary-foreground/20 flex items-center justify-center">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-primary-foreground/90">Sistem Pemantauan Keamanan Sleman</span>
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">Selamat Datang di JagaSleman WebGIS</h1>
                <p className="text-primary-foreground/80 mt-3 max-w-xl">
                  Sebuah Platform WebGIS Interaktif untuk memantau dan melaporkan kejadian kejahatan Jalanan di Kabupaten Sleman
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold">Statistik Keamanan Sleman</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <div className="rounded-lg border border-primary-foreground/20 bg-black/20 p-3">
                    <p className="text-xs text-primary-foreground/75">Jumlah Kejadian Terkini</p>
                    <p className="text-xl font-bold">96</p>
                  </div>
                  <div className="rounded-lg border border-primary-foreground/20 bg-black/20 p-3">
                    <p className="text-xs text-primary-foreground/75">Kriminalitas Terbanyak</p>
                    <p className="text-xl font-bold">Pencurian</p>
                  </div>
                  <div className="rounded-lg border border-primary-foreground/20 bg-black/20 p-3 sm:col-span-2">
                    <p className="text-xs text-primary-foreground/75">Area Dominan</p>
                    <p className="text-xl font-bold">Caturtunggal</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button asChild variant="secondary" className="text-police font-semibold">
                  <Link to="/webgis"><Map className="w-4 h-4 mr-2" />Telusuri Peta</Link>
                </Button>
                <Button asChild variant="outline" className="bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/20">
                  <Link to="/report"><AlertTriangle className="w-4 h-4 mr-2" />Buat Laporan</Link>
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
                  <Link to="/webgis">Telusuri Peta</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-3">
          {features.map((f) => (
            <Link key={f.url} to={f.url}>
              <Card className="h-full border-primary-foreground/15 bg-black/20 hover:bg-black/30 transition-colors">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className={`p-2 rounded-lg bg-primary-foreground/10 ${f.color}`}>
                    <f.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-primary-foreground">{f.title}</p>
                    <p className="text-xs text-primary-foreground/70">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="border-primary-foreground/15 bg-black/20">
          <CardContent className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-primary-foreground">Kejadian Terbaru</h2>
              <Button asChild variant="ghost" size="sm" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Link to="/webgis">Lihat Semua <ArrowRight className="w-4 h-4 ml-1" /></Link>
              </Button>
            </div>
            <div className="space-y-2">
              {recentIncidents.map((inc) => (
                <div key={inc.id} className="rounded-lg border border-primary-foreground/10 bg-black/20 p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-foreground/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-4 h-4 text-primary-foreground/80" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm text-primary-foreground">{inc.type}</span>
                      <Badge variant="outline" className={`text-[10px] ${statusBadge[inc.status]}`}>{inc.status}</Badge>
                    </div>
                    <p className="text-xs text-primary-foreground/70 truncate">{inc.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0 text-primary-foreground/75">
                    <p className="text-xs font-medium">{inc.date}</p>
                    <p className="text-xs">{inc.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="rounded-xl border border-primary-foreground/20 bg-black/20 p-4 md:p-5">
          <div className="grid md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-bold mb-1">JagaSleman</p>
              <p className="text-primary-foreground/75 text-xs">jagasleman@sleman.id</p>
            </div>
            <div>
              <p className="font-bold mb-1">Navigasi Cepat</p>
              <p className="text-primary-foreground/75 text-xs">Beranda • Peta • Statistik</p>
            </div>
            <div>
              <p className="font-bold mb-1">Hubungi Kami</p>
              <p className="text-primary-foreground/75 text-xs">0274 868456</p>
            </div>
            <div>
              <p className="font-bold mb-1">Lokasi</p>
              <p className="text-primary-foreground/75 text-xs">Kabupaten Sleman, DI Yogyakarta</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
