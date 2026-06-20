import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  FireExtinguisher,
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
import MapView from '@/Components/MapView';
import { JagaPageHero } from '@/Components/JagaPageHero';

type FacilityType = 'Semua' | 'Polsek' | 'Rumah Sakit' | 'Damkar';

type UserLocation = {
  lat: number;
  lng: number;
};

type EmergencyContactItem = {
  id: string;
  name: string;
  type: 'Polsek' | 'Rumah Sakit' | 'Damkar';
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

const facilityTypes: FacilityType[] = ['Semua', 'Polsek', 'Rumah Sakit', 'Damkar'];

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
  if (type === 'Rumah Sakit') return Hospital;
  if (type === 'Damkar') return FireExtinguisher;
  return Shield;
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
      iconBox: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      card: 'hover:border-emerald-300 hover:ring-4 hover:ring-emerald-100',
      active: 'border-emerald-400 ring-4 ring-emerald-100',
      solid: 'bg-emerald-700 hover:bg-emerald-800',
      soft: 'bg-emerald-50 text-emerald-700',
      panel: 'border-emerald-200 bg-emerald-50',
      label: 'Faskes',
    };
  }

  if (type === 'Damkar') {
    return {
      iconBox: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
      badge: 'border-orange-200 bg-orange-50 text-orange-700',
      card: 'hover:border-orange-300 hover:ring-4 hover:ring-orange-100',
      active: 'border-orange-400 ring-4 ring-orange-100',
      solid: 'bg-orange-700 hover:bg-orange-800',
      soft: 'bg-orange-50 text-orange-700',
      panel: 'border-orange-200 bg-orange-50',
      label: 'Damkar',
    };
  }

  return {
    iconBox: 'bg-sky-100 text-[#0B6E78] ring-1 ring-sky-200',
    badge: 'border-sky-200 bg-sky-50 text-[#0B6E78]',
    card: 'hover:border-sky-300 hover:ring-4 hover:ring-sky-100',
    active: 'border-sky-400 ring-4 ring-sky-100',
    solid: 'bg-[#0B6E78] hover:bg-[#07324A]',
    soft: 'bg-sky-50 text-[#0B6E78]',
    panel: 'border-sky-200 bg-sky-50',
    label: 'Polsek',
  };
}

export default function Emergency() {
  const [selectedType, setSelectedType] = useState<FacilityType>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(6);
  const [selectedContactKey, setSelectedContactKey] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showHelpMap, setShowHelpMap] = useState(false);

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
          (contact.type === 'Polsek' || contact.type === 'Rumah Sakit' || contact.type === 'Damkar') &&
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

        if (a.type !== b.type) return facilityTypes.indexOf(a.type as FacilityType) - facilityTypes.indexOf(b.type as FacilityType);

        return a.name.localeCompare(b.name);
      });
  }, [contactsWithDistance, searchQuery, selectedType, userLocation]);

  const displayedContacts = filteredContacts.slice(0, visibleCount);
  const hiddenContactCount = Math.max(filteredContacts.length - displayedContacts.length, 0);

  const totalPolice = contacts.filter((contact) => contact.type === 'Polsek').length;
  const totalHospitals = contacts.filter((contact) => contact.type === 'Rumah Sakit').length;
  const totalFireStations = contacts.filter((contact) => contact.type === 'Damkar').length;

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

  const handleOpenHelpMap = () => {
    setShowHelpMap((current) => {
      const next = !current;

      if (!current) {
        window.setTimeout(() => {
          document.getElementById('peta-bantuan')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }, 80);
      }

      return next;
    });
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
    <div className="jaga-emergency-page min-h-screen theme-shell text-foreground">
      {toastMessage && (
        <div className="fixed right-4 top-4 z-[120] flex max-w-sm items-start gap-3 rounded-2xl border border-[#BDE7E1] bg-white dark:bg-[#102538] px-4 py-3 text-sm font-bold text-slate-800 dark:text-white shadow-xl">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#F47B52]" />
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

      <JagaPageHero
        page="emergency"
        eyebrow="Kontak Bantuan Resmi"
        title="Kontak Bantuan Terdekat"
        subtitle="Cari Polsek, fasilitas kesehatan, atau Damkar; aktifkan lokasi, lalu buka rute bantuan dari perangkat Anda."
        actionSlot={(
          <>
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={locationStatus === 'loading'}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[#F47B52] px-6 text-sm font-black text-white shadow-lg shadow-[#F47B52]/20 transition hover:-translate-y-0.5 hover:bg-[#D9633D] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {locationStatus === 'loading' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LocateFixed className="mr-2 h-4 w-4" />
              )}
              Gunakan Lokasi Saya
            </button>
            <button
              type="button"
              onClick={handleOpenHelpMap}
              className="inline-flex h-12 items-center justify-center rounded-full border border-[#BDE7E1] bg-white px-6 text-sm font-black text-[#07324A] transition hover:-translate-y-0.5 hover:bg-[#F6FBF8]"
            >
              {showHelpMap ? 'Tutup Peta' : 'Peta Bantuan'}
              <ChevronRight className={`ml-2 h-4 w-4 transition ${showHelpMap ? 'rotate-90' : ''}`} />
            </button>
            <a href="tel:110" className="inline-flex h-12 items-center justify-center rounded-full border border-[#F3D8C9] bg-[#FFF4EC] px-6 text-sm font-black text-[#C96B4B] transition hover:-translate-y-0.5 hover:bg-[#FDEADF]">
              <Phone className="mr-2 h-4 w-4" />
              110
            </a>
          </>
        )}
        metrics={[
          { label: 'Total Kontak', value: contacts.length, note: 'Kontak bantuan aktif' },
          { label: 'Polsek', value: contacts.filter((item) => item.type === 'Polsek').length, note: 'Pos bantuan keamanan' },
          { label: 'Rumah Sakit', value: contacts.filter((item) => item.type === 'Rumah Sakit').length, note: 'Fasilitas rujukan' },
          { label: 'Darurat', value: '110', note: 'Nomor bantuan cepat' },
        ]}
        sideTitle="Akses Bantuan Lebih Cepat"
        sideText="Aktifkan lokasi agar sistem dapat mengurutkan kontak terdekat dan membantu Anda membuka rute langsung."
        sideItems={['Aktifkan lokasi', 'Pilih kontak', 'Buka rute bantuan']}
      />

      {showHelpMap && (
        <section id="peta-bantuan" className="mx-auto max-w-7xl px-4 py-6 md:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-[#BDE7E1] bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-[#BDE7E1] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-black text-[#07324A]">Peta Bantuan</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">Sebaran Polsek, Rumah Sakit, dan Damkar. Klik marker untuk membuka detail bantuan.</p>
              </div>
              <div className="jaga-help-map-legend flex flex-wrap gap-2 text-xs font-black">
                <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-[#0B6E78]">
                  <Shield className="h-3.5 w-3.5" /> Polsek
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                  <Hospital className="h-3.5 w-3.5" /> Rumah Sakit
                </span>
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5 text-orange-700">
                  <FireExtinguisher className="h-3.5 w-3.5" /> Damkar
                </span>
              </div>
            </div>
            <div className="h-[430px] min-h-[360px]">
              <MapView
                center={[-7.716, 110.355]}
                zoom={11}
                incidents={[]}
                contacts={filteredContacts as any}
                showHeatmap={false}
                showIncidentMarkers={false}
                showDistrictBoundary
                fitDistrictBoundary={false}
                showMapControls
                showKdeLegend={false}
              />
            </div>
          </div>
        </section>
      )}

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
                  Gunakan pencarian atau kategori untuk menemukan kontak.
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
                  className="h-12 w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#17324A] pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-[#F47B52] focus:bg-white dark:bg-[#102538] focus:ring-4 focus:ring-[#BDE7E1]/35"
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
                    ? 'border-[#07324A] bg-[#07324A] text-white shadow-sm'
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
                              {tone.label}
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
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white dark:bg-[#102538] px-4 text-sm font-black text-slate-700 dark:text-slate-100 transition hover:border-[#F47B52] hover:bg-[#F2FAF6] hover:text-[#F47B52]"
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
                      className="inline-flex h-12 items-center justify-center rounded-2xl bg-[#07324A] px-4 text-sm font-black text-white transition hover:bg-[#07324A]"
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

          <div className="jaga-emergency-priority-card rounded-[2rem] border border-[#BDE7E1] bg-white p-5 text-[#07324A] shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-200">
              <ShieldAlert className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-black text-[#07324A]" style={{ color: '#07324A', WebkitTextFillColor: '#07324A' }}>Keselamatan tetap menjadi prioritas.</h3>

            <p className="mt-3 text-sm font-semibold leading-relaxed text-[#35506D]" style={{ color: '#35506D', WebkitTextFillColor: '#35506D' }}>
              Gunakan kontak resmi, buka rute bantuan terdekat, dan tetap berada
              di lokasi aman sampai bantuan datang.
            </p>
          </div>
        </aside>
      </section>
    </div>
  );
}
