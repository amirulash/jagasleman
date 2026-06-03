import kantorPolisiGeojsonRaw from "./points/Kantor_Polisi.geojson?raw";

export function getPoliceFromGeojson() {
  const data = JSON.parse(kantorPolisiGeojsonRaw);
  return data.features || [];
}

export function convertPoliceToContactsFormat(features: any[]) {
  return features
    .map((feature, index) => {
      const props = feature.properties || {};
      const coordinates = feature.geometry?.coordinates || [];

      const lng = Number(coordinates[0]);
      const lat = Number(coordinates[1]);

      return {
        id: `police_${props.no || props.id || index + 1}`,
        name:
          props.nama_kantor ||
          props.nama ||
          props.NAMA ||
          props.name ||
          `Kantor Polisi ${index + 1}`,
        type: "Polsek" as const,
        address:
          props.alamat ||
          props.ALAMAT ||
          props.address ||
          "-",
        phone:
          props.telepon ||
          props.no_telp ||
          props.TELEPON ||
          props.phone ||
          "-",
        lat,
        lng,
        website:
          props.link_gmaps ||
          props.Link_Gmaps ||
          props.google_maps ||
          props.website ||
          null,
        jenis:
          props.tipe ||
          props.jenis ||
          props.KETERANGAN ||
          "Kantor Polisi",
      };
    })
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}
