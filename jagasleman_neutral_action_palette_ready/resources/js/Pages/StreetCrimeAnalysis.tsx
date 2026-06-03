import React, { useState, useEffect, useRef } from 'react';
import './StreetCrimeAnalysis.css';
import dataKejadianGeojsonRaw from '../data/points/data_kejadian.geojson?raw';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Component to control zoom level and center
function MapZoomController({ zoomLevel }: { zoomLevel: number }) {
  const map = useMap();
  useEffect(() => {
    map.setZoom(zoomLevel);
  }, [zoomLevel, map]);
  return null;
}

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom(), { animate: true, duration: 0.5 });
  }, [center, map]);
  return null;
}

interface Incident {
  id: number;
  type: string;
  loc: string;
  kec: string;
  date: string;
  time: string;
  lat: number;
  lng: number;
  risk: 'high' | 'med' | 'low';
}

interface KecData {
  name: string;
  count: number;
}

interface CrimeType {
  name: string;
  count: number;
  pct: number;
}

interface NewsItem {
  cat: string;
  title: string;
  date: string;
  color: string;
  bg: string;
  desc: string;
}

interface Polsek {
  name: string;
  addr: string;
  telp: string;
  type: 'Polresta' | 'Polsek' | 'RS' | 'Damkar';
}

const StreetCrimeAnalysis: React.FC = () => {
  const [activeNav, setActiveNav] = useState<'map' | 'statistik' | 'berita' | 'kontak'>('map');
  const [selectedInc, setSelectedInc] = useState<number | null>(null);
  const [currentTool, setCurrentTool] = useState('titik');
  const [zoomLvl, setZoomLvl] = useState(13);
  const [mapCenter, setMapCenter] = useState<[number, number]>([-7.69, 110.35]);
  const [rightTab, setRightTab] = useState('kde');
  const [reportOpen, setReportOpen] = useState(false);
  const [bandwidth, setBandwidth] = useState(1.2);
  const [showKDE, setShowKDE] = useState(true);
  const [kdeZones, setKdeZones] = useState<any[]>([]);
  const mapCanvasRef = useRef<HTMLDivElement>(null);

  // Sleman bounds: based on actual data range
  const SLEMAN_CENTER = [-7.69, 110.35] as [number, number];
  const SLEMAN_BOUNDS = {
    minLat: -7.783,
    maxLat: -7.598,
    minLng: 110.243,
    maxLng: 110.448,
  };

  // No conversion needed - use actual lat/lng directly
  const convertCoords = (lat: number, lng: number) => {
    return { lat, lng };
  };

  // Load incidents from GeoJSON
  const loadIncidentsFromGeojson = (): Incident[] => {
    try {
      const data = JSON.parse(dataKejadianGeojsonRaw);
      const features = data.features || [];

      return features
        .map((feature: any, index: number) => {
          const props = feature.properties;
          const coords = feature.geometry?.coordinates;
          if (!coords || coords.length < 2) return null;

          const [lng, lat] = coords;
          const mapCoords = convertCoords(lat, lng);

          // Parse category and determine type
          const category = props['Kategori']?.toLowerCase() || '';
          let type = 'Tawuran';
          if (category.includes('curan') || category.includes('pencurian kendaraan')) {
            type = 'Curanmor';
          } else if (category.includes('jambret') || category.includes('penjambret')) {
            type = 'Penjambretan';
          } else if (category.includes('rampok') || category.includes('perampokan')) {
            type = 'Perampokan';
          } else if (category.includes('klitih') || category.includes('kekerasan')) {
            type = 'Klitih';
          } else if (category.includes('pencurian') && !category.includes('curan')) {
            type = 'Pencurian';
          } else if (category.includes('keroyok') || category.includes('aniaya') || category.includes('penganiayaan')) {
            type = 'Klitih';
          }

          // Determine risk level by category
          const riskMap: Record<string, 'high' | 'med' | 'low'> = {
            'Curanmor': 'high',
            'Penjambretan': 'high',
            'Perampokan': 'med',
            'Klitih': 'high',
            'Pencurian': 'med',
            'Tawuran': 'med',
          };

          // Extract kecamatan from address
          const address = props['Alamat Fix'] || '';
          const kecList = ['Depok', 'Mlati', 'Ngaglik', 'Gamping', 'Kalasan', 'Godean', 'Sleman', 'Pakem', 'Turi', 'Minggir', 'Ngemplak', 'Prambanan', 'Berbah'];
          let kecamatan = 'Sleman';
          for (const kec of kecList) {
            if (address.toLowerCase().includes(kec.toLowerCase())) {
              kecamatan = kec;
              break;
            }
          }

          // Parse date - handle various formats
          let date = 'Tanggal tidak tersedia';
          const dateStr = props['Tanggal Kejadian'];
          if (dateStr && dateStr !== '-' && dateStr !== '(tidak tercantum)') {
            try {
              const parts = dateStr.split('/');
              if (parts.length === 3) {
                const day = parts[0];
                const month = parts[1];
                const year = parts[2].length === 2 ? '20' + parts[2] : parts[2];
                date = `${parseInt(day)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][parseInt(month) - 1]} ${year}`;
              }
            } catch {
              // keep default
            }
          }

          // Parse time
          let time = '00:00';
          const timeStr = props['Waktu Kejadian'];
          if (timeStr && timeStr !== '-' && timeStr !== '(tidak tercantum)') {
            const match = timeStr.match(/(\d{1,2})[.:]\s*(\d{2})/);
            if (match) {
              time = `${match[1].padStart(2, '0')}:${match[2]}`;
            }
          }

          return {
            id: index + 1,
            type,
            loc: address,
            kec: kecamatan,
            date,
            time,
            lat: mapCoords.lat,
            lng: mapCoords.lng,
            risk: (riskMap[type] || 'med') as 'high' | 'med' | 'low',
          };
        })
        .filter((inc: Incident | null) => inc !== null) as Incident[];
    } catch (error) {
      console.error('Error loading incidents from GeoJSON:', error);
      return [];
    }
  };

  const [incidents, setIncidents] = useState<Incident[]>(() => loadIncidentsFromGeojson());
  const [toast, setToast] = useState<string | null>(null);

  // Calculate KDE zones based on bandwidth
  useEffect(() => {
    if (!showKDE || incidents.length === 0) {
      setKdeZones([]);
      return;
    }

    // Simple KDE clustering: group incidents by spatial proximity
    const zones: any[] = [];
    const processed = new Set<number>();
    const radiusKm = bandwidth;

    incidents.forEach((inc1, idx1) => {
      if (processed.has(idx1)) return;

      const cluster = [inc1];
      processed.add(idx1);

      incidents.forEach((inc2, idx2) => {
        if (processed.has(idx2) || idx1 === idx2) return;

        // Calculate distance in km (simple Euclidean for lat/lng)
        const dlat = (inc2.lat - inc1.lat) * 111; // ~111 km per degree
        const dlng = (inc2.lng - inc1.lng) * 111 * Math.cos((inc1.lat * Math.PI) / 180);
        const distance = Math.sqrt(dlat * dlat + dlng * dlng);

        if (distance <= radiusKm) {
          cluster.push(inc2);
          processed.add(idx2);
        }
      });

      if (cluster.length > 0) {
        const centerLat = cluster.reduce((sum, inc) => sum + inc.lat, 0) / cluster.length;
        const centerLng = cluster.reduce((sum, inc) => sum + inc.lng, 0) / cluster.length;
        const density = (cluster.length / incidents.length) * 100;

        // Determine intensity level - 5 tier system
        let intensity = 'Aman';
        let color = '#52b788';
        if (density > 70) {
          intensity = 'Sangat Tinggi';
          color = '#1a0a00';
        } else if (density > 50) {
          intensity = 'Tinggi';
          color = '#c1121f';
        } else if (density > 30) {
          intensity = 'Sedang';
          color = '#e07b27';
        } else if (density > 15) {
          intensity = 'Rendah';
          color = '#f4e76e';
        } else {
          intensity = 'Aman';
          color = '#52b788';
        }

        zones.push({
          id: `kde-${zones.length}`,
          centerLat,
          centerLng,
          density,
          intensity,
          color,
          count: cluster.length,
          radius: radiusKm,
        });
      }
    });

    setKdeZones(zones);
  }, [showKDE, bandwidth, incidents]);

  const kecData: KecData[] = [
    {name:'Depok',count:28},{name:'Mlati',count:22},{name:'Ngaglik',count:18},
    {name:'Gamping',count:14},{name:'Godean',count:11},{name:'Sleman',count:9},
    {name:'Kalasan',count:8},{name:'Berbah',count:7},{name:'Ngemplak',count:6},
    {name:'Tempel',count:5},{name:'Turi',count:3},{name:'Pakem',count:3},
  ];

  const crimeTypes: CrimeType[] = [
    {name:'Curanmor',count:42,pct:31},{name:'Pencurian (Curas)',count:35,pct:26},
    {name:'Penjambretan',count:28,pct:21},{name:'Klitih/Kekerasan',count:18,pct:13},
    {name:'Perampokan',count:11,pct:9},
  ];

  const colors = {high:'#c1121f',med:'#e07b27',low:'#52b788'};
  const riskLabel = {high:'Tinggi',med:'Sedang',low:'Rendah'};
  const badgeClass = {high:'badge-high',med:'badge-med',low:'badge-low'};

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const selectIncident = (id: number) => {
    setSelectedInc(id);
  };

  const setTool = (tool: string) => {
    setCurrentTool(tool);
    const messages: Record<string, string> = {
      titik: 'Mode Titik Kejadian aktif',
      heatmap: 'Analisis KDE Hotspot aktif',
      cluster: 'Mode Cluster aktif',
    };
    showToast(messages[tool] || '');
  };

  const zoom = (dir: number) => {
    const newZoom = Math.max(10, Math.min(18, zoomLvl + dir));
    setZoomLvl(newZoom);
    showToast(`Zoom: ${newZoom}`);
  };

  const resetView = () => {
    setMapCenter([-7.69, 110.35]);
    setZoomLvl(13);
    showToast('Tampilan direset');
  };

  const zoomToZone = (lat: number, lng: number) => {
    setMapCenter([lat, lng]);
    setZoomLvl(15);
    showToast('Zoom ke zona KDE');
  };

  const updateBandwidth = (val: number) => {
    setBandwidth(parseFloat(val.toFixed(1)));
    showToast(`Bandwidth: ${val.toFixed(1)} km`);
  };

  const runKDE = () => {
    showToast('Menjalankan analisis KDE...');
    setTimeout(() => {
      setTool('heatmap');
      showToast('KDE selesai! Hotspot diperbarui.');
    }, 800);
  };

  const submitReport = () => {
    setReportOpen(false);
    showToast('✅ Laporan berhasil dikirim! Akan diverifikasi admin.');
    const newInc: Incident = {
      id: incidents.length + 1,
      type: 'Laporan Baru',
      loc: 'Lokasi baru',
      kec: 'Depok',
      date: 'Hari ini',
      time: 'Baru saja',
      lat: 45,
      lng: 55,
      risk: 'med',
    };
    setIncidents([newInc, ...incidents]);
  };

  const newsData: NewsItem[] = [
    {cat:'Peringatan',title:'Waspada Klitih di Area Ring Road Utara',date:'06 Apr 2025',color:'#c1121f',bg:'#fff0f1',desc:'Polresta Sleman mengimbau masyarakat untuk meningkatkan kewaspadaan terutama di malam hari.'},
    {cat:'Informasi',title:'Polsek Depok Intensifkan Patroli Malam',date:'04 Apr 2025',color:'#0d5ea6',bg:'#e8f0fb',desc:'Sebagai respons atas peningkatan kejadian, Polsek Depok menambah frekuensi patroli malam.'},
    {cat:'Pencegahan',title:'Tips Aman Berkendara di Sleman',date:'02 Apr 2025',color:'#2a9055',bg:'#e6f5ed',desc:'Berikut panduan berkendara aman untuk menghindari kejahatan jalanan di wilayah Kabupaten Sleman.'},
    {cat:'Statistik',title:'Data Kejahatan Q1 2025 Menurun 30%',date:'01 Apr 2025',color:'#7a3db5',bg:'#f3eaff',desc:'Berdasarkan data Polresta Sleman, kejadian kejahatan jalanan Q1 2025 turun signifikan.'},
    {cat:'Peringatan',title:'Modus Penjambretan Baru di Jl. Kaliurang',date:'30 Mar 2025',color:'#c1121f',bg:'#fff0f1',desc:'Pelaku menggunakan sepeda motor tanpa pelat dan menyasar pengguna smartphone.'},
    {cat:'Acara',title:'Sosialisasi Keamanan Bersama Warga Mlati',date:'28 Mar 2025',color:'#e07b27',bg:'#fff5e6',desc:'Babinkamtibmas Mlati menggelar sosialisasi keamanan lingkungan bersama RT/RW setempat.'},
  ];

  const polsekData: Polsek[] = [
    {name:'Polresta Sleman',addr:'Jl. Magelang KM 10, Sleman',telp:'(0274) 868419',type:'Polresta'},
    {name:'Polsek Depok',addr:'Jl. Wahid Hasyim, Condongcatur',telp:'(0274) 883002',type:'Polsek'},
    {name:'Polsek Mlati',addr:'Jl. Magelang KM 8',telp:'(0274) 867024',type:'Polsek'},
    {name:'Polsek Godean',addr:'Jl. Godean, Sleman',telp:'(0274) 798040',type:'Polsek'},
    {name:'Polsek Kalasan',addr:'Jl. Solo KM 13',telp:'(0274) 496109',type:'Polsek'},
    {name:'RS PKU Muhammadiyah',addr:'Jl. Tentara Pelajar, Sleman',telp:'(0274) 868082',type:'RS'},
    {name:'RS Bethesda Lempuyangwangi',addr:'Jl. Lempuyangwangi',telp:'(0274) 562246',type:'RS'},
    {name:'IGD RSUP Dr. Sardjito',addr:'Jl. Kesehatan, Sinduadi',telp:'(0274) 587333',type:'RS'},
    {name:'Damkar Sleman',addr:'Jl. Melati, Beran',telp:'(0274) 868468',type:'Damkar'},
  ];

  const getKdeZones = () => {
    return [
      {x:60,y:45,size:120,color:'rgba(193,18,31,0.35)',label:'Depok - Sangat Rawan'},
      {x:35,y:50,size:90,color:'rgba(224,123,39,0.3)',label:'Mlati - Rawan'},
      {x:22,y:32,size:70,color:'rgba(224,123,39,0.25)',label:'Ngaglik - Sedang'},
      {x:72,y:65,size:60,color:'rgba(244,230,110,0.3)',label:'Kalasan - Sedang'},
      {x:45,y:68,size:80,color:'rgba(82,183,136,0.2)',label:'Gamping - Rendah'},
      {x:75,y:35,size:50,color:'rgba(82,183,136,0.15)',label:'Prambanan - Aman'},
      {x:15,y:62,size:55,color:'rgba(82,183,136,0.15)',label:'Godean - Rendah'},
    ];
  };

  const months = ['J','F','M','A','M','J','J','A','S','O','N','D'];
  const monthlyVals = [3,1,2,3,2,1,2,4,2,2,2,1];
  const monthlyMax = Math.max(...monthlyVals);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', minHeight: '700px' }} className="bg-background text-foreground">
      {/* MAP VIEW */}
      {activeNav === 'map' && (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* LEFT SIDEBAR */}
          <div style={{ width: '300px', background: 'white', borderRight: '1px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Stats */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eef0f3' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Ringkasan 2020–2025</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { num: incidents.length, label: 'Total Kejadian', color: '#e63946' },
                  { num: 36, label: 'Tertinggi (2023)', color: '#e07b27' },
                  { num: 13, label: 'Terbaru (2025)', color: '#2a9055' },
                  { num: 12, label: 'Kecamatan Terdampak', color: '#1a1a2e' },
                ].map((stat, i) => (
                  <div key={i} style={{ background: '#f8f9fa', borderRadius: '8px', padding: '10px', border: '1px solid #eef0f3' }}>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color }}>{stat.num}</div>
                    <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '2px' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eef0f3' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Layer Peta</div>
              {[
                { label: 'Tahun', options: ['Semua Tahun', '2025', '2024', '2023', '2022', '2021', '2020'] },
                { label: 'Jenis Kejahatan', options: ['Semua Jenis', 'Pencurian Kendaraan (Curanmor)', 'Pencurian dengan Kekerasan', 'Penjambretan', 'Perampokan', 'Klitih / Kekerasan Jalanan'] },
                { label: 'Kecamatan', options: ['Semua Kecamatan', 'Depok', 'Mlati', 'Ngaglik', 'Gamping', 'Sleman', 'Godean'] },
              ].map((filter, i) => (
                <div key={i} style={{ marginBottom: '10px' }}>
                  <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>{filter.label}</div>
                  <select style={{ width: '100%', border: '1px solid #dde0e6', borderRadius: '6px', padding: '7px 10px', fontSize: '13px', background: 'white', color: '#1a1a2e', outline: 'none' }}>
                    {filter.options.map((opt, j) => (
                      <option key={j}>{opt}</option>
                    ))}
                  </select>
                </div>
              ))}

              {/* KDE Panel */}
              {/* KDE Panel */}
              <div style={{ background: '#000000', color: 'white', borderRadius: '10px', padding: '12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="checkbox"
                    checked={showKDE}
                    onChange={(e) => setShowKDE(e.target.checked)}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                  />
                  Analisis KDE Otomatis
                  <span style={{ background: '#2ec4b6', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '10px' }}>AUTO</span>
                </div>
                {[
                  { key: 'Metode', val: 'Kernel Density Estimation' },
                  { key: 'Bandwidth', val: `${bandwidth.toFixed(1)} km` },
                  { key: 'Total Titik', val: `${incidents.length} titik` },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{row.key}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'white' }}>{row.val}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  {[
                    { color: '#1a0a00', label: 'Sangat Tinggi' },
                    { color: '#c1121f', label: 'Tinggi' },
                    { color: '#e07b27', label: 'Sedang' },
                    { color: '#f4e76e', label: 'Rendah' },
                    { color: '#52b788', label: 'Aman' },
                  ].map((item, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ height: '8px', borderRadius: '2px', marginBottom: '3px', background: item.color }}></div>
                      <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Bandwidth Slider */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', marginBottom: '6px' }}>
                    Bandwidth: <strong>{bandwidth.toFixed(1)} km</strong>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={bandwidth}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setBandwidth(val);
                      showToast(`Bandwidth updated: ${val.toFixed(1)} km`);
                    }}
                    style={{ width: '100%', height: '5px', borderRadius: '3px', background: 'rgba(255,255,255,0.2)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                    <span>0.5 km</span>
                    <span>3.0 km</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Incident List */}
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '10px 16px 4px' }}>
              Kejadian Terbaru
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => selectIncident(inc.id)}
                  style={{
                    padding: '10px 16px',
                    borderBottom: '1px solid #f0f2f5',
                    cursor: 'pointer',
                    background: selectedInc === inc.id ? '#fff0f1' : 'transparent',
                    borderLeft: selectedInc === inc.id ? '3px solid #e63946' : 'none',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => !selectedInc && (e.currentTarget.style.background = '#f8f9fa')}
                  onMouseLeave={(e) => !selectedInc && (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '3px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a2e' }}>{inc.type}</span>
                    <span style={{ fontSize: '11px', color: '#6c757d' }}>{inc.time}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>📍 {inc.kec} · {inc.loc}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                    <span style={{ display: 'inline-block', fontSize: '10px', padding: '2px 7px', borderRadius: '10px', fontWeight: 600, background: colors[inc.risk] === '#e63946' ? '#ffe0e0' : colors[inc.risk] === '#e07b27' ? '#fff3cd' : '#d1f0e0', color: colors[inc.risk] === '#e63946' ? '#c1121f' : colors[inc.risk] === '#e07b27' ? '#856404' : '#155724' }}>
                      Risiko {riskLabel[inc.risk]}
                    </span>
                    <span style={{ fontSize: '11px', color: '#6c757d' }}>{inc.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MAP */}
          <div ref={mapCanvasRef} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', background: '#e8ecf0' }}>
            <div style={{ background: 'white', borderBottom: '1px solid rgba(0,0,0,0.1)', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              {['titik', 'heatmap', 'cluster'].map((tool) => (
                <button
                  key={tool}
                  onClick={() => setTool(tool)}
                  style={{
                    background: currentTool === tool ? '#e63946' : '#f0f2f5',
                    color: currentTool === tool ? 'white' : '#1a1a2e',
                    border: `1px solid ${currentTool === tool ? '#e63946' : '#dde0e6'}`,
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {tool === 'titik' && '📍 Titik Kejadian'}
                  {tool === 'heatmap' && '🔥 Hotspot KDE'}
                  {tool === 'cluster' && '🗂 Cluster'}
                </button>
              ))}
              <div style={{ width: '1px', height: '24px', background: '#dde0e6' }}></div>
              <span style={{ fontSize: '12px', color: '#6c757d' }}>Zoom: <strong>{zoomLvl}</strong></span>
              <span style={{ fontSize: '12px', color: '#6c757d', marginLeft: '8px' }}>Koordinat Sleman: 7°34'–7°47' LS, 110°12'–110°32' BT</span>
            </div>

            {/* Map Canvas with Leaflet */}
            <div style={{ flex: 1, position: 'relative', background: '#e8ecf0', overflow: 'hidden' }}>
              <MapContainer 
                center={SLEMAN_CENTER} 
                zoom={13} 
                style={{ width: '100%', height: '100%' }}
                zoomControl={false}
              >
                <MapZoomController zoomLevel={zoomLvl} />
                <MapCenterController center={mapCenter} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; OpenStreetMap contributors'
                />
                
                {/* Incident markers - Hidden, showing only KDE analysis */}
                {false && incidents.map((inc) => {
                  const icon = L.divIcon({
                    className: '',
                    html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.3);background:${colors[inc.risk]};color:white;font-size:10px;font-weight:600;"><div style="transform:rotate(45deg)">${inc.type[0]}</div></div>`,
                    iconSize: [28, 28],
                    iconAnchor: [14, 28],
                  });
                  
                  return (
                    <Marker 
                      key={inc.id} 
                      position={[inc.lat, inc.lng]} 
                      icon={icon}
                      eventHandlers={{
                        click: () => {
                          selectIncident(inc.id);
                          setMapCenter([inc.lat, inc.lng]);
                          setZoomLvl(16);
                        },
                      }}
                    >
                      <Popup>
                        <div style={{ fontSize: '12px', color: '#333', minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: `2px solid ${colors[inc.risk]}` }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 700, color: colors[inc.risk], fontSize: '13px' }}>{inc.type}</div>
                            </div>
                            <div style={{ background: colors[inc.risk], color: 'white', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>
                              {riskLabel[inc.risk]}
                            </div>
                          </div>
                          <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                            <strong>📍 Lokasi:</strong> {inc.loc}
                          </div>
                          <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                            <strong>🏘️ Kecamatan:</strong> {inc.kec}
                          </div>
                          <div style={{ fontSize: '11px', marginBottom: '4px' }}>
                            <strong>📅 Tanggal:</strong> {inc.date}
                          </div>
                          <div style={{ fontSize: '11px' }}>
                            <strong>🕐 Waktu:</strong> {inc.time}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
                
                {/* KDE heatmap zones */}
                {showKDE && kdeZones.map((zone) => {
                  const maxCount = Math.max(...kdeZones.map(z => z.count), 1);
                  const maxDensity = Math.max(...kdeZones.map(z => z.density), 1);
                  
                  // Size based on point count - more dramatic variation
                  const sizeRatio = Math.max(10, (zone.count / maxCount) * 40);
                  // Solid opacity for visibility - color already indicates intensity level
                  const fillOpacity = 0.7;
                  // Stroke weight increases with density for visual emphasis
                  const strokeWeight = Math.max(2, (zone.density / maxDensity) * 4);
                  
                  return (
                    <CircleMarker
                      key={zone.id}
                      center={[zone.centerLat, zone.centerLng]}
                      radius={sizeRatio}
                      fill={true}
                      fillColor={zone.color}
                      fillOpacity={fillOpacity}
                      color={zone.color}
                      weight={strokeWeight}
                      opacity={1}
                      eventHandlers={{
                        mouseover: () => {},
                        mouseout: () => {},
                        click: () => zoomToZone(zone.centerLat, zone.centerLng),
                      }}
                    >
                      <Popup>
                        <div style={{ fontSize: '12px', minWidth: '180px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: `2px solid ${zone.color}` }}>
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: zone.color }}></div>
                            <strong style={{ color: zone.color, flex: 1 }}>{zone.intensity}</strong>
                            <div style={{ fontSize: '10px', background: zone.color, color: 'white', padding: '2px 6px', borderRadius: '3px' }}>
                              {zone.density.toFixed(1)}%
                            </div>
                          </div>
                          <div style={{ color: '#333', marginBottom: '4px' }}>
                            📍 <strong>{zone.count}</strong> kejadian
                          </div>
                          <div style={{ color: '#666', fontSize: '10px', marginBottom: '6px' }}>
                            Radius: {zone.radius.toFixed(1)} km
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '10px', color: '#999', fontStyle: 'italic' }}>Klik untuk zoom ke zona ini</div>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </MapContainer>

              {/* Map controls */}
              <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 15 }}>
                {[
                  { label: '+', onClick: () => zoom(1) },
                  { label: '−', onClick: () => zoom(-1) },
                  { label: '◎', title: 'Lokasi Saya' },
                  { label: '⊡', onClick: resetView, title: 'Reset Tampilan' },
                ].map((btn, i) => (
                  <button
                    key={i}
                    onClick={btn.onClick}
                    title={btn.title}
                    style={{
                      width: '36px',
                      height: '36px',
                      background: 'white',
                      border: '1px solid #dde0e6',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      fontSize: '16px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#f8f9fa'; e.currentTarget.style.borderColor = '#e63946'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#dde0e6'; }}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Legend - KDE Intensity Levels */}
              <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'white', borderRadius: '8px', padding: '12px', fontSize: '11px', zIndex: 15, border: '1px solid #eef0f3', boxShadow: '0 2px 6px rgba(0,0,0,0.12)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '8px', color: '#1a1a2e' }}>Tingkat Kerawanan (KDE)</div>
                {[
                  { color: '#1a0a00', label: 'Sangat Tinggi', desc: '> 70%' },
                  { color: '#c1121f', label: 'Tinggi', desc: '50-70%' },
                  { color: '#e07b27', label: 'Sedang', desc: '30-50%' },
                  { color: '#f4e76e', label: 'Rendah', desc: '15-30%' },
                  { color: '#52b788', label: 'Aman', desc: '< 15%' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: item.color, border: '1px solid rgba(0,0,0,0.2)' }}></div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#333', fontWeight: 500 }}>{item.label}</div>
                      <div style={{ color: '#999', fontSize: '10px' }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

          {/* RIGHT PANEL */}
          <div style={{ width: '260px', background: 'white', borderLeft: '1px solid rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #eef0f3' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>Hasil Analisis KDE</div>
              
              {showKDE && kdeZones.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {kdeZones.slice(0, 5).map((zone) => (
                    <div 
                      key={zone.id} 
                      onClick={() => zoomToZone(zone.centerLat, zone.centerLng)}
                      style={{ background: 'rgba(230, 57, 70, 0.05)', border: `1px solid ${zone.color}`, borderRadius: '8px', padding: '10px', cursor: 'pointer', transition: 'all 0.15s', }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = `${zone.color}15`; e.currentTarget.style.borderColor = zone.color; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(230, 57, 70, 0.05)'; e.currentTarget.style.borderColor = zone.color; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: zone.color }}></div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a2e' }}>Zone {zone.id.split('-')[1]}</div>
                        <span style={{ fontSize: '10px', background: zone.color, color: 'white', padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto' }}>
                          {zone.intensity}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#555', display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span>Density: <strong>{zone.density.toFixed(1)}%</strong></span>
                        <span>Cases: <strong>{zone.count}</strong></span>
                      </div>
                      <div style={{ fontSize: '11px', color: '#6c757d' }}>
                        Radius: {zone.radius.toFixed(1)} km
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '12px', color: '#6c757d', textAlign: 'center', padding: '20px 0' }}>
                  {showKDE ? 'Calculating KDE zones...' : 'Enable KDE checkbox to visualize zones'}
                </div>
              )}
            </div>

            {/* Statistics section */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
                Jenis Kejahatan
              </div>
              {crimeTypes.map((ct, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '7px' }}>
                  <span style={{ fontSize: '12px', color: '#333', minWidth: '75px' }}>{ct.name.split(' ')[0]}</span>
                  <div style={{ flex: 1, background: '#f0f2f5', borderRadius: '4px', height: '8px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#c1121f', width: `${ct.pct * 3}px`, maxWidth: '100%' }}></div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, minWidth: '22px', textAlign: 'right' }}>{ct.count}</span>
                </div>
              ))}

              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', marginBottom: '8px', textTransform: 'uppercase' }}>Tren Bulanan (2024)</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '60px', marginTop: '8px' }}>
                  {monthlyVals.map((val, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${(val / monthlyMax) * 100}%`,
                        background: val >= 4 ? '#c1121f' : val >= 3 ? '#e07b27' : '#52b788',
                        borderRadius: '2px 2px 0 0',
                      }}
                    ></div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                  {months.map((m, i) => (
                    <span key={i} style={{ flex: 1, fontSize: '9px', color: '#6c757d', textAlign: 'center' }}>
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#6c757d', marginBottom: '10px', textTransform: 'uppercase' }}>Kejadian per Kecamatan</div>
                {kecData.map((k, i) => (
                  <div key={i} style={{ display: 'flex', borderBottom: '1px solid #f5f5f5', padding: '5px 0', justifyContent: 'space-between' }}>
                    <span style={{ color: '#333', fontSize: '12px' }}>{k.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', background: '#f0f2f5', borderRadius: '3px', height: '6px' }}>
                        <div style={{ width: `${(k.count / 28) * 100}%`, background: k.count > 20 ? '#c1121f' : k.count > 10 ? '#e07b27' : '#52b788', height: '100%', borderRadius: '3px' }}></div>
                      </div>
                      <span style={{ fontWeight: 600, color: '#e63946', fontSize: '12px' }}>{k.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Report Form */}
          {reportOpen && (
            <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: '320px', background: 'white', borderLeft: '1px solid rgba(0,0,0,0.1)', zIndex: 30, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              <div style={{ background: '#e63946', color: 'white', padding: '16px', flexShrink: 0 }}>
                <button
                  onClick={() => setReportOpen(false)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '16px', float: 'right' }}
                >
                  ✕
                </button>
                <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>📢 Laporkan Kejadian</h3>
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Kejahatan jalanan di Kab. Sleman</div>
              </div>
              <div style={{ padding: '16px', flex: 1 }}>
                {[
                  { label: 'Nama Pelapor', type: 'text', placeholder: 'Nama lengkap Anda' },
                  { label: 'No. Telepon', type: 'text', placeholder: '08xx-xxxx-xxxx' },
                ].map((field, i) => (
                  <div key={i} style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#444', marginBottom: '4px' }}>{field.label}</div>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      style={{ width: '100%', border: '1px solid #dde0e6', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', outline: 'none' }}
                    />
                  </div>
                ))}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#444', marginBottom: '4px' }}>Jenis Kejahatan</div>
                  <select style={{ width: '100%', border: '1px solid #dde0e6', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', outline: 'none' }}>
                    <option>Pencurian Kendaraan (Curanmor)</option>
                    <option>Pencurian dengan Kekerasan (Curas)</option>
                    <option>Penjambretan</option>
                    <option>Perampokan</option>
                    <option>Klitih / Kekerasan Jalanan</option>
                    <option>Pemerasan</option>
                    <option>Lainnya</option>
                  </select>
                </div>
                <button
                  onClick={submitReport}
                  style={{
                    width: '100%',
                    background: '#e63946',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    marginTop: '8px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#c1121f')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#e63946')}
                >
                  Kirim Laporan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
      )}

      {/* TOAST */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#0d1b2a',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            zIndex: 999,
            animation: 'slideUp 0.3s ease',
          }}
        >
          {toast}
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes slideUp {
          from { transform: translateY(80px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default StreetCrimeAnalysis;
