import { useState } from "react";
import { useForm, usePage } from "@inertiajs/react";
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
  const { flash, auth } = usePage().props as {
    flash?: { success?: string; error?: string };
    auth?: { user?: { name?: string; email?: string } | null };
  };
  const authenticatedUser = auth?.user;
  const [clickMarker, setClickMarker] = useState<{ lat: number; lng: number } | null>(null);
  const { data, setData, post, processing, errors, reset } = useForm({
    name: authenticatedUser?.name ?? "",
    email: authenticatedUser?.email ?? "",
    phone: "",
    type: "",
    time: "",
    description: "",
    latitude: "",
    longitude: "",
  });

  const handleMapClick = (lat: number, lng: number) => {
    setClickMarker({ lat, lng });
    setData("latitude", String(lat));
    setData("longitude", String(lng));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clickMarker) {
      toast.error("Silakan klik pada peta untuk menentukan lokasi kejadian");
      return;
    }

    post(route("report.store"), {
      preserveScroll: true,
      onSuccess: () => {
        toast.success("Laporan berhasil dikirim! Menunggu persetujuan admin.");
        reset();
        if (authenticatedUser?.name) {
          setData("name", authenticatedUser.name);
        }
        if (authenticatedUser?.email) {
          setData("email", authenticatedUser.email);
        }
        setClickMarker(null);
      },
      onError: () => {
        toast.error("Gagal mengirim laporan. Periksa data form Anda.");
      },
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-3.5rem)]">
      {/* Form */}
      <div className="w-full lg:w-[420px] overflow-y-auto border-r bg-card">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Laporkan Kejadian</CardTitle>
            <p className="text-sm text-muted-foreground">Isi form dan klik peta untuk lokasi</p>
            {flash?.success && <p className="text-sm text-emerald-600">{flash.success}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {authenticatedUser ? (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                  Melapor sebagai {authenticatedUser.name} ({authenticatedUser.email}).
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Nama Lengkap</Label>
                    <Input value={data.name} onChange={(e) => setData("name", e.target.value)} required />
                    {errors.name && <p className="text-xs text-red-600">{errors.name}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" value={data.email} onChange={(e) => setData("email", e.target.value)} required />
                      {errors.email && <p className="text-xs text-red-600">{errors.email}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>No. HP</Label>
                      <Input value={data.phone} onChange={(e) => setData("phone", e.target.value)} required />
                      {errors.phone && <p className="text-xs text-red-600">{errors.phone}</p>}
                    </div>
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Jenis Kejadian</Label>
                  <Select value={data.type} onValueChange={(v) => setData("type", v)}>
                    <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                    <SelectContent>
                      {incidentTypes.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.type && <p className="text-xs text-red-600">{errors.type}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Waktu Kejadian</Label>
                  <Input type="datetime-local" value={data.time} onChange={(e) => setData("time", e.target.value)} required />
                  {errors.time && <p className="text-xs text-red-600">{errors.time}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={data.description} onChange={(e) => setData("description", e.target.value)} rows={3} required />
                {errors.description && <p className="text-xs text-red-600">{errors.description}</p>}
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
                {(errors.latitude || errors.longitude) && <p className="text-xs text-red-600">Lokasi peta wajib dipilih.</p>}
              </div>
              <Button type="submit" className="w-full" disabled={processing}>
                <Send className="w-4 h-4 mr-2" /> {processing ? "Mengirim..." : "Kirim Laporan"}
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
