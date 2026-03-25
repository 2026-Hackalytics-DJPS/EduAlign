import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { MatchItem } from "../types";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // US center

function FitBounds({ items }: { items: MatchItem[] }) {
  const map = useMap();
  const coords = items
    .filter((m) => m.LATITUDE != null && m.LONGITUDE != null)
    .map((m) => [m.LATITUDE!, m.LONGITUDE!] as [number, number]);
  useEffect(() => {
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [24, 24], maxZoom: 12 });
    }
  }, [map, coords.length]);
  return null;
}

const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export function MatchResultsMap({ matches }: { matches: MatchItem[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const withCoords = matches.filter(
    (m) => m.LATITUDE != null && m.LONGITUDE != null
  );
  if (withCoords.length === 0) return null;
  if (!mounted) return <div className="match-map-placeholder">Loading map…</div>;

  return (
    <div className="match-results-map">
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={4}
        scrollWheelZoom={true}
        style={{ height: 240, borderRadius: 12, zIndex: 1 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
        />
        <FitBounds items={withCoords} />
        {withCoords.map((m, i) => (
          <Marker
            key={m.UNITID ?? i}
            position={[m.LATITUDE as number, m.LONGITUDE as number]}
            icon={defaultIcon}
          >
            <Popup>
              <strong>{m.INSTNM}</strong>
              <br />
              Match: {Math.round((m.similarity_score ?? 0) * 100)}%
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
