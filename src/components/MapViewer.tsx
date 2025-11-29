// MapViewerEnhanced.tsx
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

/* ======================== Helpers ======================== */

/** AttachMapRef safely sets mapRef when MapContainer creates a map (react-leaflet v4) */
function AttachMapRef({ setMap }: { setMap: (m: L.Map) => void }) {
  const map = useMap();

  useEffect(() => {
    setMap(map);
    // IMPORTANT: effect must return a cleanup function (even empty) — prevents React treating non-function as cleanup
    return () => { };
  }, [map, setMap]);

  return null;
}

/* ======================== Types / Storage ======================== */

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

/* ======================== Tile & WMS config ======================== */

/** REQUIRED: NRW WMS endpoint and layer name (using EPSG:3857) */
const NRW_WMS_URL = "https://www.wms.nrw.de/geobasis/wms_nw_dop";
const NRW_WMS_LAYER = "nw_dop_rgb";

/** Map tiles for 'map' view and dark mode */
const TILE_OSM = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_CARTO_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

/* initial center */
const INITIAL_CENTER: [number, number] = [50.9375, 6.9603];
const INITIAL_ZOOM = 12;

/* create WMS tile layer (Leaflet) */
function createWmsLayer(map: L.Map, layerName: string) {
  // Use leaflet's WMS helper — cast to any for typings
  const wms = (L.tileLayer as any).wms(NRW_WMS_URL, {
    layers: layerName,
    format: "image/jpeg",
    transparent: false,
    version: "1.3.0",
    attribution: "© GeoBasis NRW",
    tiled: true,
    noWrap: true
  }) as L.TileLayer.WMS;

  wms.addTo(map);
  return wms;
}

/* ======================== Minimap sync hook (NO destroy) ======================== */

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
        const z = Math.max(0, main.getZoom() - 4);
        mini.setView(c, z, { animate: false });
      } catch {
        /* ignore */
      }
    };

    main.on("move", sync);
    main.on("zoom", sync);
    sync();

    return () => {
      main.off("move", sync);
      main.off("zoom", sync);
    };
  }, [mainMapRef, miniMapRef]);
}

/* ======================== Shortcut Panel ======================== */

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
        pointerEvents: visible ? "auto" : "none"
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>Keyboard shortcuts</div>
      <div><strong>B</strong> — Base Image (NRW WMS)</div>
      <div><strong>M</strong> — Map View (OSM)</div>
      <div><strong>R</strong> — Reset Map</div>
      <div><strong>D</strong> — Toggle Theme</div>
      <div style={{ marginTop: 10, textAlign: "center" }}>
        <button onClick={onClose} style={{ padding: "8px 10px", background: "#d97706", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>Close</button>
      </div>
    </div>
  );
}

/* ======================== Main Component ======================== */

export default function MapViewerEnhanced() {
  const mapRef = useRef<L.Map | null>(null);
  const miniRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<any>(null);
  const wmsRef = useRef<L.TileLayer.WMS | null>(null);

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

  // sidebar sections
  const [sectionOpen, setSectionOpen] = useState({ baseSelect: true, defineAOI: true, defineObjects: false });

  useEffect(() => {
    setAoIs(loadAOIs());
  }, []);

  useSyncMiniMap(mapRef, miniRef);

  /* ---------------- Manage WMS when viewMode toggles ---------------- */
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove old WMS layer safely
    if (wmsRef.current && map.hasLayer(wmsRef.current)) {
      try {
        map.removeLayer(wmsRef.current);
      } catch { }
      wmsRef.current = null;
    }

    // Add WMS when switching to base
    if (viewMode === "base") {
      try {
        const layer = createWmsLayer(map, NRW_WMS_LAYER);
        wmsRef.current = layer;
      } catch (err) {
        console.error("WMS load error", err);
        toast.error("Failed to load NRW WMS");
      }
    }

    // Always return a cleanup function (even if empty) — prevents React errors
    return () => { };
  }, [viewMode]);

  /* ---------------- Autocomplete (Nominatim restricted to Germany) ---------------- */
  async function fetchSuggestions(q: string) {
    if (!q) { setSuggestions([]); return; }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&polygon_geojson=1&limit=8&countrycodes=de&q=${encodeURIComponent(q)}`;
      const res = await fetch(url);
      const data = await res.json();
      setSuggestions(Array.isArray(data) ? data : []);
    } catch {
      setSuggestions([]);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setSearchQuery(v);
    fetchSuggestions(v);
  }

  /* ---------------- Apply suggestion: zoom + polygon ---------------- */
  function applySuggestion(s: any) {
    setSearchQuery(s.display_name);
    setSuggestions([]);
    showTooltip("Outlined area (if available).", 220, 90);

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
        } catch { /* ignore */ }
      }, 80);
    } else {
      setOutlinePolygon(null);
      setConfirmDisabled(true);
    }
  }

  /* ---------------- Apply outline (add to FeatureGroup) ---------------- */
  function applyOutlineAsBase() {
    if (!outlinePolygon) { toast.error("No outline available."); return; }
    const fg = featureGroupRef.current;
    if (!fg) return;
    fg.clearLayers();
    const layer = L.geoJSON(outlinePolygon, { style: { color: "#d08742", weight: 3, dashArray: "6 6", fillOpacity: 0.05 } });
    layer.addTo(fg);
    try { mapRef.current?.fitBounds(layer.getBounds(), { padding: [30, 30] }); } catch { }
    setConfirmDisabled(false);
    setStep(2);
    toast.success("Outline applied — edit if needed.");
  }

  /* ---------------- Confirm AOI (save to localStorage) ---------------- */
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
    toast.success("Area of Interest saved");
  }

  /* ---------------- Draw handlers ---------------- */
  function onCreated(e: any) {
    const layer = e.layer;

    // ⭐ Make rectangle/polygon visible after drawing
    if (layer.setStyle) {
      layer.setStyle({
        color: "#ff7800",
        weight: 2,
        fillOpacity: 0.3,
        fillColor: "#ffb26b"
      });
    }

    // ⭐ DO NOT CLEAR outlinePolygon (this was hiding your shape)
    // setOutlinePolygon(null);  <-- REMOVE

    // ⭐ Enable confirm button
    setConfirmDisabled(false);
    setStep(2);

    showTooltip("Shape drawn — click Confirm to save", 260, 120);
  }

  function onDeleted() {
    const fg = featureGroupRef.current;
    const count = fg ? Object.keys((fg as any)._layers || {}).length : 0;
    setConfirmDisabled(count === 0);
    setAoIs(loadAOIs());
  }

  /* programmatic triggers for leaflet-draw */
  function clickDraw(selector: string) {
    const btn = document.querySelector(selector) as HTMLElement | null;
    btn?.click();
  }
  const startPolygon = () => clickDraw(".leaflet-draw-draw-polygon");
  const startRectangle = () => clickDraw(".leaflet-draw-draw-rectangle");
  const startEdit = () => clickDraw(".leaflet-draw-edit-edit");
  const saveEdit = () => clickDraw(".leaflet-draw-edit-save");
  const deleteShapes = () => clickDraw(".leaflet-draw-edit-remove");

  /* ---------------- AOI utilities: show, zoom, delete ---------------- */
  function zoomToSaved(a: AOI) {
    try {
      const layer = L.geoJSON(a.geometry);
      mapRef.current?.fitBounds(layer.getBounds(), { padding: [40, 40] });
    } catch { toast.error("Cannot zoom"); }
  }
  function showAOI(a: AOI) {
    try {
      const m = mapRef.current;
      if (!m) return;
      const layer = L.geoJSON(a.geometry, { style: { color: "#ffd166", weight: 3, fillOpacity: 0.08 } }).addTo(m);
      m.fitBounds(layer.getBounds(), { padding: [30, 30] });
      setTimeout(() => { try { m.removeLayer(layer); } catch { } }, 2400);
    } catch { toast.error("Cannot show AOI"); }
  }
  function deleteAOI(id: string) {
    const list = loadAOIs().filter(x => x.id !== id);
    saveAOIs(list);
    setAoIs(list);
    toast.success("AOI deleted");
  }

  /* ---------------- Reset & Theme ---------------- */
  function resetMap() {
    if (!mapRef.current) return;
    mapRef.current.setView(INITIAL_CENTER, INITIAL_ZOOM);
    mapRef.current.setZoom(INITIAL_ZOOM);
    toast.success("Map reset");
  }
  function applyTheme(next: "light" | "dark") {
    if (theme === next) return;
    setFading(true);
    setTimeout(() => {
      setTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch { }
      setTimeout(() => setFading(false), 280);
    }, 160);
  }

  /* ---------------- Tooltip helper ---------------- */
  function showTooltip(text: string, x?: number, y?: number) {
    setTooltip({ text, x, y, visible: true });
    window.setTimeout(() => setTooltip(prev => ({ ...prev, visible: false })), 2600);
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

  const sidebarStyle: React.CSSProperties = {
    width: 360,
    padding: 18,
    boxSizing: "border-box",
    background: theme === "dark" ? "#071022" : "#fff",
    color: theme === "dark" ? "#e6eef8" : "#111827",
    borderRight: theme === "dark" ? "1px solid #0f1724" : "1px solid #e6e6e6",
    transition: "transform 320ms cubic-bezier(.2,.9,.2,1), background 200ms ease",
    zIndex: 4500,
    position: sidebarOpen ? "relative" : "absolute",
    transform: sidebarOpen ? "translateX(0)" : "translateX(-420px)",
    left: 0,
    top: 0,
    bottom: 0,
    height: "100vh",
    overflowY: "auto",
  };

  /* ---------------- Keyboard shortcuts ---------------- */
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
        toast("Switched to Base (NRW WMS)");
      }
      if (k === "m") {
        setFading(true);
        setTimeout(() => { setViewMode("map"); setFading(false); }, 140);
        toast("Switched to Map View");
      }
      if (k === "r") resetMap();
      if (k === "d") applyTheme(theme === "light" ? "dark" : "light");
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [theme]);

  /* ---------------- Render JSX ---------------- */
  return (
    <div style={{ height: "100vh", width: "100%", fontFamily: "Inter, Roboto, Arial, sans-serif", background: theme === "dark" ? "#071022" : "#fff" }}>
      <Toaster position="bottom-right" />
      <div style={{ display: "flex", height: "100%" }}>
        {/* Sidebar */}
        <aside style={sidebarStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, color: theme === "dark" ? "#ffa86b" : "#c96a26", fontWeight: 700 }}>Project</div>
              <div style={{ fontSize: 12, color: theme === "dark" ? "#9fb2c9" : "#6b7280" }}>NRW base + AOI tools</div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => applyTheme(theme === "light" ? "dark" : "light")} style={{ padding: "6px 8px", borderRadius: 8, background: theme === "dark" ? "#0b1220" : "#f8fafc", border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}>
                {theme === "dark" ? "🌙" : "☀️"}
              </button>

              <button onClick={() => setSidebarOpen(s => !s)} style={{ padding: "6px 8px", borderRadius: 8, background: theme === "dark" ? "#0b1220" : "#f3f4f6", cursor: "pointer" }}>
                {sidebarOpen ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {/* Select Base */}
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setSectionOpen(s => ({ ...s, baseSelect: !s.baseSelect }))}>
              <div style={{ fontWeight: 700 }}>Select Base Image</div>
              <div>{sectionOpen.baseSelect ? "▾" : "▸"}</div>
            </div>

            {sectionOpen.baseSelect && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>Base: NRW DOP orthophoto (WMS)</div>
                <button onClick={() => setViewMode("base")} style={{ marginRight: 8, padding: "8px 10px", borderRadius: 8, background: viewMode === "base" ? "#c96a26" : "#fff", color: viewMode === "base" ? "#fff" : "#111", border: "1px solid #e6e6e6" }}>Use NRW</button>
                <button onClick={() => setViewMode("map")} style={{ padding: "8px 10px", borderRadius: 8, background: viewMode === "map" ? "#c96a26" : "#fff", color: viewMode === "map" ? "#fff" : "#111", border: "1px solid #e6e6e6", marginLeft: 8 }}>Use Map</button>
              </div>
            )}
          </div>

          {/* Define AOI */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setSectionOpen(s => ({ ...s, defineAOI: !s.defineAOI }))}>
              <div style={{ fontWeight: 700 }}>Define Area of Interest</div>
              <div>{sectionOpen.defineAOI ? "▾" : "▸"}</div>
            </div>

            {sectionOpen.defineAOI && (
              <>
                <div style={{ marginTop: 8 }}>
                  <input value={searchQuery} onChange={handleInputChange} placeholder="Search Germany (city, state...)" style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #e6e6e6" }} />
                  {suggestions.length > 0 && (
                    <div style={{ marginTop: 6, maxHeight: 180, overflowY: "auto", borderRadius: 8, border: "1px solid #e6e6e6", background: "#fff" }}>
                      {suggestions.map((s, idx) => (
                        <div key={idx} onClick={() => applySuggestion(s)} style={{ padding: 10, borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer" }}>
                          <div style={{ fontWeight: 700 }}>{String(s.display_name).split(",")[0]}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>{s.display_name}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                  <button onClick={applyOutlineAsBase} style={{ flex: 1, padding: 10, borderRadius: 8, background: "#c96a26", color: "#fff" }}>Apply outline as base image</button>
                  <button onClick={confirmAOI} disabled={confirmDisabled} style={{ flex: 1, padding: 10, borderRadius: 8, background: confirmDisabled ? "#94a3b8" : "#b85e1f", color: "#fff" }}>Confirm Area</button>
                </div>
              </>
            )}
          </div>

          {/* AOI list */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700 }}>Areas</div>
            </div>

            <div style={{ marginTop: 8 }}>
              {aois.length === 0 ? <div style={{ padding: 8, color: "#6b7280" }}>No areas saved yet</div> : aois.map(a => <AreaRow key={a.id} aoi={a} onZoom={() => zoomToSaved(a)} onShow={() => showAOI(a)} onDelete={() => deleteAOI(a.id)} />)}
            </div>
          </div>

          {/* Define objects (placeholder) */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setSectionOpen(s => ({ ...s, defineObjects: !s.defineObjects }))}>
              <div style={{ fontWeight: 700 }}>Define Objects</div>
              <div>{sectionOpen.defineObjects ? "▾" : "▸"}</div>
            </div>

            {sectionOpen.defineObjects && <div style={{ marginTop: 8, color: "#6b7280" }}>Object selection placeholder</div>}
          </div>
        </aside>

        {/* Map area */}
        <div style={{ flex: 1, position: "relative" }}>
          {/* Show menu button when sidebar is hidden */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              style={{
                position: "absolute",
                left: 10,
                top: 16,
                zIndex: 6000,
                padding: "8px 12px",
                background: theme === "dark" ? "#bb6b32" : "#c96a26",
                color: "#fff",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
              }}
            >
              ☰ Menu
            </button>
          )}

          <MapContainer center={INITIAL_CENTER} zoom={INITIAL_ZOOM} style={{ height: "100vh", width: "100%" }}>
            <AttachMapRef setMap={(m) => (mapRef.current = m)} />

            {/* fade overlay */}
            <div style={fadeOverlayStyle} />

            {/* Tile: OSM or Carto dark for map view. For base view, WMS layer is programmatically added via createWmsLayer */}
            {viewMode === "map" ? (
              <TileLayer url={theme === "dark" ? TILE_CARTO_DARK : TILE_OSM} attribution={theme === "dark" ? "© Carto" : "© OpenStreetMap contributors"} noWrap={true} />
            ) : (
              <TileLayer url={TILE_OSM} opacity={0} noWrap={true} />
            )}

            <FeatureGroup ref={(r: any) => (featureGroupRef.current = r)}>
              {/* @ts-ignore */}
              <EditControl position="topright" onCreated={onCreated} onDeleted={onDeleted}
                draw={{
                  rectangle: {
                    shapeOptions: {
                      color: "#ff7800",
                      weight: 2,
                      fillOpacity: 0.15
                    }
                  },
                  polygon: {
                    shapeOptions: {
                      color: "#ff7800",
                      weight: 2,
                      fillOpacity: 0.15
                    }
                  },
                  polyline: false,
                  marker: false,
                  circle: false,
                  circlemarker: false
                }}
                edit={{ remove: true }} />
            </FeatureGroup>

            {outlinePolygon && <GeoJSON data={outlinePolygon} style={{ color: "#d08742", weight: 3, dashArray: "6 6", fillOpacity: 0.03 }} />}

            {aois.map(a => <GeoJSON key={a.id} data={a.geometry} style={{ color: "#c2a27b", weight: 2, dashArray: "4 4" }} />)}
          </MapContainer>

          {/* Toolbar & Controls */}
          <div className="controls-wrapper">
            <Toolbar onStartPolygon={startPolygon} onStartRectangle={startRectangle} onEdit={startEdit} onSaveEdit={saveEdit} onDeleteShapes={deleteShapes} />


            <MapControls onZoomIn={() => mapRef.current?.zoomIn()} onZoomOut={() => mapRef.current?.zoomOut()} onToggleView={() => { setFading(true); setTimeout(() => { setViewMode(v => v === "base" ? "map" : "base"); setFading(false); }, 160); }} viewMode={viewMode} />
          </div>
          {/* Reset + theme */}
          <div style={{ position: "absolute", right: 96, top: 16, zIndex: 5600, display: "flex", gap: 8 }}>
            <button
              onClick={() => resetMap()}
              title="Reset map"
              style={{
                padding: "8px 10px",
                borderRadius: 10,
                background: theme === "dark" ? "#0b1220" : "#fff",
                border: "1px solid #e6e6e6",
                cursor: "pointer",
                color: theme === "dark" ? "#e6eef8" : "#111827"  // 🔥 fix text color
              }}
            >
              🔄 Reset
            </button>
            <div style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: theme === "dark" ? "#0b1220" : "#fff",
              border: "1px solid #e6e6e6",
              color: theme === "dark" ? "#fff" : "#111"
            }}>
              {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
            </div>
          </div>

          {/* Bottom-left view toggle */}
          <div style={{ position: "absolute", left: 20, bottom: 20, zIndex: 5500, display: "flex", borderRadius: 12, overflow: "hidden", boxShadow: "0 6px 18px rgba(0,0,0,0.12)" }}>
            <button onClick={() => { setFading(true); setTimeout(() => { setViewMode("base"); setFading(false); }, 140); }} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 14px", fontSize: 13, background: viewMode === "base" ? (theme === "dark" ? "#bb6b32" : "#c96a26") : (theme === "dark" ? "#071022" : "#fff"), color: viewMode === "base" ? "#fff" : (theme === "dark" ? "#d8e6f8" : "#111827"), border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 16 }}>🛰</span><span>Base</span>
            </button>
            <button onClick={() => { setFading(true); setTimeout(() => { setViewMode("map"); setFading(false); }, 140); }} style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 14px", fontSize: 13, background: viewMode === "map" ? (theme === "dark" ? "#bb6b32" : "#c96a26") : (theme === "dark" ? "#071022" : "#fff"), color: viewMode === "map" ? "#fff" : (theme === "dark" ? "#d8e6f8" : "#111827"), border: "none", cursor: "pointer" }}>
              <span style={{ fontSize: 16 }}>🗺</span><span>Map</span>
            </button>
          </div>
          {/* Shortcut Toggle Button */}
          <button
            onClick={() => setShortcutOpen(true)}
            title="Show keyboard shortcuts"
            style={{
              position: "absolute",
              right: 7,
              bottom: 130,
              zIndex: 6000,
              width: 42,
              height: 42,
              background: theme === "dark" ? "#0b1220" : "#fff",
              borderRadius: "50%",
              border: "1px solid #e5e5e5",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              color: theme === "dark" ? "#e6e6e6" : "#333"
            }}
          >
            ⓘ
          </button>

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
            <MapContainer center={INITIAL_CENTER} zoom={8} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} attributionControl={false} zoomControl={false} style={{ width: "100vw", height: "100vh" }}>
              <AttachMapRef setMap={(m) => (miniRef.current = m)} />
              <TileLayer url={theme === "dark" ? TILE_CARTO_DARK : TILE_OSM} />
            </MapContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======================== AreaRow subcomponent ======================== */

function AreaRow({ aoi, onZoom, onShow, onDelete }: { aoi: AOI, onZoom: () => void, onShow: () => void, onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 8 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{ width: 12, height: 12, background: "#c96a26", borderRadius: 2 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{aoi.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{new Date(aoi.createdAt).toLocaleString()}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={onShow} style={{ padding: "6px 8px", borderRadius: 6 }}>Show</button>
          <button onClick={onZoom} style={{ padding: "6px 8px", borderRadius: 6 }}>Zoom</button>
          <button onClick={onDelete} style={{ padding: "6px 8px", borderRadius: 6, background: "#ffe8e6", color: "#b91c1c" }}>Delete</button>
          <button onClick={() => setOpen(o => !o)} style={{ padding: "6px 8px", borderRadius: 6 }}>{open ? "▾" : "▸"}</button>
        </div>
      </div>

      {open && <div style={{ padding: 8, background: "rgba(0,0,0,0.02)" }}>
        <div style={{ fontSize: 13 }}>Geometry: {aoi.geometry?.type || "—"}</div>
      </div>}
    </div>
  );
}
