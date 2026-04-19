import { useState } from "react";
import { MapView } from "@/components/MapView";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Send } from "lucide-react";

const incidentTypes = ["Pencurian", "Perampokan", "Kecelakaan", "Kebakaran", "Tawuran", "Vandalisme", "Lainnya"];

export default function IncidentReport() {
  const [clickMarker, setClickMarker] = useState<{ lat: number; lng: number } | null>(null);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", type: "", time: "", description: "",
  });

  const handleMapClick = (lat: number, lng: number) => {
    setClickMarker({ lat, lng });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickMarker) {
      toast.error("Silakan klik pada peta untuk menentukan lokasi kejadian");
      return;
    }
    toast.success("Laporan berhasil dikirim! Terima kasih atas partisipasi Anda.");
    setForm({ name: "", email: "", phone: "", type: "", time: "", description: "" });
    setClickMarker(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      {/* Form */}
      <div className="w-full lg:w-[420px] overflow-y-auto border-r bg-card">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Laporkan Kejadian</CardTitle>
            <p className="text-sm text-muted-foreground">Isi form dan klik peta untuk lokasi</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>No. HP</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Jenis Kejadian</Label>
                  <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {incidentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Waktu Kejadian</Label>
                  <Input type="datetime-local" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required />
              </div>
              <div className="space-y-2">
                <Label>Lokasi (klik pada peta)</Label>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {clickMarker ? (
                    <span className="font-mono text-xs">{clickMarker.lat.toFixed(5)}, {clickMarker.lng.toFixed(5)}</span>
                  ) : (
                    <span className="text-muted-foreground">Belum dipilih</span>
                  )}
                </div>
              </div>
              <Button type="submit" className="w-full">
                <Send className="w-4 h-4 mr-2" /> Kirim Laporan
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-[300px]">
        <MapView onClick={handleMapClick} clickMarker={clickMarker} zoom={13} />
      </div>
    </div>
  );
}
