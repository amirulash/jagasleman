import { useEffect, useState } from "react";
import { Activity, Clock, AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";
import { incidents } from "@/data/dummy";

/* ── helpers ── */
function padTwo(n: number) {
  return String(n).padStart(2, "0");
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/* jumlah kejadian hari ini dari dummy data (simulasi) */
function getTodayCount() {
  const today = new Date();
  const dd = padTwo(today.getDate());
  const mm = padTwo(today.getMonth() + 1);
  const yyyy = today.getFullYear();
  const todayStr = `${dd}/${mm}/${yyyy}`;
  const filtered = incidents.filter((inc) => inc.date === todayStr);
  /* fallback: simulasi angka kecil agar tidak selalu 0 */
  return filtered.length || Math.floor(Math.random() * 4) + 1;
}

/* ── sub-components ── */
function Divider() {
  return (
    <span className="h-4 w-px bg-white/15 mx-1 flex-shrink-0" />
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
      style={{ background: color, boxShadow: `0 0 0 2px ${color}33` }}
    />
  );
}

/* ════════════ COMPONENT ════════════ */
export default function LiveStatusBar() {
  const [now, setNow] = useState(new Date());
  const [todayCount] = useState(getTodayCount);
  const [blink, setBlink] = useState(true);

  /* tick every second */
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setBlink((b) => !b);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const hh = padTwo(now.getHours());
  const mm = padTwo(now.getMinutes());
  const ss = padTwo(now.getSeconds());
  const hari = HARI[now.getDay()];
  const tgl = now.getDate();
  const bln = BULAN[now.getMonth()];
  const thn = now.getFullYear();

  /* warna indikator berdasarkan jam (malam = lebih waspada) */
  const hour = now.getHours();
  const isRawan = hour >= 21 || hour < 5;
  const isSore = hour >= 17 && hour < 21;

  const statusLabel = isRawan ? "Jam Rawan" : isSore ? "Waspada" : "Normal";
  const statusColor = isRawan ? "#D95F5F" : isSore ? "#F59E0B" : "#4ade80";
  const statusBg = isRawan
    ? "rgba(239,68,68,0.12)"
    : isSore
    ? "rgba(251,191,36,0.12)"
    : "rgba(74,222,128,0.12)";

  return (
    <div
      className="w-full flex items-center gap-0 overflow-x-auto scrollbar-none"
      style={{
        background: "rgba(0,0,0,0.35)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(8px)",
        height: "36px",
        padding: "0 16px",
        fontSize: "11.5px",
        color: "rgba(255,255,255,0.65)",
        whiteSpace: "nowrap",
      }}
    >
      {/* Jam digital */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Clock className="w-3 h-3 opacity-50" />
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 500,
            color: "#fff",
            letterSpacing: "0.5px",
            fontSize: "12px",
          }}
        >
          {hh}
          <span style={{ opacity: blink ? 1 : 0.25, transition: "opacity 0.15s" }}>:</span>
          {mm}
          <span style={{ opacity: 0.5 }}>:{ss}</span>
        </span>
        <span style={{ opacity: 0.4 }}>WIB</span>
      </div>

      <Divider />

      {/* Tanggal */}
      <span className="flex-shrink-0" style={{ opacity: 0.6 }}>
        {hari}, {tgl} {bln} {thn}
      </span>

      <Divider />

      {/* Status keamanan berdasarkan jam */}
      <div
        className="flex items-center gap-1.5 flex-shrink-0 px-2 py-0.5 rounded-full"
        style={{ background: statusBg, border: `1px solid ${statusColor}30` }}
      >
        <Dot color={statusColor} />
        <span style={{ color: statusColor, fontWeight: 500 }}>{statusLabel}</span>
      </div>

      <Divider />

      {/* Kejadian hari ini */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <AlertTriangle className="w-3 h-3" style={{ color: "#F59E0B", opacity: 0.8 }} />
        <span>
          <span style={{ color: "#F59E0B", fontWeight: 500 }}>{todayCount}</span>
          {" "}kejadian hari ini
        </span>
      </div>

      <Divider />

      {/* Total aktif */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <TrendingUp className="w-3 h-3 opacity-50" />
        <span>
          <span style={{ color: "#fff", fontWeight: 500 }}>{incidents.length}</span>
          {" "}total tercatat
        </span>
      </div>

      <Divider />

      {/* Sistem aktif */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <ShieldCheck className="w-3 h-3" style={{ color: "#4ade80" }} />
        <span style={{ color: "#4ade80", fontWeight: 500 }}>Sistem Aktif</span>
      </div>

      {/* Spacer + last updated */}
      <div className="flex-1 min-w-4" />
      <div className="flex items-center gap-1 flex-shrink-0" style={{ opacity: 0.35 }}>
        <Activity className="w-3 h-3" />
        <span>Diperbarui: {hh}:{mm}:{ss}</span>
      </div>
    </div>
  );
}
