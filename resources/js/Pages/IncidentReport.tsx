import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FormEvent,
} from 'react';
import { usePage } from '@inertiajs/react';
import { MapView } from '@/Components/MapView';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import {
    AlertTriangle,
    CalendarClock,
    CheckCircle2,
    Clock3,
    FileWarning,
    Image as ImageIcon,
    Loader2,
    LocateFixed,
    Mail,
    Maximize2,
    Minimize2,
    Minus,
    MousePointer2,
    Plus,
    Crosshair,
    Search,
    Send,
    ShieldCheck,
    Trash2,
    Upload,
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { getUserLocation, type UserLocation } from '@/lib/geolocation';
import { batasDesaGeojson } from '@/data/villageBoundaryGeojson';
import 'leaflet/dist/leaflet.css';
import { JagaPageHero } from '@/Components/JagaPageHero';

const REPORT_ENDPOINT = '/api/incident-reports';

const crimeTypes = [
    'PENGEROYOKAN',
    'PENGRUSAKAN',
    'PENGANIAYAAN',
    'PENYALAHGUNAAN SENJATA TAJAM',
    'PENCURIAN DENGAN KEKERASAN (CURAS)',
    'PEMERASAN DAN PENGANCAMAN',
];

type PageUser = {
    name?: string | null;
    email?: string | null;
};

type FormState = {
    reporter_name: string;
    reporter_email: string;
    reporter_phone: string;
    title: string;
    incident_type: string;
    incident_date: string;
    incident_time: string;
    description: string;
    location: string;
    district: string;
    village: string;
    latitude: string;
    longitude: string;
};

type PhotoPreview = {
    file: File;
    url: string;
};

type ServerErrors = Record<string, string>;

type StatusLookupResult = {
    id: number | string;
    report_code?: string | null;
    title?: string | null;
    incident_type?: string | null;
    location?: string | null;
    district?: string | null;
    village?: string | null;
    incident_at?: string | null;
    status?: string | null;
    status_label?: string | null;
    rejection_reason?: string | null;
    reviewed_at?: string | null;
    created_at?: string | null;
};

type MapClickPayload = {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    district?: string;
    village?: string;
    kecamatan?: string;
    desa?: string;
    location?: string;
    alamat?: string;
};

type ReverseGeocodeResult = {
    location?: string;
    district?: string;
    village?: string;
};

type AdministrativeArea = {
    district?: string;
    village?: string;
};

function makeInitialForm(user?: PageUser | null): FormState {
    return {
        reporter_name: user?.name ?? '',
        reporter_email: user?.email ?? '',
        reporter_phone: '',
        title: '',
        incident_type: '',
        incident_date: '',
        incident_time: '',
        description: '',
        location: '',
        district: '',
        village: '',
        latitude: '',
        longitude: '',
    };
}

function normalizeErrors(errors: Record<string, string[] | string> = {}) {
    const normalized: ServerErrors = {};

    Object.entries(errors).forEach(([key, value]) => {
        normalized[key] = Array.isArray(value) ? value[0] : value;
    });

    return normalized;
}

function makeIncidentAt(date: string, time: string) {
    if (!date || !time) return '';
    return `${date} ${time}:00`;
}

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function makeReadableReportCode(reportId?: string | number | null, fallbackCode?: string | null) {
    const numericId = Number(reportId);

    if (Number.isFinite(numericId) && numericId > 0) {
        return `Laporan#${String(Math.trunc(numericId)).padStart(3, '0')}`;
    }

    const fallback = String(fallbackCode || '');
    const lastNumber = fallback.match(/(\d{1,6})(?!.*\d)/)?.[1];

    if (lastNumber) {
        return `Laporan#${String(Number(lastNumber)).padStart(3, '0')}`;
    }

    return 'Laporan#Baru';
}

function pickDistrict(address: Record<string, string> = {}) {
    return (
        address.city_district ||
        address.district ||
        address.county ||
        address.suburb ||
        ''
    );
}

function pickVillage(address: Record<string, string> = {}) {
    return (
        address.village ||
        address.hamlet ||
        address.neighbourhood ||
        address.suburb ||
        address.town ||
        address.municipality ||
        ''
    );
}

function pickFeatureInfo(feature: any): AdministrativeArea {
    const props = feature?.properties ?? {};

    return {
        village:
            props.wadmkd ||
            props.WADMKD ||
            props.namobj ||
            props.NAMOBJ ||
            props.DESA ||
            props.desa ||
            props.name ||
            '',
        district:
            props.wadmkc ||
            props.WADMKC ||
            props.kecamatan ||
            props.KECAMATAN ||
            props.nama_kecamatan ||
            props.KEC ||
            '',
    };
}

function isPointInRing(pointLng: number, pointLat: number, ring: number[][]) {
    let inside = false;

    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = Number(ring[i][0]);
        const yi = Number(ring[i][1]);
        const xj = Number(ring[j][0]);
        const yj = Number(ring[j][1]);

        const intersects =
            yi > pointLat !== yj > pointLat &&
            pointLng < ((xj - xi) * (pointLat - yi)) / ((yj - yi) || Number.EPSILON) + xi;

        if (intersects) inside = !inside;
    }

    return inside;
}

function isPointInPolygon(pointLng: number, pointLat: number, polygon: number[][][]) {
    if (!polygon.length || !isPointInRing(pointLng, pointLat, polygon[0])) {
        return false;
    }

    for (let i = 1; i < polygon.length; i += 1) {
        if (isPointInRing(pointLng, pointLat, polygon[i])) {
            return false;
        }
    }

    return true;
}

function findAdministrativeArea(lat: number, lng: number): AdministrativeArea {
    const features = batasDesaGeojson?.features ?? [];

    for (const feature of features) {
        const geometry = feature?.geometry;
        const type = geometry?.type;
        const coordinates = geometry?.coordinates;

        if (!coordinates) continue;

        if (type === 'Polygon' && isPointInPolygon(lng, lat, coordinates)) {
            return pickFeatureInfo(feature);
        }

        if (type === 'MultiPolygon') {
            const matched = coordinates.some((polygon: number[][][]) =>
                isPointInPolygon(lng, lat, polygon),
            );

            if (matched) {
                return pickFeatureInfo(feature);
            }
        }
    }

    return {};
}

function isInsideSlemanAdministrativeArea(lat: number, lng: number) {
    const area = findAdministrativeArea(lat, lng);
    return Boolean(area.district || area.village);
}

function outsideSlemanMessage() {
    return 'Lokasi yang Anda pilih berada di luar Kabupaten Sleman. Silakan pilih titik kejadian di dalam wilayah Kabupaten Sleman.';
}

function formatStatusDate(value?: string | null) {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}

function statusBadgeClass(status?: string | null) {
    const value = String(status || '').toLowerCase();
    if (value === 'approved') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    if (value === 'rejected') return 'border-red-200 bg-red-50 text-red-700';
    return 'border-amber-200 bg-amber-50 text-amber-700';
}

async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Accept: 'application/json',
            },
        });

        if (!response.ok) return {};

        const payload = await response.json();
        const address = payload?.address ?? {};

        return {
            location: payload?.display_name ?? '',
            district: pickDistrict(address),
            village: pickVillage(address),
        };
    } catch {
        return {};
    }
}

export default function IncidentReport() {
    const { auth } = usePage<{
        auth?: {
            user?: PageUser | null;
        };
    }>().props;

    const initialForm = useMemo(
        () => makeInitialForm(auth?.user),
        [auth?.user?.name, auth?.user?.email],
    );

    const [form, setForm] = useState<FormState>(initialForm);
    const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
    const [formErrors, setFormErrors] = useState<ServerErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isResolvingLocation, setIsResolvingLocation] = useState(false);
    const [isLocatingUser, setIsLocatingUser] = useState(false);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [successCode, setSuccessCode] = useState<string | null>(null);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [showStatusPanel, setShowStatusPanel] = useState(false);
    const [statusEmail, setStatusEmail] = useState(auth?.user?.email ?? '');
    const [statusCode, setStatusCode] = useState('');
    const [statusLoading, setStatusLoading] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);
    const [statusResults, setStatusResults] = useState<StatusLookupResult[]>([]);
    const [isReportMapFullscreen, setIsReportMapFullscreen] = useState(false);

    const previewUrlsRef = useRef<string[]>([]);
    const reportMapShellRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);

    useEffect(() => {
        previewUrlsRef.current = photoPreviews.map((item) => item.url);
    }, [photoPreviews]);

    useEffect(() => {
        return () => {
            previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsReportMapFullscreen(document.fullscreenElement === reportMapShellRef.current);
            window.setTimeout(() => mapRef.current?.invalidateSize?.(), 150);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
        };
    }, []);

    const submitStatusLookup = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const code = statusCode.trim();
        const email = statusEmail.trim();

        if (!code && !email) {
            setStatusError('Masukkan kode laporan atau email pelapor terlebih dahulu.');
            setStatusResults([]);
            return;
        }

        setStatusLoading(true);
        setStatusError(null);
        setStatusResults([]);

        try {
            const params = new URLSearchParams();
            if (code) params.set('report_code', code);
            if (email) params.set('reporter_email', email);

            const response = await fetch(`/api/incident-reports/status?${params.toString()}`, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(payload.message || 'Status laporan tidak ditemukan.');
            }

            setStatusResults(Array.isArray(payload.data) ? payload.data : []);
        } catch (error: any) {
            setStatusError(error?.message || 'Status laporan tidak ditemukan.');
        } finally {
            setStatusLoading(false);
        }
    };

    const openStatusPanel = () => {
        setShowStatusPanel(true);
        if (successCode && !statusCode) setStatusCode(successCode);
        window.setTimeout(() => {
            document.getElementById('cek-status-laporan')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 80);
    };

    const toggleReportMapFullscreen = async () => {
        const element = reportMapShellRef.current;

        if (!element) return;

        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen();
            } else {
                await element.requestFullscreen();
            }

            window.setTimeout(() => mapRef.current?.invalidateSize?.(), 180);
        } catch {
            toast.error('Mode layar penuh belum dapat dibuka pada browser ini.');
        }
    };

    const focusReportLocation = () => {
        if (clickMarker) {
            mapRef.current?.setView?.([clickMarker.lat, clickMarker.lng], 16, { animate: true });
            return;
        }

        mapRef.current?.setView?.([-7.716, 110.355], 12, { animate: true });
    };

    const clickMarker = useMemo(() => {
        if (!form.latitude || !form.longitude) return null;

        const lat = Number(form.latitude);
        const lng = Number(form.longitude);

        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        return { lat, lng };
    }, [form.latitude, form.longitude]);

    const getError = (key: string) => {
        return (
            formErrors[key] ||
            formErrors[`${key}.0`] ||
            formErrors[`${key}.*`] ||
            null
        );
    };

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({
            ...prev,
            [key]: value,
        }));

        setFormErrors((prev) => {
            const next = { ...prev };
            delete next[key as string];
            return next;
        });

        if (successCode) {
            setSuccessCode(null);
            setShowSuccessNotification(false);
        }
    };

    const handleMapClick = async (
        latOrPayload: number | MapClickPayload,
        lngValue?: number,
    ) => {
        let lat: number | undefined;
        let lng: number | undefined;
        let district = '';
        let village = '';
        let location = '';

        if (typeof latOrPayload === 'object') {
            lat = Number(latOrPayload.lat ?? latOrPayload.latitude);
            lng = Number(latOrPayload.lng ?? latOrPayload.longitude);

            district = String(latOrPayload.district ?? latOrPayload.kecamatan ?? '');
            village = String(latOrPayload.village ?? latOrPayload.desa ?? '');
            location = String(latOrPayload.location ?? latOrPayload.alamat ?? '');
        } else {
            lat = Number(latOrPayload);
            lng = Number(lngValue);
        }

        if (Number.isNaN(lat) || Number.isNaN(lng)) {
            toast.error('Titik lokasi belum valid. Silakan klik ulang pada peta.');
            return;
        }

        const administrativeArea = findAdministrativeArea(lat!, lng!);

        if (!administrativeArea.district && !administrativeArea.village) {
            const message = outsideSlemanMessage();

            setFormErrors((prev) => ({
                ...prev,
                latitude: message,
                longitude: message,
            }));

            toast.error(message);
            window.alert(message);
            return;
        }

        const fixedLat = lat!.toFixed(7);
        const fixedLng = lng!.toFixed(7);

        district = district || administrativeArea.district || '';
        village = village || administrativeArea.village || '';

        setForm((prev) => ({
            ...prev,
            latitude: fixedLat,
            longitude: fixedLng,
            district: district || prev.district,
            village: village || prev.village,
            location: location || prev.location,
        }));

        setFormErrors((prev) => {
            const next = { ...prev };
            delete next.latitude;
            delete next.longitude;
            delete next.location;
            delete next.district;
            delete next.village;
            return next;
        });

        toast.success('Titik lokasi laporan berhasil dipilih.');

        setIsResolvingLocation(true);

        const resolved = await reverseGeocode(lat!, lng!);

        setForm((prev) => ({
            ...prev,
            location: location || resolved.location || prev.location || '',
            district: district || resolved.district || prev.district || '',
            village: village || resolved.village || prev.village || '',
        }));

        setIsResolvingLocation(false);
    };

    const getCurrentLocation = async () => {
        setIsLocatingUser(true);

        try {
            const location = await getUserLocation();

            setUserLocation(location);
            mapRef.current?.setView?.([location.lat, location.lng], 16);
            await handleMapClick(location.lat, location.lng);
        } catch (error: any) {
            const code = error?.code;

            if (code === 1) {
                toast.error('Izin lokasi ditolak. Aktifkan izin lokasi browser terlebih dahulu.');
            } else if (code === 2) {
                toast.error('Lokasi belum bisa ditentukan. Pastikan GPS atau jaringan aktif.');
            } else if (code === 3) {
                toast.error('Pengambilan lokasi terlalu lama. Silakan coba lagi.');
            } else {
                toast.error(error?.message || 'Gagal mengambil lokasi pengguna.');
            }
        } finally {
            setIsLocatingUser(false);
        }
    };

    const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(event.target.files ?? []);

        if (!files.length) return;

        const allowedFiles = files.filter((file) => {
            const isImage = file.type.startsWith('image/');
            const isValidSize = file.size <= 5 * 1024 * 1024;

            if (!isImage) {
                toast.error(`${file.name} bukan file gambar.`);
                return false;
            }

            if (!isValidSize) {
                toast.error(`${file.name} lebih dari 5 MB.`);
                return false;
            }

            return true;
        });

        const finalFiles = allowedFiles.slice(0, 4);

        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));

        const previews = finalFiles.map((file) => ({
            file,
            url: URL.createObjectURL(file),
        }));

        setPhotoPreviews(previews);

        setFormErrors((prev) => {
            const next = { ...prev };
            delete next.photos;
            delete next['photos.0'];
            delete next['photos.*'];
            return next;
        });

        event.target.value = '';
    };

    const removePhoto = (index: number) => {
        setPhotoPreviews((prev) => {
            const removed = prev[index];

            if (removed) {
                URL.revokeObjectURL(removed.url);
            }

            return prev.filter((_, itemIndex) => itemIndex !== index);
        });
    };

    const validateClient = () => {
        const errors: ServerErrors = {};

        if (!form.reporter_name.trim()) {
            errors.reporter_name = 'Nama pelapor wajib diisi.';
        }

        if (!form.reporter_email.trim()) {
            errors.reporter_email = 'Email pelapor wajib diisi.';
        } else if (!isValidEmail(form.reporter_email.trim())) {
            errors.reporter_email = 'Format email belum valid.';
        }

        if (!form.reporter_phone.trim()) {
            errors.reporter_phone = 'Nomor HP pelapor wajib diisi.';
        }

        if (!form.incident_type) {
            errors.incident_type = 'Jenis kejadian wajib dipilih.';
        }

        if (!form.incident_date) {
            errors.incident_date = 'Tanggal kejadian wajib diisi.';
        }

        if (!form.incident_time) {
            errors.incident_time = 'Jam kejadian wajib diisi.';
        }

        if (!form.location.trim()) {
            errors.location = 'Alamat atau lokasi kejadian wajib diisi.';
        }

        if (!form.description.trim()) {
            errors.description = 'Deskripsi kejadian wajib diisi.';
        }

        if (!form.latitude || !form.longitude) {
            errors.latitude = 'Titik lokasi wajib dipilih pada peta.';
        } else {
            const lat = Number(form.latitude);
            const lng = Number(form.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                errors.latitude = 'Koordinat lokasi belum valid.';
            } else if (!isInsideSlemanAdministrativeArea(lat, lng)) {
                errors.latitude = outsideSlemanMessage();
            }
        }

        return errors;
    };

    const resetForm = () => {
        setForm(initialForm);
        setSuccessCode(null);
        setShowSuccessNotification(false);
        setFormErrors({});
        setUserLocation(null);

        previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
        setPhotoPreviews([]);
    };

    const submitReport = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const clientErrors = validateClient();

        if (Object.keys(clientErrors).length > 0) {
            setFormErrors(clientErrors);
            toast.error('Periksa kembali data laporan yang wajib diisi.');
            return;
        }

        setIsSubmitting(true);
        setFormErrors({});
        setSuccessCode(null);
        setShowSuccessNotification(false);

        try {
            const formData = new FormData();

            const incidentAt = makeIncidentAt(form.incident_date, form.incident_time);
            const finalTitle = form.title.trim() || `Laporan ${form.incident_type}`;

            formData.append('reporter_name', form.reporter_name.trim());
            formData.append('reporter_email', form.reporter_email.trim());
            formData.append('reporter_phone', form.reporter_phone.trim());
            formData.append('title', finalTitle);
            formData.append('incident_type', form.incident_type);
            formData.append('incident_date', form.incident_date);
            formData.append('incident_time', form.incident_time);
            formData.append('incident_at', incidentAt);
            formData.append('description', form.description.trim());
            formData.append('location', form.location.trim());
            formData.append('district', form.district.trim());
            formData.append('village', form.village.trim());
            formData.append('latitude', form.latitude);
            formData.append('longitude', form.longitude);

            formData.append('name', form.reporter_name.trim());
            formData.append('email', form.reporter_email.trim());
            formData.append('phone', form.reporter_phone.trim());
            formData.append('type', form.incident_type);
            formData.append('time', incidentAt);

            photoPreviews.forEach((item, index) => {
                formData.append('photos[]', item.file, item.file.name);

                if (index === 0) {
                    formData.append('photo', item.file, item.file.name);
                }
            });

            const response = await fetch(REPORT_ENDPOINT, {
                method: 'POST',
                body: formData,
                headers: {
                    Accept: 'application/json',
                },
                credentials: 'same-origin',
            });

            const contentType = response.headers.get('content-type') ?? '';
            const payload = contentType.includes('application/json')
                ? await response.json()
                : await response.text();

            if (!response.ok) {
                if (typeof payload === 'object' && payload?.errors) {
                    setFormErrors(normalizeErrors(payload.errors));
                }

                throw new Error(
                    typeof payload === 'object'
                        ? payload?.message || 'Laporan gagal dikirim.'
                        : 'Laporan gagal dikirim.',
                );
            }

            const reportId =
                typeof payload === 'object'
                    ? payload?.data?.id ?? payload?.id ?? null
                    : null;

            const rawReportCode =
                typeof payload === 'object'
                    ? payload?.data?.report_code ??
                      payload?.report_code ??
                      (reportId ? `LAP-${String(reportId).padStart(4, '0')}` : null)
                    : null;

            const reportCode = makeReadableReportCode(reportId, rawReportCode);

            setSuccessCode(reportCode);
            setStatusCode(reportCode);
            setShowSuccessNotification(true);

            toast.success('Laporan berhasil dikirim.', {
                description: `Kode laporan: ${reportCode}. Status laporan menunggu validasi admin.`,
                duration: 7000,
            });

            previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
            setPhotoPreviews([]);
            setForm(initialForm);
            setUserLocation(null);
        } catch (error: any) {
            toast.error(error?.message || 'Terjadi kesalahan saat mengirim laporan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="jaga-report-page min-h-full theme-shell text-foreground">
            <Toaster position="top-right" richColors closeButton />

            <style>{`
                .jaga-report-page {
                    color: #07324A;
                }

                .jaga-report-map-shell .jagasleman-map-action-controls,
                .jaga-report-map-shell .jagasleman-basemap-panel,
                .jaga-report-map-shell .jagasleman-kde-legend {
                    display: none !important;
                }

                .jaga-report-map-shell:fullscreen {
                    width: 100vw !important;
                    height: 100vh !important;
                    border-radius: 0 !important;
                    background: #FFFFFF !important;
                }

                .jaga-report-map-shell:fullscreen .jaga-report-map-height {
                    height: 100vh !important;
                }

                .jaga-report-map-shell .leaflet-control-zoom {
                    display: none !important;
                }

                .jaga-report-map-shell .leaflet-popup-content-wrapper {
                    border-radius: 18px !important;
                    overflow: hidden !important;
                    border: 1px solid #BDE7E1 !important;
                    box-shadow: 0 18px 48px rgba(15, 31, 46, 0.22) !important;
                }

                .jaga-report-map-shell .leaflet-popup-content {
                    margin: 0 !important;
                    color: #07324A !important;
                }

                .jaga-report-map-shell .leaflet-popup-content * {
                    color: #07324A !important;
                    text-shadow: none !important;
                }

                .jaga-report-control-card {
                    backdrop-filter: blur(14px);
                }

                .jaga-report-control-button {
                    display: inline-flex;
                    width: 38px;
                    height: 38px;
                    align-items: center;
                    justify-content: center;
                    border-radius: 14px;
                    border: 1px solid #BDE7E1;
                    background: #FFFFFF;
                    color: #07324A;
                    box-shadow: 0 10px 24px rgba(15, 31, 46, 0.08);
                    transition: transform .16s ease, background .16s ease, color .16s ease;
                }

                .jaga-report-control-button:hover {
                    transform: translateY(-1px);
                    background: #F2FAF6;
                }

                .jaga-report-control-button.is-active {
                    background: #07324A;
                    color: #FFFFFF;
                    border-color: #07324A;
                }

                .jaga-report-photo-container {
                    background:
                        radial-gradient(circle at 12% 10%, rgba(216, 228, 237, 0.75), transparent 18rem),
                        linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%);
                }
            `}</style>


            {showSuccessNotification && successCode && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-[1.75rem] border border-[#BDE7E1] bg-white dark:bg-[#102538] dark:bg-[#07324A] p-6 text-center shadow-2xl shadow-emerald-950/20">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#BDE7E1] text-[#F47B52]">
                            <CheckCircle2 className="h-9 w-9" />
                        </div>

                        <h3 className="mt-4 text-2xl font-black text-[#F47B52] dark:text-[#F47B52]">
                            Laporan berhasil dikirim
                        </h3>

                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-200">
                            Laporan sudah masuk ke sistem dan sedang menunggu validasi admin. Jika email pelapor valid dan konfigurasi email aktif, notifikasi juga dikirim ke email tersebut.
                        </p>

                        <div className="mt-4 rounded-2xl border border-[#BDE7E1] bg-[#F2FAF6] px-4 py-3 text-sm font-black text-[#07324A]">
                            Kode Laporan: {successCode}
                        </div>

                        <Button
                            type="button"
                            onClick={() => setShowSuccessNotification(false)}
                            className="mt-5 h-11 w-full rounded-xl bg-[#F47B52] font-black text-white hover:bg-[#F47B52]"
                        >
                            Tutup Notifikasi
                        </Button>
                    </div>
                </div>
            )}
            <JagaPageHero
                page="report"
                eyebrow="Pelaporan Kejadian"
                title="Laporkan Kejadian Jalanan"
                subtitle="Tentukan titik pada peta, lengkapi data pelapor, tulis kronologi, unggah bukti, lalu kirim laporan untuk divalidasi admin."
                actions={[
                    { label: 'Buka Peta', href: '/webgis', tone: 'primary' },
                ]}
                sideTitle="Pelaporan yang Mudah Dipahami"
                sideText="Pilih lokasi kejadian, isi informasi penting, lalu simpan kode laporan untuk memantau status setelah dikirim."
                sideItems={['Peta lokasi kejadian', 'Form ringkas', 'Kode laporan tersimpan']}
            />

            <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                {successCode && (
                    <div className="mb-5 rounded-2xl border border-[#BDE7E1] bg-[#F2FAF6] p-4 text-[#07324A] shadow-sm">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0" />
                            <div>
                                <div className="text-base font-black">
                                    Laporan berhasil dikirim.
                                </div>
                                <p className="mt-1 text-sm leading-6">
                                    Kode laporan: <b>{successCode}</b>. Status awal laporan adalah pending. Simpan kode laporan untuk mengecek status di panel cek status pada halaman ini.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mb-5 overflow-hidden rounded-[1.75rem] border border-[#BDE7E1] bg-white p-4 shadow-lg shadow-[#07324A]/8 dark:bg-[#102538] sm:p-5">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F47B52]">Langkah Pelaporan</p>
                            <h2 className="mt-1 text-xl font-black text-[#07324A] dark:text-white">Ikuti alur singkat sebelum mengisi form.</h2>
                        </div>
                        <Button
                            type="button"
                            onClick={openStatusPanel}
                            className="h-11 rounded-2xl bg-[#07324A] px-5 text-sm font-black text-white hover:bg-[#0B445B]"
                        >
                            <Search className="mr-2 h-4 w-4" />
                            Cek Status Laporan
                        </Button>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                        {[
                            ['03', 'Tentukan lokasi', 'Klik titik kejadian pada peta.'],
                            ['02', 'Isi data kejadian', 'Lengkapi pelapor dan kronologi.'],
                            ['01', 'Pilih jenis laporan', 'Tentukan kategori kejadian.'],
                            ['04', 'Unggah bukti', 'Tambahkan foto jika tersedia.'],
                            ['05', 'Kirim laporan', 'Data masuk ke sistem admin.'],
                            ['06', 'Pantau status', 'Cek kode laporan kapan saja.'],
                        ].map(([number, title, detail]) => (
                            <div key={number} className="rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] p-3 dark:bg-white/5">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#F47B52] text-xs font-black text-white">{number}</span>
                                <h3 className="mt-3 text-sm font-black leading-snug text-[#07324A] dark:text-white">{title}</h3>
                                <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-300">{detail}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {showStatusPanel && (
                    <div id="cek-status-laporan" className="mb-5 overflow-hidden rounded-[1.75rem] border border-[#BDE7E1] bg-white p-5 shadow-lg shadow-[#07324A]/8 dark:bg-[#102538]">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F47B52]">Cek Status Laporan</p>
                                <h2 className="mt-1 text-xl font-black text-[#07324A] dark:text-white">Masukkan kode laporan atau email pelapor.</h2>
                                <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-300">
                                    Kode laporan dari notifikasi dapat langsung digunakan. Email bersifat opsional, tetapi membantu jika Anda lupa kode laporan.
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowStatusPanel(false)}
                                className="rounded-2xl border-[#BDE7E1] text-[#07324A] hover:bg-[#F2FAF6]"
                            >
                                Tutup
                            </Button>
                        </div>

                        <form onSubmit={submitStatusLookup} className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                            <div>
                                <Label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Email Pelapor</Label>
                                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] px-3">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <Input
                                        type="email"
                                        value={statusEmail}
                                        onChange={(event) => setStatusEmail(event.target.value)}
                                        placeholder="nama@email.com"
                                        className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Kode/Nomor Laporan</Label>
                                <div className="mt-2 flex items-center gap-2 rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] px-3">
                                    <Clock3 className="h-4 w-4 text-slate-400" />
                                    <Input
                                        value={statusCode}
                                        onChange={(event) => setStatusCode(event.target.value)}
                                        placeholder="LAP-0001 atau Laporan#001"
                                        className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                                    />
                                </div>
                            </div>
                            <div className="flex items-end">
                                <Button
                                    type="submit"
                                    disabled={statusLoading}
                                    className="h-12 w-full rounded-2xl bg-[#F47B52] px-5 font-black text-white hover:bg-[#E5653E] md:w-auto"
                                >
                                    {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                    Cek Status
                                </Button>
                            </div>
                        </form>

                        {statusError && (
                            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                                {statusError}
                            </div>
                        )}

                        {statusResults.length > 0 && (
                            <div className="mt-4 grid gap-3">
                                {statusResults.map((item) => (
                                    <div key={`${item.id}-${item.report_code}`} className="rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] p-4 dark:bg-white/5">
                                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{item.report_code || item.id}</p>
                                                <h3 className="mt-1 text-base font-black text-[#07324A] dark:text-white">{item.incident_type || item.title || 'Laporan kejadian'}</h3>
                                            </div>
                                            <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-black ${statusBadgeClass(item.status)}`}>
                                                {item.status_label || item.status || 'Pending'}
                                            </span>
                                        </div>
                                        <div className="mt-3 grid gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300 md:grid-cols-2">
                                            <p><b>Lokasi:</b> {item.location || '-'}</p>
                                            <p><b>Waktu kejadian:</b> {formatStatusDate(item.incident_at)}</p>
                                            <p><b>Wilayah:</b> {[item.village, item.district].filter(Boolean).join(', ') || '-'}</p>
                                            <p><b>Update:</b> {formatStatusDate(item.reviewed_at || item.created_at)}</p>
                                        </div>
                                        {item.rejection_reason && (
                                            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                                                Alasan penolakan: {item.rejection_reason}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}


                <form
                    onSubmit={submitReport}
                    className="overflow-hidden rounded-[2rem] border border-[#BDE7E1] bg-white dark:bg-[#102538] dark:bg-[#07324A] shadow-xl shadow-[#07324A]/10 dark:border-white/10 dark:bg-[#07324A]"
                >
                    <div className="border-b border-[#BDE7E1] bg-white dark:bg-[#102538] dark:bg-[#07324A] dark:border-white/10 dark:bg-[#07324A] px-5 py-5 sm:px-7">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <div className="text-xs font-black uppercase tracking-[0.22em] text-[#F47B52] dark:text-[#F47B52]">
                                    Formulir Pelaporan
                                </div>
                                <h2 className="mt-1 text-2xl font-black text-[#F47B52] dark:text-[#F47B52]">
                                    Pilih lokasi kejadian pada peta
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-200">
                                    Klik titik pada peta atau gunakan tombol Lokasi Saya agar koordinat, alamat, kecamatan, dan desa terdeteksi otomatis.
                                </p>
                            </div>

                            <Button
                                type="button"
                                onClick={getCurrentLocation}
                                disabled={isLocatingUser || isSubmitting}
                                className="h-11 shrink-0 rounded-xl bg-[#F47B52] px-4 font-black text-white hover:bg-[#c94e4e]"
                            >
                                {isLocatingUser ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Mengambil Lokasi...
                                    </>
                                ) : (
                                    <>
                                        <LocateFixed className="mr-2 h-4 w-4" />
                                        Lokasi Saya
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="p-5 sm:p-7">
                        <div
                            ref={reportMapShellRef}
                            className="jaga-report-map-shell overflow-hidden rounded-[1.6rem] border border-[#BDE7E1] bg-white p-3 shadow-lg shadow-[#07324A]/10"
                        >
                            <div className="mb-3 flex flex-col gap-3 rounded-[1.25rem] border border-[#BDE7E1] bg-[#F8FAFC] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm font-black text-[#07324A]">
                                        Peta Lokasi Kejadian
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Gunakan tombol kontrol untuk memperbesar, memperkecil, mengembalikan tampilan, atau membuka layar penuh.
                                    </p>
                                </div>

                                <div className="jaga-report-control-card flex w-fit items-center gap-2 rounded-[1.15rem] border border-[#BDE7E1] bg-white/95 p-2 shadow-md">
                                    <button
                                        type="button"
                                        onClick={() => mapRef.current?.zoomIn?.()}
                                        className="jaga-report-control-button"
                                        title="Perbesar peta"
                                        aria-label="Perbesar peta"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => mapRef.current?.zoomOut?.()}
                                        className="jaga-report-control-button"
                                        title="Perkecil peta"
                                        aria-label="Perkecil peta"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={focusReportLocation}
                                        className="jaga-report-control-button"
                                        title="Fokus ke titik laporan"
                                        aria-label="Fokus ke titik laporan"
                                    >
                                        <Crosshair className="h-4 w-4" />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={toggleReportMapFullscreen}
                                        className={`jaga-report-control-button ${isReportMapFullscreen ? 'is-active' : ''}`}
                                        title="Layar penuh"
                                        aria-label="Layar penuh"
                                    >
                                        {isReportMapFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>

                            <div className="jaga-report-map-height relative h-[300px] w-full overflow-hidden rounded-[1.25rem] border border-[#BDE7E1] bg-[#F2FAF6] sm:h-[360px] lg:h-[430px]">
                                <MapView
                                    ref={mapRef}
                                    center={clickMarker ? [clickMarker.lat, clickMarker.lng] : [-7.716, 110.355]}
                                    zoom={clickMarker ? 15 : 12}
                                    onClick={handleMapClick}
                                    clickMarker={clickMarker}
                                    userLocation={userLocation}
                                    showVillageBoundary
                                    fitVillageBoundary={!clickMarker}
                                />
                            </div>
                        </div>

                        <div className="mt-4 flex gap-3 rounded-2xl border border-[#BDE7E1] bg-[#F2FAF6] px-4 py-3">
                            <MousePointer2 className="mt-0.5 h-5 w-5 shrink-0 text-[#F47B52] dark:text-[#F47B52]" />
                            <p className="text-sm font-semibold leading-6 text-[#07324A]">
                                Klik peta untuk menggeser marker. Setelah titik dipilih, latitude, longitude, alamat, kecamatan, dan desa akan terisi otomatis.
                            </p>
                        </div>

                        {isResolvingLocation && (
                            <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#BDE7E1] bg-[#F2FAF6] px-4 py-3 text-sm font-semibold text-[#07324A]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Mengambil alamat dari titik peta...
                            </div>
                        )}

                        {getError('latitude') && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                                {getError('latitude')}
                            </div>
                        )}

                        <div className="mt-6 grid gap-5 lg:grid-cols-2">
                            <div>
                                <Label>Latitude</Label>
                                <Input
                                    value={form.latitude}
                                    readOnly
                                    placeholder="-7.xxxxxx"
                                    className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50 font-mono"
                                />
                            </div>

                            <div>
                                <Label>Longitude</Label>
                                <Input
                                    value={form.longitude}
                                    readOnly
                                    placeholder="110.xxxxxx"
                                    className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50 font-mono"
                                />
                            </div>

                            <div className="lg:col-span-2">
                                <Label>Alamat/Lokasi Kejadian</Label>
                                <Textarea
                                    value={form.location}
                                    onChange={(event) => setField('location', event.target.value)}
                                    placeholder="Alamat akan terisi otomatis setelah titik dipilih. Bisa diedit jika belum tepat."
                                    className="mt-2 min-h-24 rounded-xl border-stone-200 bg-stone-50"
                                />
                                {getError('location') && (
                                    <p className="mt-2 text-xs font-semibold text-red-600">
                                        {getError('location')}
                                    </p>
                                )}
                            </div>

                            <div>
                                <Label>Kecamatan</Label>
                                <Input
                                    value={form.district}
                                    onChange={(event) => setField('district', event.target.value)}
                                    placeholder="Otomatis dari titik peta"
                                    className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50"
                                />
                            </div>

                            <div>
                                <Label>Kalurahan/Desa</Label>
                                <Input
                                    value={form.village}
                                    onChange={(event) => setField('village', event.target.value)}
                                    placeholder="Otomatis dari titik peta"
                                    className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50"
                                />
                            </div>
                        </div>

                        <div className="my-7 border-t border-stone-100" />

                        <div className="mb-5 flex items-start gap-3 rounded-2xl theme-surface-muted p-4">
                            <div className="rounded-xl bg-[#F47B52] p-3 text-[#F47B52] dark:text-[#F47B52]">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base font-black text-[#F47B52] dark:text-[#F47B52]">
                                    Lengkapi data laporan
                                </h2>
                                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-200">
                                    Data digunakan untuk verifikasi awal sebelum laporan ditampilkan pada WebGIS.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-7">
                            <section>
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="rounded-xl bg-[#BDE7E1] p-2 text-[#F47B52]">
                                        <ShieldCheck className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#F47B52] dark:text-[#F47B52]">
                                            Data Pelapor
                                        </div>
                                        <h3 className="text-lg font-black text-[#F47B52] dark:text-[#F47B52]">
                                            Identitas Pelapor
                                        </h3>
                                    </div>
                                </div>

                                <div className="grid gap-5 lg:grid-cols-2">
                                    <div>
                                        <Label>Nama Pelapor</Label>
                                        <Input
                                            value={form.reporter_name}
                                            onChange={(event) => setField('reporter_name', event.target.value)}
                                            placeholder="Masukkan nama lengkap"
                                            className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50"
                                        />
                                        {getError('reporter_name') && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">
                                                {getError('reporter_name')}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label>Nomor HP</Label>
                                        <Input
                                            value={form.reporter_phone}
                                            onChange={(event) => setField('reporter_phone', event.target.value)}
                                            placeholder="08xxxxxxxxxx"
                                            className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50"
                                        />
                                        {getError('reporter_phone') && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">
                                                {getError('reporter_phone')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="lg:col-span-2">
                                        <Label>Email Pelapor</Label>
                                        <Input
                                            type="email"
                                            value={form.reporter_email}
                                            onChange={(event) => setField('reporter_email', event.target.value)}
                                            placeholder="contoh@email.com"
                                            className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50"
                                        />
                                        {getError('reporter_email') && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">
                                                {getError('reporter_email')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <div className="border-t border-stone-100" />

                            <section>
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="rounded-xl bg-[#BDE7E1] p-2 text-[#F47B52] dark:text-[#F47B52]">
                                        <CalendarClock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[#F47B52] dark:text-[#F47B52]">
                                            Data Kejadian
                                        </div>
                                        <h3 className="text-lg font-black text-[#F47B52] dark:text-[#F47B52]">
                                            Detail Laporan
                                        </h3>
                                    </div>
                                </div>

                                <div className="grid gap-5 lg:grid-cols-2">
                                    <div className="lg:col-span-2">
                                        <Label>Judul Laporan</Label>
                                        <Input
                                            value={form.title}
                                            onChange={(event) => setField('title', event.target.value)}
                                            placeholder="Contoh: Dugaan pengeroyokan di jalan utama"
                                            className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50"
                                        />
                                    </div>

                                    <div className="lg:col-span-2">
                                        <Label>Jenis Kejadian</Label>
                                        <Select
                                            value={form.incident_type}
                                            onValueChange={(value) => setField('incident_type', value)}
                                        >
                                            <SelectTrigger className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50">
                                                <SelectValue placeholder="Pilih jenis kejadian" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {crimeTypes.map((type) => (
                                                    <SelectItem key={type} value={type}>
                                                        {type}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {getError('incident_type') && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">
                                                {getError('incident_type')}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label>Tanggal Kejadian</Label>
                                        <Input
                                            type="date"
                                            value={form.incident_date}
                                            onChange={(event) => setField('incident_date', event.target.value)}
                                            className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50"
                                        />
                                        {getError('incident_date') && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">
                                                {getError('incident_date')}
                                            </p>
                                        )}
                                    </div>

                                    <div>
                                        <Label>Jam Kejadian</Label>
                                        <Input
                                            type="time"
                                            value={form.incident_time}
                                            onChange={(event) => setField('incident_time', event.target.value)}
                                            className="mt-2 h-11 rounded-xl border-stone-200 bg-stone-50"
                                        />
                                        {getError('incident_time') && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">
                                                {getError('incident_time')}
                                            </p>
                                        )}
                                    </div>

                                    <div className="lg:col-span-2">
                                        <Label>Deskripsi Kejadian</Label>
                                        <Textarea
                                            value={form.description}
                                            onChange={(event) => setField('description', event.target.value)}
                                            placeholder="Jelaskan kronologi singkat, ciri pelaku, atau kondisi penting lainnya."
                                            className="mt-2 min-h-28 rounded-xl border-stone-200 bg-stone-50"
                                        />
                                        {getError('description') && (
                                            <p className="mt-2 text-xs font-semibold text-red-600">
                                                {getError('description')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </section>

                            <div className="border-t border-stone-100" />

                            <section className="jaga-report-photo-container rounded-[1.6rem] border border-[#BDE7E1] p-4 shadow-sm">
                                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="rounded-xl bg-white p-2 text-[#07324A] shadow-sm">
                                            <ImageIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-[0.2em] text-[#F47B52]">
                                                Bukti Pendukung
                                            </div>
                                            <h3 className="text-lg font-black text-[#07324A]">
                                                Unggah Foto Kejadian
                                            </h3>
                                        </div>
                                    </div>

                                    <span className="w-fit rounded-full border border-[#BDE7E1] bg-white px-3 py-1 text-xs font-black text-slate-600">
                                        {photoPreviews.length}/4 foto
                                    </span>
                                </div>

                                <label className="flex cursor-pointer flex-col items-center justify-center rounded-[1.25rem] border-2 border-dashed border-[#CBD5E1] bg-white px-4 py-8 text-center transition hover:border-[#F47B52] hover:bg-[#FFF7F7]">
                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDECEC] text-[#F47B52]">
                                        <Upload className="h-7 w-7" />
                                    </div>
                                    <span className="mt-3 text-sm font-black text-[#07324A]">
                                        Pilih foto kejadian
                                    </span>
                                    <span className="mt-1 max-w-lg text-xs font-semibold leading-relaxed text-slate-600">
                                        Opsional, maksimal 4 foto. Gunakan JPG, PNG, atau WEBP agar bukti lebih mudah diverifikasi admin.
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />
                                </label>

                                {getError('photos') && (
                                    <p className="mt-2 text-xs font-semibold text-red-600">
                                        {getError('photos')}
                                    </p>
                                )}

                                {photoPreviews.length > 0 && (
                                    <div className="mt-4 rounded-[1.25rem] border border-[#BDE7E1] bg-white p-3">
                                        <div className="mb-3 flex items-center justify-between gap-3">
                                            <p className="text-sm font-black text-[#07324A]">
                                                Preview Foto
                                            </p>
                                            <p className="text-xs font-semibold text-slate-500">
                                                Klik ikon hapus untuk membuang foto.
                                            </p>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            {photoPreviews.map((item, index) => (
                                                <div key={item.url} className="group relative overflow-hidden rounded-2xl border border-[#BDE7E1] bg-[#F8FAFC] shadow-sm">
                                                    <img
                                                        src={item.url}
                                                        alt={`Preview foto ${index + 1}`}
                                                        className="h-40 w-full object-cover"
                                                    />

                                                    <div className="absolute left-2 top-2 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-black text-[#07324A] shadow-sm">
                                                        Foto {index + 1}
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => removePhoto(index)}
                                                        className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white shadow-lg transition hover:bg-red-700"
                                                        aria-label={`Hapus foto ${index + 1}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>

                            <div className="border-t border-stone-100" />

                            <section>
                                <div className="flex items-start gap-3 rounded-2xl bg-stone-50 p-4">
                                    <div className="rounded-xl bg-[#F47B52] p-3 text-white">
                                        <FileWarning className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-black text-[#F47B52] dark:text-[#F47B52]">
                                            Alur laporan
                                        </h3>
                                        <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-200">
                                            Laporan yang dikirim akan berstatus pending. Admin akan memeriksa laporan, lalu menyetujui atau menolak laporan tersebut.
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={resetForm}
                                        disabled={isSubmitting}
                                        className="h-11 flex-1 rounded-xl border-stone-300 font-black"
                                    >
                                        Reset Form
                                    </Button>

                                    <Button
                                        type="submit"
                                        disabled={isSubmitting || isLocatingUser}
                                        className="h-11 flex-1 rounded-xl bg-[#F47B52] font-black text-white shadow-lg shadow-emerald-950/20 hover:bg-[#F47B52]"
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Mengirim...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                Kirim Laporan
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </section>
                        </div>
                    </div>
                </form>
            </section>
        </div>
    );
}
