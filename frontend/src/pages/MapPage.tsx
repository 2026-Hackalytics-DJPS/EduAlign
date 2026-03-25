import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCollegesMap, type CollegeMapItem } from "../api";
import { MapPin, Search, Loader2 } from "lucide-react";

const US_STATES = [
  "", "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA",
  "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY",
  "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX",
  "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC",
];

const LIMIT = 150;
const simpleIcon = L.divIcon({
  className: "map-pin",
  html: '<span style="background:#4a5080;width:12px;height:12px;border-radius:50%;display:block;border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,.3)"></span>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function CollegeMarkers({ colleges }: { colleges: CollegeMapItem[] }) {
  return (
    <>
      {colleges.map((c) => (
        <Marker
          key={c.UNITID}
          position={[c.LATITUDE, c.LONGITUDE]}
          icon={simpleIcon}
        >
          <Popup>
            <strong>{c.INSTNM}</strong>
            <br />
            {c.CITY}, {c.STABBR}
            <br />
            <a href={`/reviews/${c.UNITID}`}>View details →</a>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

function NearMeButton({
  onLocation,
  disabled,
}: {
  onLocation: (lat: number, lng: number) => void;
  disabled?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = useCallback(() => {
    setError(null);
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onLocation(latitude, longitude);
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Location unavailable");
        setLoading(false);
      }
    );
  }, [onLocation]);

  return (
    <button
      type="button"
      className="map-near-me-btn"
      onClick={handleClick}
      disabled={disabled || loading}
      title="Colleges near me"
    >
      {loading ? <Loader2 size={18} className="spin" /> : <MapPin size={18} />}
      {loading ? "Locating…" : "Near me"}
      {error && <span className="map-near-me-err">{error}</span>}
    </button>
  );
}

function SetViewOnLocation({ location }: { location: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (location) map.setView(location, 10);
  }, [map, location]);
  return null;
}

export function MapPage() {
  const [colleges, setColleges] = useState<CollegeMapItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [state, setState] = useState("");
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const fetchColleges = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCollegesMap(search, state, LIMIT);
      setColleges(data);
    } catch {
      setColleges([]);
    } finally {
      setLoading(false);
    }
  }, [search, state]);

  useEffect(() => {
    if (!mounted) return;
    fetchColleges();
  }, [mounted, fetchColleges]);

  if (!mounted) {
    return (
      <div className="map-page">
        <div className="map-loading-overlay">Loading map…</div>
      </div>
    );
  }

  return (
    <div className="map-page">
      <div className="map-toolbar">
        <div className="map-toolbar-row">
          <div className="map-search-wrap">
            <Search size={18} className="map-search-icon" />
            <input
              type="text"
              className="map-search-input"
              placeholder="Search colleges…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchColleges()}
            />
          </div>
          <select
            className="map-state-select"
            value={state}
            onChange={(e) => setState(e.target.value)}
          >
            {US_STATES.map((s) => (
              <option key={s || "all"} value={s}>
                {s || "All states"}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="map-apply-btn"
            onClick={fetchColleges}
            disabled={loading}
          >
            {loading ? <Loader2 size={18} className="spin" /> : "Apply"}
          </button>
        </div>
        <NearMeButton onLocation={(lat, lng) => setUserLoc([lat, lng])} disabled={loading} />
      </div>

      <div className="map-container-wrap">
        <MapContainer
          center={userLoc ?? [39.8283, -98.5795]}
          zoom={userLoc ? 10 : 4}
          scrollWheelZoom={true}
          style={{ height: "100%", width: "100%", minHeight: 500 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          />
          <SetViewOnLocation location={userLoc} />
          <CollegeMarkers colleges={colleges} />
        </MapContainer>
      </div>

      <style>{`
        .map-page {
          display: flex;
          flex-direction: column;
          height: calc(100vh - 60px);
          min-height: 500px;
        }
        .map-toolbar {
          padding: 1rem;
          background: white;
          border-bottom: 1px solid #e0e4ec;
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          align-items: center;
        }
        .map-toolbar-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          align-items: center;
        }
        .map-search-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }
        .map-search-icon {
          position: absolute;
          left: 10px;
          color: #888;
        }
        .map-search-input {
          padding: 0.5rem 0.75rem 0.5rem 2.25rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.95rem;
          min-width: 200px;
        }
        .map-state-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-size: 0.95rem;
        }
        .map-apply-btn {
          padding: 0.5rem 1rem;
          background: #4a5080;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .map-apply-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .map-near-me-btn {
          padding: 0.5rem 1rem;
          background: #f0f4ff;
          color: #4a5080;
          border: 1px solid #c8d0e8;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }
        .map-near-me-btn:hover { background: #e4ebff; }
        .map-near-me-btn:disabled { opacity: 0.7; }
        .map-near-me-err { font-size: 0.8rem; color: #c00; margin-left: 0.5rem; }
        .map-container-wrap {
          flex: 1;
          position: relative;
        }
        .map-loading-overlay {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 400px;
          color: #666;
        }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .map-pin.leaflet-marker-icon { border: none; background: none; }
      `}</style>
    </div>
  );
}
