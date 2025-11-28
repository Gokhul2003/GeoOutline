import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { EditControl } from "react-leaflet-draw";
import { v4 as uuidv4 } from "uuid";
import toast, { Toaster } from "react-hot-toast";

import Toolbar from "./Toolbar";
import MapControls from "./MapControls";

/* ---------------- Helper: attach map ref safely (v4) ---------------- */
function AttachMapRef({ setMap }: { setMap: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  return null;
}

/* ---------------- AOI storage helpers ---------------- */
interface AOI {
  id: string;
  name: string;
  geometry: any;
  createdAt: string;
}
const STORAGE_KEY = "flowbit_aoi_list_v1";
const THEME_KEY = "flowbit_theme_v1";
function loadAOIs(): AOI[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveAOIs(list: AOI[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}
function addAOI(aoi: AOI) {
  const list = loadAOIs();
  list.push(aoi);
  saveAOIs(list);
}

/* ---------------- Tiles + initial view ---------------- */
const TILE_OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ARCGIS = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}";
const TILE_CARTO_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

const INITIAL_CENTER: [number, number] = [50.9375, 6.9603];
const INITIAL_ZOOM = 12;

/* ---------------- Sync minimap ---------------- */
/* ---------------- Sync minimap ---------------- */
function useSyncMiniMap(
  mainMapRef: React.RefObject<L.Map | null>,
  miniMapRef: React.RefObject<L.Map | null>
) {
  useEffect(() => {
    if (!mainMapRef.current || !miniMapRef.current) return;

    const main = mainMapRef.current;
    const mini = miniMapRef.current;

    const sync = () => {
      try {
        const c = main.getCenter();
        const z = Math.max(0, main.getZoom() - 4); // minimap is zoomed out
        mini.setView(c, z, { animate: false });
      } catch {}
    };

    main.on("move", sync);
    main.on("zoom", sync);

    sync(); // initial sync

    return () => {
      main.off("move", sync);
      main.off("zoom", sync);
    };
  }, [mainMapRef, miniMapRef]);
}


/* ---------------- Shortcut help panel component ---------------- */
function ShortcutPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 20,
        bottom: 90,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        color: "white",
        padding: "14px 16px",
        borderRadius: 10,
        width: 240,
        fontSize: 13,
        lineHeight: "20px",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.98)",
        transition: "all 180ms ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Keyboard shortcuts</div>
      <div><strong>B</strong> — Base Image</div>
      <div><strong>M</strong> — Map View</div>
      <div><strong>R</strong> — Reset Map</div>
      <div><strong>D</strong> — Toggle Theme</div>
      <div style={{ marginTop: 10, textAlign: "center" }}>
        <button onClick={onClose} style={{ padding: "8px 10px", background: "#d97706", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Close
        </button>
      </div>
    </div>
  );
}

/* ---------------- Main component ---------------- */
export default function MapViewerEnhanced() {
  const mapRef = useRef<L.Map | null>(null);
  const miniRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<any>(null);

  const [aois, setAoIs] = useState<AOI[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [outlinePolygon, setOutlinePolygon] = useState<any | null>(null);
  const [confirmDisabled, setConfirmDisabled] = useState(true);

  const [viewMode, setViewMode] = useState<"base" | "map">("map");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const v = localStorage.getItem(THEME_KEY);
      return v === "dark" ? "dark" : "light";
    } catch {
      return "light";
    }
  });

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tooltip, setTooltip] = useState<{ text: string; x?: number; y?: number; visible: boolean }>({ text: "", visible: false });
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fading, setFading] = useState(false);

  const [shortcutOpen, setShortcutOpen] = useState(false);

  useEffect(() => { setAoIs(loadAOIs()); }, []);
  // sync minimap when they mount
  useEffect(() => {
    // Attach sync if both refs are set later
    const t = setTimeout(() => {
      if (mapRef.current && miniRef.current) {
        const main = mapRef.current;
        const mini = miniRef.current;
        const sync = () => {
          try {
            const c = main.getCenter();
            const z = Math.max(0, main.getZoom() - 4);
            mini.setView(c, z, { animate: false });
          } catch {}
        };
        main.on("move", sync);
        main.on("zoom", sync);
        sync();
        // cleanup
        return () => {
          main.off("move", sync);
          main.off("zoom", sync);
        };
      }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  /* ---------------- Autocomplete ---------------- */
  async function fetchSuggestions(q: string) {
    if (!q) { setSuggestions([]); return; }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&polygon_geojson=1&limit=6&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch { setSuggestions([]); }
  }
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearchQuery(v);
    fetchSuggestions(v);
  }

  /* ---------------- Apply suggestion ---------------- */
  function applySuggestion(s: any) {
    setSearchQuery(s.display_name);
    setSuggestions([]);
    showTooltip("Outlined city area (if available).", 260, 90);
    if (s.lat && s.lon) {
      mapRef.current?.setView([parseFloat(s.lat), parseFloat(s.lon)], 12, { animate: true });
    }
    if (s.geojson) {
      setOutlinePolygon(s.geojson);
      setConfirmDisabled(false);
      setStep(2);
      setTimeout(() => {
        try {
          const layer = L.geoJSON(s.geojson);
          mapRef.current?.fitBounds(layer.getBounds(), { padding: [40, 40] });
        } catch {}
      }, 80);
    } else {
      setOutlinePolygon(null);
      setConfirmDisabled(true);
    }
  }

  /* ---------------- Apply outline ---------------- */
  function applyOutlineAsBase() {
    if (!outlinePolygon) {
      toast.error("No polygon outline available — draw or pick another suggestion.");
      return;
    }
    const fg = featureGroupRef.current;
    if (!fg) return;
    fg.clearLayers();
    const layer = L.geoJSON(outlinePolygon, { style: { color: "#d08742", weight: 3, dashArray: "6 6", fillOpacity: 0.05 } });
    layer.addTo(fg);
    try { mapRef.current?.fitBounds(layer.getBounds(), { padding: [30, 30] }); } catch {}
    setConfirmDisabled(false);
    setStep(2);
    showTooltip("Outlined city area as your base shape", 380, 280);
    toast.success("Outline applied — edit if you want, then Confirm.");
  }

  /* ---------------- Confirm AOI ---------------- */
  function confirmAOI() {
    const fg = featureGroupRef.current;
    if (!fg) { toast.error("No area to confirm"); return; }
    type GeoLayer = L.Layer & { toGeoJSON: () => any };
    const layers = Object.values((fg as any)._layers || {}) as GeoLayer[];
    if (layers.length === 0) { toast.error("Draw or apply an outline first."); return; }
    const geojson = layers[0].toGeoJSON();
    const aoi: AOI = { id: uuidv4(), name: `Area ${new Date().toLocaleString()}`, geometry: geojson, createdAt: new Date().toISOString() };
    addAOI(aoi);
    setAoIs(loadAOIs());
    setStep(3);
    showTooltip("Area saved. You can view it in the list and zoom to it.", 260, 120);
    toast.success("Area of Interest saved");
  }

  /* ---------------- Draw handlers ---------------- */
  function onCreated() {
    setConfirmDisabled(false);
    setOutlinePolygon(null);
    setStep(2);
    showTooltip("Shape drawn — click Confirm to save", 260, 120);
  }
  function onDeleted() {
    const fg = featureGroupRef.current;
    const count = fg ? Object.keys((fg as any)._layers || {}).length : 0;
    setConfirmDisabled(count === 0);
    setAoIs(loadAOIs());
  }

  /* ---------------- Programmatic triggers (leaflet-draw) ---------------- */
  function clickDraw(selector: string) {
    const btn = document.querySelector(selector) as HTMLElement | null;
    btn?.click();
  }
  const startPolygon = () => clickDraw(".leaflet-draw-draw-polygon");
  const startRectangle = () => clickDraw(".leaflet-draw-draw-rectangle");
  const startEdit = () => clickDraw(".leaflet-draw-edit-edit");
  const saveEdit = () => clickDraw(".leaflet-draw-edit-save");
  const deleteShapes = () => clickDraw(".leaflet-draw-edit-remove");

  function zoomToSaved(a: AOI) {
    try {
      const layer = L.geoJSON(a.geometry);
      mapRef.current?.fitBounds(layer.getBounds(), { padding: [40, 40] });
    } catch { toast.error("Cannot zoom"); }
  }

  /* ---------------- Show AOI highlight briefly ---------------- */
  function showAOI(a: AOI) {
    try {
      const map = mapRef.current;
      if (!map) return;
      const layer = L.geoJSON(a.geometry, { style: { color: "#ffd166", weight: 3, fillOpacity: 0.08 } }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [30, 30] });
      setTimeout(() => {
        try { map.removeLayer(layer); } catch {}
      }, 2400);
    } catch { toast.error("Cannot show AOI"); }
  }

  /* ---------------- Delete AOI ---------------- */
  function deleteAOI(id: string) {
    const list = loadAOIs().filter(x => x.id !== id);
    saveAOIs(list);
    setAoIs(list);
    toast.success("AOI deleted");
  }

  /* ---------------- Reset map ---------------- */
  function resetMap() {
    if (!mapRef.current) return;
    mapRef.current.setView(INITIAL_CENTER, INITIAL_ZOOM);
    mapRef.current.setZoom(INITIAL_ZOOM);
    toast.success("Map reset");
  }

  /* ---------------- Theme toggle with fade ---------------- */
  function applyTheme(next: "light" | "dark") {
    if (theme === next) return;
    setFading(true);
    setTimeout(() => {
      setTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      setTimeout(() => setFading(false), 280);
    }, 160);
  }

  /* ---------------- Tooltip helper ---------------- */
  function showTooltip(text: string, x?: number, y?: number) {
    setTooltip({ text, x, y, visible: true });
    window.setTimeout(() => setTooltip(prev => ({ ...prev, visible: false })), 2600);
  }

  function getTileUrlForView(mode: "base" | "map", currentTheme: "light" | "dark") {
    if (currentTheme === "light") return mode === "base" ? TILE_ARCGIS : TILE_OSM;
    return TILE_CARTO_DARK;
  }

  const fadeOverlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: theme === "dark" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
    pointerEvents: "none",
    transition: "opacity 300ms ease",
    opacity: fading ? 1 : 0,
    zIndex: 5400
  };

  /* sidebar transform */
  const sidebarTransform = sidebarOpen ? "translateX(0)" : "translateX(-420px)";

  /* ---------------- Keyboard shortcuts (B,M,R,D,?) ---------------- */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "?") {
        setShortcutOpen(v => !v);
        return;
      }

      const k = e.key.toLowerCase();
      if (k === "b") {
        setFading(true);
        setTimeout(() => { setViewMode("base"); setFading(false); }, 140);
        toast("Switched to Base Image (🛰)");
      }
      if (k === "m") {
        setFading(true);
        setTimeout(() => { setViewMode("map"); setFading(false); }, 140);
        toast("Switched to Map View (🗺)");
      }
      if (k === "r") {
        resetMap();
      }
      if (k === "d") {
        applyTheme(theme === "light" ? "dark" : "light");
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [theme]);

  /* ---------------- JSX ---------------- */
  return (
    <div style={{ height: "100vh", width: "100%", fontFamily: "Inter, Roboto, Arial, sans-serif", background: theme === "dark" ? "#071022" : "#fff" }}>
      <Toaster position="bottom-right" />
      <div style={{ display: "flex", height: "100%" }}>
        {/* Sidebar */}
        <aside style={{
          width: 380,
          padding: 18,
          boxSizing: "border-box",
          background: theme === "dark" ? "#071022" : "#fff",
          color: theme === "dark" ? "#e6eef8" : "#111827",
          borderRight: theme === "dark" ? "1px solid #0f1724" : "1px solid #e6e6e6",
          transition: "transform 320ms cubic-bezier(.2,.9,.2,1), background 200ms ease",
          transform: sidebarTransform,
          zIndex: 4500,
          position: "relative"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, color: theme === "dark" ? "#ffa86b" : "#c96a26", fontWeight: 700 }}>Define Area of Interest</div>
              <div style={{ fontSize: 12, color: theme === "dark" ? "#9fb2c9" : "#6b7280" }}>Search or draw area on map</div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => applyTheme(theme === "light" ? "dark" : "light")} title="Toggle theme" style={{ padding: "6px 8px", borderRadius: 8, background: theme === "dark" ? "#0b1220" : "#f8fafc", border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}>
                {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
              </button>

              <button onClick={() => setSidebarOpen(s => !s)} style={{ padding: "6px 8px", borderRadius: 8, background: theme === "dark" ? "#0b1220" : "#f3f4f6", cursor: "pointer" }}>
                {sidebarOpen ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Steps */}
          <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
            {[1, 2, 3].map(n => (
              <div key={n} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 999,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: step >= (n as number) ? "#c96a26" : (theme === "dark" ? "#0b1220" : "#f3f4f6"),
                  color: step >= (n as number) ? "#fff" : (theme === "dark" ? "#9fb2c9" : "#6b7280"),
                  fontWeight: 700
                }}>{n}</div>
                <div style={{ fontSize: 13 }}>{n === 1 ? "Search" : n === 2 ? "Edit" : "Confirm"}</div>
              </div>
            ))}
          </div>

          {/* Search input */}
          <div style={{ marginTop: 16 }}>
            <input value={searchQuery} onChange={handleInputChange} placeholder="Search for a city (e.g., Cologne)" style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid " + (theme === "dark" ? "#233142" : "#e5e7eb"), background: theme === "dark" ? "#071022" : "#fff", color: theme === "dark" ? "#e6eef8" : "#111827", boxSizing: "border-box" }} />
            {suggestions.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 180, overflowY: "auto", borderRadius: 8, border: "1px solid #e6e6e6", background: theme === "dark" ? "#071022" : "#fff" }}>
                {suggestions.map((s, idx) => (
                  <div key={idx} onClick={() => applySuggestion(s)} style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer", color: theme === "dark" ? "#d8e6f8" : "#111827" }}>
                    <div style={{ fontWeight: 700 }}>{String(s.display_name).split(",")[0]}</div>
                    <div style={{ fontSize: 12, color: theme === "dark" ? "#9fb2c9" : "#6b7280" }}>{s.display_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar action buttons */}
          <div style={{ marginTop: 12 }}>
            <button onClick={applyOutlineAsBase} style={{ width: "100%", padding: 12, borderRadius: 10, background: theme === "dark" ? "#bb6b32" : "#c96a26", color: "#fff", border: "none", fontWeight: 700 }}>
              Apply outline as base image
            </button>

            <div style={{ marginTop: 8, fontSize: 12, color: theme === "dark" ? "#92b0cc" : "#6b7280" }}>You can always edit the shape later</div>

            <button onClick={confirmAOI} disabled={confirmDisabled} style={{ width: "100%", padding: 12, borderRadius: 10, marginTop: 12, background: confirmDisabled ? "#94a3b8" : "#b85e1f", color: "#fff", border: "none", fontWeight: 800, cursor: confirmDisabled ? "not-allowed" : "pointer" }}>
              Confirm Area of Interest
            </button>
          </div>

          {/* Saved AOIs */}
          <div style={{ marginTop: 18 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>Saved AOIs</div>
            <div style={{ maxHeight: 220, overflowY: "auto", borderRadius: 10, border: "1px solid #e6e6e6", background: theme === "dark" ? "#071022" : "#fff" }}>
              {aois.length === 0 ? <div style={{ padding: 10, color: theme === "dark" ? "#9fb2c9" : "#6b7280" }}>No AOIs created yet</div> : aois.map(a => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: 10, borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{a.name}</div>
                    <div style={{ fontSize: 12, color: theme === "dark" ? "#9fb2c9" : "#6b7280" }}>{new Date(a.createdAt).toLocaleString()}</div>
                  </div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => showAOI(a)} style={{ padding: "6px 8px", borderRadius: 8, background: theme === "dark" ? "#0b1220" : "#f3f4f6" }}>Show</button>
                    <button onClick={() => zoomToSaved(a)} style={{ padding: "6px 8px", borderRadius: 8, background: theme === "dark" ? "#0b1220" : "#f3f4f6" }}>Zoom</button>
                    <button onClick={() => deleteAOI(a.id)} style={{ padding: "6px 8px", borderRadius: 8, background: "#ffe8e6", color: "#b91c1c" }}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Map area */}
        <div style={{ flex: 1, position: "relative" }}>
          <MapContainer center={INITIAL_CENTER} zoom={INITIAL_ZOOM} style={{ height: "100vh", width: "100%" }}>
            <AttachMapRef setMap={(m) => (mapRef.current = m)} />

            {/* fade overlay during tile swap */}
            <div style={fadeOverlayStyle} />

            <TileLayer key={`tiles-${theme}-${viewMode}`} url={getTileUrlForView(viewMode, theme)} attribution={theme === "dark" ? "© Carto" : (viewMode === "base" ? "Tiles © Esri" : "© OpenStreetMap contributors")} />

            <FeatureGroup ref={(r: any) => (featureGroupRef.current = r)}>
              {/* @ts-ignore */}
              <EditControl
                position="topright"
                onCreated={onCreated}
                onDeleted={onDeleted}
                draw={{ rectangle: true, polygon: true, polyline: false, marker: false, circle: false, circlemarker: false }}
                edit={{ remove: true }}
              />
            </FeatureGroup>

            {outlinePolygon && <GeoJSON data={outlinePolygon} style={{ color: "#d08742", weight: 3, dashArray: "6 6", fillOpacity: 0.03 }} />}

            {aois.map(a => <GeoJSON key={a.id} data={a.geometry} style={{ color: "#c2a27b", weight: 2, dashArray: "4 4" }} />)}
          </MapContainer>

          {/* Toolbar & Controls */}
          <Toolbar onStartPolygon={startPolygon} onStartRectangle={startRectangle} onEdit={startEdit} onSaveEdit={saveEdit} onDeleteShapes={deleteShapes} />
          <MapControls onZoomIn={() => mapRef.current?.zoomIn()} onZoomOut={() => mapRef.current?.zoomOut()} onToggleView={() => { setFading(true); setTimeout(() => { setViewMode(v => v === "base" ? "map" : "base"); setFading(false); }, 160); }} viewMode={viewMode} />

          {/* Reset + theme indicator (top-right) */}
          <div style={{ position: "absolute", right: 96, top: 16, zIndex: 5600, display: "flex", gap: 8 }}>
            <button onClick={() => resetMap()} title="Reset map" style={{ padding: "8px 10px", borderRadius: 10, background: theme === "dark" ? "#0b1220" : "#fff", border: "1px solid #e6e6e6", cursor: "pointer" }}>🔄 Reset map</button>
            <div style={{ padding: "8px 12px", borderRadius: 10, background: theme === "dark" ? "#071022" : "#fff", border: "1px solid #e6e6e6", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ fontSize: 14 }}>{theme === "dark" ? "🌙 Dark" : "☀️ Light"}</div>
            </div>
          </div>

          {/* Bottom-left view toggle */}
          <div style={{ position: "absolute", left: 20, bottom: 20, zIndex: 5500, display: "flex", borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}>
            <button onClick={() => { setFading(true); setTimeout(() => { setViewMode("base"); setFading(false); }, 140); }} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 14px", fontSize: 13, background: viewMode === "base" ? (theme === "dark" ? "#bb6b32" : "#c96a26") : (theme === "dark" ? "#071022" : "#fff"), color: viewMode === "base" ? "#fff" : (theme === "dark" ? "#d8e6f8" : "#111827"), border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 16 }}>🛰</span>
              <span>Base Image</span>
            </button>

            <button onClick={() => { setFading(true); setTimeout(() => { setViewMode("map"); setFading(false); }, 140); }} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 14px", fontSize: 13, background: viewMode === "map" ? (theme === "dark" ? "#bb6b32" : "#c96a26") : (theme === "dark" ? "#071022" : "#fff"), color: viewMode === "map" ? "#fff" : (theme === "dark" ? "#d8e6f8" : "#111827"), border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 16 }}>🗺</span>
              <span>Map View</span>
            </button>
          </div>

          {/* Shortcut panel */}
          <ShortcutPanel visible={shortcutOpen} onClose={() => setShortcutOpen(false)} />

          {/* Tooltip */}
          <div style={{
            position: "absolute",
            left: tooltip.x ?? 260,
            top: tooltip.y ?? 90,
            zIndex: 6000,
            pointerEvents: "none",
            transform: tooltip.visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.98)",
            transition: "all 260ms ease",
            opacity: tooltip.visible ? 1 : 0
          }}>
            <div style={{ background: "rgba(0,0,0,0.75)", color: "white", padding: "8px 10px", borderRadius: 6, fontSize: 13 }}>
              {tooltip.text}
            </div>
          </div>

          {/* Mini-map */}
          <div style={{ position: "absolute", right: 20, bottom: 20, width: 140, height: 100, zIndex: 5500, borderRadius: 8, overflow: "hidden", boxShadow: "0 6px 16px rgba(0,0,0,0.12)" }}>
            <MapContainer center={INITIAL_CENTER} zoom={8} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} attributionControl={false} zoomControl={false} style={{ width: "100%", height: "100%" }}>
              <AttachMapRef setMap={(m) => (miniRef.current = m)} />
              <TileLayer url={theme === "dark" ? TILE_CARTO_DARK : TILE_OSM} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
