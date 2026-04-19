import { useState, useMemo } from "react";
import { emergencyContacts } from "@/data/dummy";
import { MapView } from "@/components/MapView";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Phone, MapPin, Search } from "lucide-react";

export default function Emergency() {
  const [filter, setFilter] = useState<"Semua" | "Polsek" | "Rumah Sakit">("Semua");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    let list = emergencyContacts;
    if (filter !== "Semua") list = list.filter((c) => c.type === filter);
    if (search) list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [filter, search]);

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-4rem)]">
      {/* List */}
      <div className="w-full lg:w-[380px] overflow-y-auto border-r bg-card">
        <div className="p-4 border-b space-y-3">
          <h1 className="text-lg font-bold text-primary">Kontak Darurat</h1>
          <div className="rounded-xl overflow-hidden border border-police/30">
            <img src="/images/police-panel.png" alt="Ilustrasi pos polisi darurat" className="w-full h-28 object-cover" />
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {(["Semua", "Polsek", "Rumah Sakit"] as const).map((f) => (
              <Badge key={f} variant={filter === f ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilter(f)}>
                {f}
              </Badge>
            ))}
          </div>
        </div>
        <div className="p-3 space-y-2">
          {filtered.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-lg ${c.type === "Polsek" ? "bg-police/15 text-police" : "bg-primary/10 text-primary"}`}>
                  {c.type === "Polsek" ? "🏛" : "🏥"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{c.name}</p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3" /> <span className="truncate">{c.address}</span>
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium mt-1 ${c.type === "Polsek" ? "text-police" : "text-primary"}`}>
                    <Phone className="w-3 h-3" /> {c.phone}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-[300px]">
        <MapView contacts={filtered} zoom={12} />
      </div>
    </div>
  );
}
