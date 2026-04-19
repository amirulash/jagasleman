import { useState } from "react";
import { newsItems, type NewsItem } from "@/data/dummy";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Newspaper } from "lucide-react";

const categories = ["Semua", "Keamanan", "Kejahatan", "Himbauan"] as const;

const categoryColor: Record<string, string> = {
  Keamanan: "bg-primary/10 text-primary border-primary/20",
  Kejahatan: "bg-emergency/10 text-emergency border-emergency/20",
  Himbauan: "bg-warning/10 text-warning border-warning/20",
};

export default function News() {
  const [filter, setFilter] = useState<string>("Semua");
  const [selected, setSelected] = useState<NewsItem | null>(null);

  const filtered = filter === "Semua" ? newsItems : newsItems.filter((n) => n.category === filter);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Berita Keamanan</h1>
        <p className="text-sm text-muted-foreground">Informasi terkini seputar keamanan Kabupaten Sleman</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map((c) => (
          <Badge
            key={c}
            variant={filter === c ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter(c)}
          >
            {c}
          </Badge>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((news) => (
          <Card key={news.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelected(news)}>
            <CardContent className="p-5 flex gap-4">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Newspaper className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`text-[10px] ${categoryColor[news.category]}`}>{news.category}</Badge>
                  <span className="text-xs text-muted-foreground">{news.date}</span>
                </div>
                <h3 className="font-semibold text-sm mb-1">{news.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{news.summary}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              {selected && <Badge variant="outline" className={categoryColor[selected.category]}>{selected.category}</Badge>}
              <span className="text-xs text-muted-foreground">{selected?.date}</span>
            </div>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">{selected?.content}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
