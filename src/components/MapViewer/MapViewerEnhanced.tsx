// src/components/MapViewer/MapViewerEnhanced.tsx

import React, { useEffect, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import L from "leaflet";

/* Components */
import MapSidebar from "./MapSidebar";
import MapCanvas from "./MapCanvas";

/* Utils */
import {
  INITIAL_CENTER,
  INITIAL_ZOOM,
  NRW_WMS_LAYER,
  THEME_KEY
} from "../../utils/constants";
import { AOI, loadAOIs, addAOI, saveAOIs } from "../../utils/storage";
import { createWmsLayer } from "../../utils/wms";

/* Sync minimap hook */
function useSyncMiniMap(
  mainRef: React.RefObject<L.Map | null>,
  miniRef: React.RefObject<L.Map | null>
) {
  useEffect(() => {
    if (!mainRef.current || !miniRef.current) return;

    const main = mainRef.current;
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

    return () => {
      main.off("move", sync);
      main.off("zoom", sync);
    };
  }, []);
}

export default function MapViewerEnhanced() {
  /* ======================== Refs ======================== */
  const mapRef = useRef<L.Map | null>(null);
  const miniRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<any>(null);
  const wmsRef = useRef<L.TileLayer.WMS | null>(null);

  /* ======================== State ======================== */
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
  const [tooltip, setTooltip] = useState<{ text: string; x?: number; y?: number; visible: boolean }>({
    text: "",
    visible: false
  });

  const [fading, setFading] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);

  const [sectionOpen, setSectionOpen] = useState({
    baseSelect: true,
    defineAOI: true,
    defineObjects: false
  });

  /* ======================== Load AOIs ======================== */
  useEffect(() => {
    setAoIs(loadAOIs());
  }, []);

  /* ======================== Sync minimap ======================== */
  useSyncMiniMap(mapRef, miniRef);

  /* ======================== WMS switching ======================== */
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    if (wmsRef.current && map.hasLayer(wmsRef.current)) {
      try {
        map.removeLayer(wmsRef.current);
      } catch {}
      wmsRef.current = null;
    }

    if (viewMode === "base") {
      try {
        const layer = createWmsLayer(map, NRW_WMS_LAYER);
        wmsRef.current = layer;
      } catch (err) {
        console.error("WMS load error", err);
        toast.error("Failed to load NRW WMS");
      }
    }
  }, [viewMode]);

  /* ======================== Autocomplete ======================== */
  async function fetchSuggestions(q: string) {
    if (!q) {
      setSuggestions([]);
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&polygon_geojson=1&limit=8&countrycodes=de&q=${encodeURIComponent(
        q
      )}`;
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

  function applySuggestion(s: any) {
    setSearchQuery(s.display_name);
    setSuggestions([]);
    showTooltip("Outlined area (if available).", 220, 90);

    if (s.lat && s.lon) {
      mapRef.current?.setView([parseFloat(s.lat), parseFloat(s.lon)], 12, {
        animate: true
      });
    }

    if (s.geojson) {
      setOutlinePolygon(s.geojson);
      setConfirmDisabled(false);

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

  /* ======================== Drawing ======================== */
  function onCreated(e: any) {
    const layer = e.layer;

    if (layer.setStyle) {
      layer.setStyle({
        color: "#ff7800",
        weight: 2,
        fillOpacity: 0.3,
        fillColor: "#ffb26b"
      });
    }

    setConfirmDisabled(false);

    showTooltip("Shape drawn — click Confirm to save", 260, 120);
  }

  function onDeleted() {
    const fg = featureGroupRef.current;
    const count = fg ? Object.keys((fg as any)._layers || {}).length : 0;
    setConfirmDisabled(count === 0);
    setAoIs(loadAOIs());
  }

  /* Trigger draw tools */
  function clickDraw(sel: string) {
    const btn = document.querySelector(sel) as HTMLElement | null;
    btn?.click();
  }
  const startPolygon = () => clickDraw(".leaflet-draw-draw-polygon");
  const startRectangle = () => clickDraw(".leaflet-draw-draw-rectangle");
  const startEdit = () => clickDraw(".leaflet-draw-edit-edit");
  const saveEdit = () => clickDraw(".leaflet-draw-edit-save");
  const deleteShapes = () => clickDraw(".leaflet-draw-edit-remove");

  /* ======================== AOI Saving ======================== */
  function applyOutlineAsBase() {
    if (!outlinePolygon) {
      toast.error("No outline available.");
      return;
    }

    const fg = featureGroupRef.current;
    if (!fg) return;

    fg.clearLayers();
    const layer = L.geoJSON(outlinePolygon, {
      style: { color: "#d08742", weight: 3, dashArray: "6 6", fillOpacity: 0.05 }
    });

    layer.addTo(fg);

    try {
      mapRef.current?.fitBounds(layer.getBounds(), { padding: [30, 30] });
    } catch {}

    setConfirmDisabled(false);

    toast.success("Outline applied — edit if needed.");
  }

  function confirmAOI() {
    const fg = featureGroupRef.current;
    if (!fg) {
      toast.error("No area to confirm");
      return;
    }

    type GeoLayer = L.Layer & { toGeoJSON: () => any };
    const layers = Object.values((fg as any)._layers || {}) as GeoLayer[];

    if (layers.length === 0) {
      toast.error("Draw or apply an outline first.");
      return;
    }

    const geojson = layers[0].toGeoJSON();

    const aoi: AOI = {
      id: crypto.randomUUID(),
      name: `Area ${new Date().toLocaleString()}`,
      geometry: geojson,
      createdAt: new Date().toISOString()
    };

    addAOI(aoi);
    setAoIs(loadAOIs());

    toast.success("Area of Interest saved");
  }

  /* ======================== AOI Utils ======================== */
  function zoomToSaved(a: AOI) {
    try {
      const layer = L.geoJSON(a.geometry);
      mapRef.current?.fitBounds(layer.getBounds(), { padding: [40, 40] });
    } catch {
      toast.error("Cannot zoom");
    }
  }

  function showAOI(a: AOI) {
    try {
      const m = mapRef.current;
      if (!m) return;

      const layer = L.geoJSON(a.geometry, {
        style: { color: "#ffd166", weight: 3, fillOpacity: 0.08 }
      }).addTo(m);

      m.fitBounds(layer.getBounds(), { padding: [30, 30] });

      setTimeout(() => {
        try {
          m.removeLayer(layer);
        } catch {}
      }, 2400);
    } catch {
      toast.error("Cannot show AOI");
    }
  }

  function deleteAOI(id: string) {
    const list = loadAOIs().filter((x) => x.id !== id);
    saveAOIs(list);
    setAoIs(list);
    toast.success("AOI deleted");
  }

  /* ======================== Theme & Reset ======================== */
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

      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {}

      setTimeout(() => setFading(false), 280);
    }, 160);
  }

  /* ======================== Tooltip ======================== */
  function showTooltip(text: string, x?: number, y?: number) {
    setTooltip({ text, x, y, visible: true });
    window.setTimeout(
      () =>
        setTooltip((prev) => ({
          ...prev,
          visible: false
        })),
      2600
    );
  }

  /* ======================== Fade overlay ======================== */
  const fadeOverlayStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    background: theme === "dark" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
    pointerEvents: "none",
    transition: "opacity 300ms ease",
    opacity: fading ? 1 : 0,
    zIndex: 5400
  };

  /* ======================== Keyboard Shortcuts ======================== */
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (e.key === "?") {
        setShortcutOpen((v) => !v);
        return;
      }

      const k = e.key.toLowerCase();

      if (k === "b") {
        setFading(true);
        setTimeout(() => {
          setViewMode("base");
          setFading(false);
        }, 140);
        toast("Switched to Base (NRW WMS)");
      }

      if (k === "m") {
        setFading(true);
        setTimeout(() => {
          setViewMode("map");
          setFading(false);
        }, 140);
        toast("Switched to Map View");
      }

      if (k === "r") resetMap();

      if (k === "d") applyTheme(theme === "light" ? "dark" : "light");
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [theme]);

  /* ======================== Render ======================== */
  return (
    <div
      style={{
        height: "100vh",
        width: "100%",
        fontFamily: "Inter, Roboto, Arial, sans-serif",
        background: theme === "dark" ? "#071022" : "#fff"
      }}
    >
      <Toaster position="bottom-right" />

      <div style={{ display: "flex", height: "100%" }}>
        {/* Sidebar */}
        <MapSidebar
          theme={theme}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          sectionOpen={sectionOpen}
          setSectionOpen={setSectionOpen}
          viewMode={viewMode}
          setViewMode={setViewMode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          suggestions={suggestions}
          handleInputChange={handleInputChange}
          applySuggestion={applySuggestion}
          applyOutlineAsBase={applyOutlineAsBase}
          confirmAOI={confirmAOI}
          confirmDisabled={confirmDisabled}
          aois={aois}
          zoomToSaved={zoomToSaved}
          showAOI={showAOI}
          deleteAOI={deleteAOI}
          applyTheme={applyTheme}
        />

        {/* Map Canvas */}
        <MapCanvas
          theme={theme}
          viewMode={viewMode}
          fading={fading}
          mapRef={mapRef}
          miniRef={miniRef}
          featureGroupRef={featureGroupRef}
          fadeOverlayStyle={fadeOverlayStyle}
          outlinePolygon={outlinePolygon}
          aois={aois}
          onCreated={onCreated}
          onDeleted={onDeleted}
          startPolygon={startPolygon}
          startRectangle={startRectangle}
          startEdit={startEdit}
          saveEdit={saveEdit}
          deleteShapes={deleteShapes}
          resetMap={resetMap}
          setViewMode={setViewMode}
          tooltip={tooltip}
          shortcutOpen={shortcutOpen}
          setShortcutOpen={setShortcutOpen}
        />
      </div>
    </div>
  );
}
