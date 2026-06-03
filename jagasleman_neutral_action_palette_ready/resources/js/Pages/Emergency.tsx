import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeInfo,
  CheckCircle2,
  ChevronRight,
  Copy,
  Hospital,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Route,
  Search,
  Shield,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import { emergencyContacts } from '@/data/dummy';

type FacilityType = 'Semua' | 'Polsek' | 'Rumah Sakit';

type UserLocation = {
  lat: number;
  lng: number;
};

type EmergencyContactItem = {
  id: string;
  name: string;
  type: 'Polsek' | 'Rumah Sakit';
  address: string;
  phone: string | null;
  lat: number;
  lng: number;
  website?: string | null;
  jenis?: string;
};

type ContactWithDistance = EmergencyContactItem & {
  distanceKm: number | null;
};

const facilityTypes: FacilityType[] = ['Semua', 'Polsek', 'Rumah Sakit'];

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
) {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDistance(distanceKm: number | null) {
  if (distanceKm === null || Number.isNaN(distanceKm)) return 'Aktifkan lokasi';
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`;
  return `${distanceKm.toFixed(1)} km`;
}

function getMapsRouteUrl(
  contact: EmergencyContactItem,
  userLocation: UserLocation | null,
) {
  if (userLocation) {
    return `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${contact.lat},${contact.lng}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${contact.lat},${contact.lng}`;
}

function getCallUrl(phone?: string | null) {
  if (!phone) return undefined;

  const cleanedPhone = String(phone).replace(/[^\d+]/g, '');
  if (!cleanedPhone) return undefined;

  return `tel:${cleanedPhone}`;
}

function getContactKey(contact: Pick<EmergencyContactItem, 'id' | 'type'>) {
  return `${contact.type}-${contact.id}`;
}

function getTypeIcon(type: EmergencyContactItem['type']) {
  return type === 'Rumah Sakit' ? Hospital : Shield;
}

function getShortAddress(address?: string) {
  if (!address) return 'Alamat belum tersedia';

  const cleanAddress = address.replace(/\s+/g, ' ').trim();

  if (cleanAddress.length <= 72) return cleanAddress;

  return `${cleanAddress.slice(0, 72).trim()}...`;
}

function getTypeTone(type: EmergencyContactItem['type']) {
  if (type === 'Rumah Sakit') {
    return {
      iconBox: 'bg-[#D8E4ED] text-[#D95F5F]',
      badge: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]',
      card: 'hover:border-[#D95F5F] hover:ring-4 hover:ring-[#D8E4ED]/35',
      active: 'border-[#D95F5F] ring-4 ring-[#D8E4ED]/35',
      solid: 'bg-[#1A3348] hover:bg-[#1A3348]',
      soft: 'bg-[#EFF4F8] text-[#D95F5F]',
      panel: 'border-[#D8E4ED] bg-[#EFF4F8]',
    };
  }

  return {
    iconBox: 'bg-[#D8E4ED] text-[#D95F5F]',
    badge: 'border-[#D8E4ED] bg-[#EFF4F8] text-[#D95F5F]',
    card: 'hover:border-[#D95F5F] hover:ring-4 hover:ring-[#D8E4ED]/35',
    active: 'border-[#D95F5F] ring-4 ring-[#D8E4ED]/35',
    solid: 'bg-[#1A3348] hover:bg-[#1A3348]',
    soft: 'bg-[#EFF4F8] text-[#D95F5F]',
    panel: 'border-[#D8E4ED] bg-[#EFF4F8]',
  };
}

export default function Emergency() {
  const [selectedType, setSelectedType] = useState<FacilityType>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedContactKey, setSelectedContactKey] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [locationStatus, setLocationStatus] = useState<
    'idle' | 'loading' | 'success' | 'error' | 'unsupported'
  >('idle');

  const [locationMessage, setLocationMessage] = useState(
    'Aktifkan lokasi untuk melihat kontak bantuan terdekat.',
  );

  useEffect(() => {
    setVisibleCount(6);
  }, [selectedType, searchQuery, userLocation]);

  const contacts = useMemo(() => {
    const rawContacts = Array.isArray(emergencyContacts) ? emergencyContacts : [];

    return rawContacts
      .map((contact: any, index: number) => ({
        id: String(contact.id ?? index),
        name: String(contact.name ?? ''),
        type: contact.type,
        address: String(contact.address ?? ''),
        phone: contact.phone ?? null,
        lat: Number(contact.lat),
        lng: Number(contact.lng),
        website: contact.website ?? null,
        jenis: contact.jenis ?? contact.type,
      }))
      .filter((contact): contact is EmergencyContactItem => {
        const validCoordinate =
          typeof contact.lat === 'number' &&
          typeof contact.lng === 'number' &&
          !Number.isNaN(contact.lat) &&
          !Number.isNaN(contact.lng);

        return (
          validCoordinate &&
          (contact.type === 'Polsek' || contact.type === 'Rumah Sakit') &&
          contact.name.trim().length > 0
        );
      });
  }, []);

  const contactsWithDistance: ContactWithDistance[] = useMemo(() => {
    return contacts.map((contact) => ({
      ...contact,
      distanceKm: userLocation
        ? calculateDistanceKm(
            userLocation.lat,
            userLocation.lng,
            contact.lat,
            contact.lng,
          )
        : null,
    }));
  }, [contacts, userLocation]);

  const filteredContacts = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();

    return contactsWithDistance
      .filter((contact) => {
        const matchesType =
          selectedType === 'Semua' ? true : contact.type === selectedType;

        const matchesSearch = keyword
          ? [
              contact.name,
              contact.address,
              contact.phone,
              contact.type,
              contact.jenis,
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(keyword)
          : true;

        return matchesType && matchesSearch;
      })
      .sort((a, b) => {
        if (userLocation) {
          return (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity);
        }

        if (a.type !== b.type) return a.type === 'Polsek' ? -1 : 1;

        return a.name.localeCompare(b.name);
      });
  }, [contactsWithDistance, searchQuery, selectedType, userLocation]);

  const displayedContacts = filteredContacts.slice(0, visibleCount);
  const hiddenContactCount = Math.max(filteredContacts.length - displayedContacts.length, 0);

  const totalPolice = contacts.filter((contact) => contact.type === 'Polsek').length;
  const totalHospitals = contacts.filter((contact) => contact.type === 'Rumah Sakit').length;

  const nearestFacility = useMemo(() => {
    return contactsWithDistance
      .filter((contact) => contact.distanceKm !== null)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))[0];
  }, [contactsWithDistance]);

  const nearestPolice = useMemo(() => {
    return contactsWithDistance
      .filter((contact) => contact.type === 'Polsek' && contact.distanceKm !== null)
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))[0];
  }, [contactsWithDistance]);

  const nearestHospital = useMemo(() => {
    return contactsWithDistance
      .filter(
        (contact) => contact.type === 'Rumah Sakit' && contact.distanceKm !== null,
      )
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))[0];
  }, [contactsWithDistance]);

  const selectedContact = useMemo(() => {
    if (selectedContactKey) {
      const selected = contactsWithDistance.find(
        (contact) => getContactKey(contact) === selectedContactKey,
      );

      if (selected) return selected;
    }

    return nearestFacility ?? filteredContacts[0] ?? null;
  }, [contactsWithDistance, filteredContacts, nearestFacility, selectedContactKey]);

  const showToast = (message: string) => {
    setToastMessage(message);

    window.setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unsupported');
      setLocationMessage('Browser belum mendukung akses lokasi.');
      return;
    }

    setLocationStatus('loading');
    setLocationMessage('Mengambil lokasi Anda...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        setLocationStatus('success');

        const nearest = contacts
          .map((contact) => ({
            ...contact,
            distanceKm: calculateDistanceKm(
              nextLocation.lat,
              nextLocation.lng,
              contact.lat,
              contact.lng,
            ),
          }))
          .sort((a, b) => a.distanceKm - b.distanceKm)[0];

        if (nearest) {
          setSelectedContactKey(getContactKey(nearest));
          setLocationMessage(
            `Lokasi aktif. Bantuan terdekat: ${nearest.name}, sekitar ${formatDistance(
              nearest.distanceKm,
            )}.`,
          );
        } else {
          setLocationMessage('Lokasi aktif, tetapi data kontak belum tersedia.');
        }
      },
      () => {
        setLocationStatus('error');
        setLocationMessage(
          'Lokasi belum bisa diakses. Izinkan akses lokasi pada browser, lalu coba lagi.',
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0,
      },
    );
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!userLocation && locationStatus === 'idle') {
        handleUseLocation();
      }
    }, 700);

    return () => window.clearTimeout(timer);
    // Auto prompt is intentional so the emergency page can immediately sort nearest help.
  }, []);

  const handleCopyUserLocation = async () => {
    if (!userLocation) {
      showToast('Aktifkan lokasi terlebih dahulu.');
      return;
    }

    try {
      await navigator.clipboard.writeText(`${userLocation.lat}, ${userLocation.lng}`);
      showToast('Koordinat lokasi berhasil disalin.');
    } catch {
      showToast('Koordinat belum bisa disalin.');
    }
  };

  const handleCopyFacilityLocation = async (contact: EmergencyContactItem) => {
    try {
      await navigator.clipboard.writeText(`${contact.lat}, ${contact.lng}`);
      showToast('Koordinat fasilitas berhasil disalin.');
    } catch {
      showToast('Koordinat belum bisa disalin.');
    }
  };

  return (
    <div className="min-h-screen theme-shell text-foreground">
      {toastMessage && (
        <div className="fixed right-4 top-4 z-[120] flex max-w-sm items-start gap-3 rounded-2xl border border-[#D8E4ED] bg-white dark:bg-[#102538] px-4 py-3 text-sm font-bold text-slate-800 dark:text-white shadow-xl">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#D95F5F]" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-2 rounded-full p-1 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:bg-[#17324A] hover:text-slate-700 dark:text-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="border-b theme-border theme-surface">
        <div className="mx-auto max-w-7xl px-4 py-7 md:px-8 md:py-10">
          <div className="grid gap-5 lg:grid-cols-[1.12fr_.88fr] lg:items-stretch">
            <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 theme-surface p-5 shadow-sm md:p-7">
              <div className="mb-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-black text-red-700">
                  <Siren className="mr-2 h-4 w-4" />
                  Kontak Bantuan
                </span>
                <span className="inline-flex items-center rounded-full border border-[#D8E4ED] bg-[#EFF4F8] px-3 py-1.5 text-xs font-black text-[#27527A]">
                  <BadgeInfo className="mr-2 h-4 w-4" />
                  Resmi dan mudah diakses
                </span>
              </div>

              <h1 className="max-w-3xl text-3xl font-black leading-tight tracking-tight text-foreground md:text-5xl">
                Temukan bantuan terdekat dengan lebih cepat.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 dark:text-slate-200 md:text-base">
                Butuh bantuan atau ingin melaporkan kendala? Hubungi tim Jaga Sleman melalui kontak resmi berikut, gunakan lokasi Anda, lalu buka rute ke Polsek atau fasilitas kesehatan terdekat.
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleUseLocation}
                  disabled={locationStatus === 'loading'}
                  className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#D95F5F] px-5 text-sm font-black text-white shadow-sm transition hover:bg-[#c94e4e] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {locationStatus === 'loading' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LocateFixed className="mr-2 h-4 w-4" />
                  )}
                  Gunakan Lokasi Saya
                </button>

                <a
                  href="/webgis"
                  className="inline-flex h-12 items-center justify-center rounded-2xl border border-[#D8E4ED] bg-[#EFF4F8] px-5 text-sm font-black text-[#1A3348] transition hover:border-[#D95F5F] hover:bg-white hover:text-[#0F1F2E] dark:border-white/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  Peta Bantuan
                  <ChevronRight className="ml-2 h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#D8E4ED] bg-[#0F1F2E] p-5 text-white shadow-xl md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D8E4ED]">Ringkasan Bantuan</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-white">Kontak penting dalam satu halaman.</h2>
                  <p className="mt-3 text-sm leading-6 text-white/75">
                    Pilih jenis fasilitas, cari nama atau alamat, salin koordinat, dan buka rute langsung dari perangkat Anda.
                  </p>
                </div>
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#D95F5F] p-3 text-white shadow-lg">
                  <Phone className="h-7 w-7" />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white p-4 text-[#0F1F2E]">
                  <Shield className="mb-2 h-5 w-5 text-[#D95F5F]" />
                  <p className="text-2xl font-black">{totalPolice}</p>
                  <p className="text-xs font-bold text-[#35506D]">Polsek</p>
                </div>
                <div className="rounded-2xl bg-white p-4 text-[#0F1F2E]">
                  <Hospital className="mb-2 h-5 w-5 text-[#D95F5F]" />
                  <p className="text-2xl font-black">{totalHospitals}</p>
                  <p className="text-xs font-bold text-[#35506D]">Faskes</p>
                </div>
                <div className="rounded-2xl bg-white p-4 text-[#0F1F2E]">
                  <AlertTriangle className="mb-2 h-5 w-5 text-[#D95F5F]" />
                  <p className="text-2xl font-black">110</p>
                  <p className="text-xs font-bold text-[#35506D]">Darurat</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <a href="tel:110" className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#D95F5F] px-4 text-sm font-black text-white transition hover:bg-[#c94e4e]">
                  <Phone className="mr-2 h-4 w-4" />
                  Hubungi 110
                </a>
                <button type="button" onClick={handleUseLocation} className="inline-flex h-12 items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white transition hover:bg-white/15">
                  <LocateFixed className="mr-2 h-4 w-4" />
                  Urutkan Terdekat
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-8">
        <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] p-4 shadow-sm md:p-5">
          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#17324A] text-slate-700 dark:text-slate-100">
                <SlidersHorizontal className="h-5 w-5" />
              </div>

              <div>
                <p className="font-black text-foreground">Cari Kontak Bantuan</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                  Gunakan filter agar daftar tetap ringkas dan mudah dibaca.
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <div className="relative min-w-0 sm:w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 dark:text-slate-300" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari nama, alamat, nomor..."
                  className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-[#D95F5F] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-[#D8E4ED]/35"
                />
              </div>

              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locationStatus === 'loading'}
                className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {locationStatus === 'loading' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <LocateFixed className="mr-2 h-4 w-4" />
                )}
                Perbarui Lokasi
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {facilityTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`rounded-2xl border px-3 py-3 text-xs font-black transition ${
                  selectedType === type
                    ? 'border-[#1A3348] bg-[#1A3348] text-white shadow-sm'
                    : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] text-slate-600 dark:text-slate-200 hover:bg-white dark:bg-[#102538]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 md:px-8 lg:grid-cols-[1.05fr_.95fr]">
        <main className="space-y-4">

          <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] p-4 shadow-sm md:p-5">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="font-black text-foreground">Daftar Kontak</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                  {filteredContacts.length} kontak ditemukan. Pilih salah satu untuk melihat detail.
                </p>
              </div>

              <span className="w-fit rounded-full bg-slate-100 dark:bg-[#17324A] px-3 py-1.5 text-xs font-black text-slate-600 dark:text-slate-200">
                Tampil {displayedContacts.length}
              </span>
            </div>

            <div className="grid gap-3">
              {displayedContacts.map((contact) => {
                const Icon = getTypeIcon(contact.type);
                const tone = getTypeTone(contact.type);
                const callUrl = getCallUrl(contact.phone);
                const isActive =
                  selectedContact &&
                  getContactKey(selectedContact) === getContactKey(contact);

                return (
                  <article
                    key={getContactKey(contact)}
                    className={`rounded-[1.5rem] border bg-white dark:bg-[#102538] p-4 shadow-sm transition ${tone.card} ${
                      isActive ? tone.active : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                      <button
                        type="button"
                        onClick={() => setSelectedContactKey(getContactKey(contact))}
                        className="flex min-w-0 items-start gap-3 text-left"
                      >
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.iconBox}`}
                        >
                          <Icon className="h-6 w-6" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${tone.badge}`}
                            >
                              {contact.type === 'Rumah Sakit' ? 'Faskes' : 'Polsek'}
                            </span>

                            <span className="rounded-full bg-slate-100 dark:bg-[#17324A] px-2.5 py-1 text-[11px] font-black text-slate-600 dark:text-slate-200">
                              {formatDistance(contact.distanceKm)}
                            </span>
                          </div>

                          <h3 className="truncate text-base font-black text-foreground">
                            {contact.name}
                          </h3>

                          <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-200">
                            {getShortAddress(contact.address)}
                          </p>
                        </div>
                      </button>

                      <div className="flex gap-2 md:justify-end">
                        {callUrl ? (
                          <a
                            href={callUrl}
                            className={`inline-flex h-10 items-center justify-center rounded-xl px-3 text-xs font-black text-white transition ${tone.solid}`}
                          >
                            <Phone className="mr-1.5 h-3.5 w-3.5" />
                            Telepon
                          </a>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="inline-flex h-10 cursor-not-allowed items-center justify-center rounded-xl bg-slate-100 dark:bg-[#17324A] px-3 text-xs font-black text-slate-500 dark:text-slate-300"
                          >
                            Telepon
                          </button>
                        )}

                        <a
                          href={getMapsRouteUrl(contact, userLocation)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white transition hover:bg-slate-800"
                        >
                          <Route className="mr-1.5 h-3.5 w-3.5" />
                          Rute
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {hiddenContactCount > 0 && (
              <button
                type="button"
                onClick={() => setVisibleCount((current) => current + 6)}
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white dark:bg-[#102538] px-4 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:border-[#D95F5F] hover:bg-[#EFF4F8] hover:text-[#D95F5F]"
              >
                Tampilkan {Math.min(6, hiddenContactCount)} kontak lagi
                <ChevronRight className="ml-2 h-4 w-4" />
              </button>
            )}

            {filteredContacts.length === 0 && (
              <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-slate-50 dark:bg-[#17324A] p-8 text-center">
                <BadgeInfo className="mx-auto mb-3 h-10 w-10 text-slate-500 dark:text-slate-300" />
                <p className="font-black text-slate-800 dark:text-white">Data tidak ditemukan</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                  Coba ubah filter atau kata kunci pencarian.
                </p>
              </div>
            )}
          </div>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {selectedContact ? (
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] shadow-sm">
              <div className={`border-b p-5 ${getTypeTone(selectedContact.type).panel}`}>
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                      getTypeTone(selectedContact.type).iconBox
                    }`}
                  >
                    {(() => {
                      const Icon = getTypeIcon(selectedContact.type);
                      return <Icon className="h-7 w-7" />;
                    })()}
                  </div>

                  <div className="min-w-0">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${
                        getTypeTone(selectedContact.type).badge
                      }`}
                    >
                      {selectedContact.type}
                    </span>

                    <h2 className="mt-3 text-xl font-black leading-tight text-foreground">
                      {selectedContact.name}
                    </h2>

                    <p className="mt-2 text-sm font-black text-slate-700 dark:text-slate-100">
                      {formatDistance(selectedContact.distanceKm)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">
                    <MapPin className="h-4 w-4" />
                    Alamat
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-100">
                    {selectedContact.address || 'Alamat belum tersedia'}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      <Phone className="h-4 w-4" />
                      Telepon
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {selectedContact.phone || 'Belum tersedia'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] p-4">
                    <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500 dark:text-slate-300">
                      <Navigation className="h-4 w-4" />
                      Koordinat
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-white">
                      {selectedContact.lat.toFixed(4)}, {selectedContact.lng.toFixed(4)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {getCallUrl(selectedContact.phone) ? (
                    <a
                      href={getCallUrl(selectedContact.phone)}
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#1A3348] px-4 text-sm font-black text-white transition hover:bg-[#1A3348]"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Telepon
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-12 cursor-not-allowed items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#17324A] px-4 text-sm font-black text-slate-500 dark:text-slate-300"
                    >
                      Telepon
                    </button>
                  )}

                  <a
                    href={getMapsRouteUrl(selectedContact, userLocation)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    <Route className="mr-2 h-4 w-4" />
                    Rute
                  </a>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopyFacilityLocation(selectedContact)}
                  className="inline-flex h-11 w-full items-center justify-center rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] px-4 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:bg-white dark:bg-[#102538]"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Salin Koordinat Fasilitas
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#102538] p-6 text-center shadow-sm">
              <BadgeInfo className="mx-auto mb-3 h-10 w-10 text-slate-500 dark:text-slate-300" />
              <p className="font-black text-slate-800 dark:text-white">Pilih kontak bantuan</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-200">
                Detail kontak akan muncul di panel ini.
              </p>
            </div>
          )}

          <div className="rounded-[2rem] border border-red-200 bg-red-50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <p className="font-black text-red-800">Panduan Cepat</p>
                <p className="text-xs text-red-600">
                  Gunakan langkah ini saat membutuhkan bantuan.
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-sm text-red-800">
              {[
                'Menjauh ke tempat aman.',
                'Hubungi Polsek atau bantuan medis.',
                'Catat lokasi dan ciri kejadian.',
                'Jangan mengejar pelaku jika berisiko.',
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl bg-white dark:bg-[#102538]/70 p-3"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-black text-red-700">
                    {index + 1}
                  </span>
                  <p className="font-semibold leading-relaxed">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-950 p-5 text-white shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500 text-white">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-black">Keselamatan tetap menjadi prioritas.</h3>

            <p className="mt-3 text-sm leading-relaxed text-white/65">
              Gunakan kontak resmi, buka rute bantuan terdekat, dan tetap berada
              di lokasi aman sampai bantuan datang.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
