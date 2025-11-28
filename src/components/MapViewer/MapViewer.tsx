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
import "leaflet-draw/dist/leaflet.draw.css"
import { EditControl } from "react-leaflet-draw";
import { v4 as uuidv4 } from "uuid";
import toast from "react-hot-toast";

import Toolbar from "./Toolbar";
import MapControls from "./MapControls";

/* ============================================================
      Helper Component: Safely attach map instance (v4)
============================================================ */
function AttachMapRef({ setMap }: { setMap: (m: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    setMap(map);
  }, [map, setMap]);
  return null;
}

/* ============================================================
      AOI types + storage helpers
============================================================ */
interface AOI {
  id: string;
  name: string;
  geometry: any;
  createdAt: string;
}

const STORAGE_KEY = "flowbit_aoi_list_v1";

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

/* ============================================================
      Sync Mini-map to Main Map
============================================================ */
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
      } catch {}
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

/* ============================================================
      MAIN COMPONENT
============================================================ */
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

  // UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tooltip, setTooltip] = useState<{
    text: string;
    x?: number;
    y?: number;
    visible: boolean;
  }>({ text: "", visible: false });
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setAoIs(loadAOIs());
  }, []);

  useSyncMiniMap(mapRef, miniRef);

  /* ---------------- Autocomplete ---------------- */
  async function fetchSuggestions(q: string) {
    if (!q) {
      setSuggestions([]);
      return;
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&polygon_geojson=1&limit=6&q=${encodeURIComponent(
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

  /* ---------------- Apply suggestion ---------------- */
  function applySuggestion(s: any) {
    setSearchQuery(s.display_name);
    setSuggestions([]);

    showTooltip("Outlined city area (if available).", 260, 90);

    if (s.lat && s.lon) {
      mapRef.current?.setView(
        [parseFloat(s.lat), parseFloat(s.lon)],
        12,
        { animate: true }
      );
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
      toast.error(
        "No polygon outline available — draw or pick another suggestion."
      );
      return;
    }

    const fg = featureGroupRef.current;
    if (!fg) return;

    fg.clearLayers();

    const layer = L.geoJSON(outlinePolygon, {
      style: {
        color: "#d08742",
        weight: 3,
        dashArray: "6 6",
        fillOpacity: 0.05
      }
    });

    layer.addTo(fg);

    try {
      mapRef.current?.fitBounds(layer.getBounds(), { padding: [30, 30] });
    } catch {}

    setConfirmDisabled(false);
    setStep(2);
    showTooltip("Outlined city area as your base shape", 380, 280);
    toast.success("Outline applied — edit if you want, then Confirm.");
  }

  /* ---------------- Confirm AOI ---------------- */
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
      id: uuidv4(),
      name: `Area ${new Date().toLocaleString()}`,
      geometry: geojson,
      createdAt: new Date().toISOString()
    };

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

  /* ---------------- Drawing tool triggers ---------------- */
  function clickDraw(selector: string) {
    const btn = document.querySelector(selector) as HTMLElement | null;
    btn?.click();
  }

  const startPolygon = () => clickDraw(".leaflet-draw-draw-polygon");
  const startRectangle = () => clickDraw(".leaflet-draw-draw-rectangle");
  const startEdit = () => clickDraw(".leaflet-draw-edit-edit");
  const startDelete = () => clickDraw(".leaflet-draw-edit-remove");

  function zoomToSaved(a: AOI) {
    try {
      const layer = L.geoJSON(a.geometry);
      mapRef.current?.fitBounds(layer.getBounds(), { padding: [40, 40] });
    } catch {
      toast.error("Cannot zoom");
    }
  }

  /* ---------------- View toggle ---------------- */
  function toggleView() {
    setViewMode((v) => (v === "base" ? "map" : "base"));
  }

  /* ---------------- Tooltip ---------------- */
  function showTooltip(text: string, x?: number, y?: number) {
    setTooltip({ text, x, y, visible: true });
    setTimeout(() => {
      setTooltip((prev) => ({ ...prev, visible: false }));
    }, 2800);
  }

  /* ============================================================
        JSX
  ============================================================ */
  return (
    <div className="w-full h-screen relative font-sans bg-gray-50 flex">
      {/* Sidebar */}
      <div
        className={`transition-transform duration-450 ease-out z-40 bg-white border-r border-gray-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-80"
        }`}
        style={{ width: 380, padding: 18 }}
      >
        {/* ... your entire sidebar code unchanged ... */}
        {/* I am keeping it exactly as you provided */}
        {/* (I did not modify anything inside sidebar) */}

        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-orange-600 font-semibold">
              Define Area of Interest
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Search or draw area on map
            </div>
          </div>
          <div>
            <button
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={() => setSidebarOpen((s) => !s)}
            >
              {sidebarOpen ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex gap-2 items-center">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                step >= 1
                  ? "bg-orange-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              1
            </div>
            <div className="text-sm">Search</div>
          </div>

          <div className="flex gap-2 items-center ml-3">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                step >= 2
                  ? "bg-orange-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              2
            </div>
            <div className="text-sm">Edit</div>
          </div>

          <div className="flex gap-2 items-center ml-3">
            <div
              className={`w-8 h-8 flex items-center justify-center rounded-full ${
                step >= 3
                  ? "bg-orange-600 text-white"
                  : "bg-gray-200 text-gray-600"
              }`}
            >
              3
            </div>
            <div className="text-sm">Confirm</div>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-4">
          <input
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search for a city (e.g., Cologne)"
            className="w-full border rounded p-2"
          />

          {suggestions.length > 0 && (
            <div className="bg-white border rounded mt-2 max-h-44 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <div
                  key={idx}
                  onClick={() => applySuggestion(s)}
                  className="p-3 hover:bg-gray-50 cursor-pointer text-sm"
                >
                  <div className="font-semibold">
                    {s.display_name.split(",")[0]}
                  </div>
                  <div className="text-xs text-gray-500">
                    {s.display_name}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar buttons */}
        <div className="mt-4">
          <button
            onClick={applyOutlineAsBase}
            className="w-full bg-orange-600 text-white p-2 rounded font-semibold"
          >
            Apply outline as base image
          </button>

          <div className="text-xs text-gray-500 mt-2">
            You can always edit the shape of the area later
          </div>

          <button
            onClick={confirmAOI}
            disabled={confirmDisabled}
            className={`w-full mt-3 p-2 rounded font-bold ${
              confirmDisabled
                ? "bg-gray-300 text-gray-600"
                : "bg-orange-700 text-white"
            }`}
          >
            Confirm Area of Interest
          </button>
        </div>

        {/* Saved AOIs */}
        <div className="mt-6">
          <div className="text-sm font-semibold">Saved AOIs</div>
          <div className="mt-2 max-h-44 overflow-y-auto border rounded">
            {aois.length === 0 ? (
              <div className="p-3 text-gray-500">No AOIs created yet</div>
            ) : (
              aois.map((a) => (
                <div
                  key={a.id}
                  className="p-2 flex justify-between items-center border-b"
                >
                  <div>
                    <div className="font-medium text-sm">{a.name}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(a.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => zoomToSaved(a)}
                      className="px-2 py-1 rounded bg-gray-100 text-sm"
                    >
                      Zoom
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* =================== MAP AREA =================== */}
      <div className="flex-1 relative">
        <MapContainer
          center={[50.9375, 6.9603]}
          zoom={12}
          style={{ height: "100vh", width: "100%" }}
        >
          {/* Attach mapRef correctly */}
          <AttachMapRef setMap={(m) => (mapRef.current = m)} />

          {/* Tile layers */}
          {viewMode === "base" ? (
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}"
              attribution="Tiles © Esri"
            />
          ) : (
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="© OSM"
            />
          )}

          <FeatureGroup ref={(r: any) => (featureGroupRef.current = r)}>
            {/* @ts-ignore */}
            <EditControl
              position="topright"
              onCreated={onCreated}
              onDeleted={onDeleted}
              draw={{
                rectangle: true,
                polygon: true,
                polyline: false,
                marker: false,
                circle: false,
                circlemarker: false
              }}
              edit={{ remove: true }}
            />
          </FeatureGroup>

          {outlinePolygon && (
            <GeoJSON
              data={outlinePolygon}
              style={{
                color: "#d08742",
                weight: 3,
                dashArray: "6 6",
                fillOpacity: 0.03
              }}
            />
          )}

          {aois.map((a) => (
            <GeoJSON
              key={a.id}
              data={a.geometry}
              style={{ color: "#c2a27b", weight: 2, dashArray: "4 4" }}
            />
          ))}
        </MapContainer>

        {/* Toolbar & Controls */}
        <Toolbar
          onStartPolygon={startPolygon}
          onStartRectangle={startRectangle}
          onEdit={startEdit}
          onDelete={startDelete}
        />

        <MapControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onToggleView={toggleView}
          viewMode={viewMode}
        />

        {/* Floating tooltip */}
        <div
          style={{
            position: "absolute",
            left: tooltip.x ?? 260,
            top: tooltip.y ?? 90,
            zIndex: 6000,
            pointerEvents: "none",
            transform: tooltip.visible
              ? "translateY(0) scale(1)"
              : "translateY(-8px) scale(0.98)",
            transition: "all 260ms ease",
            opacity: tooltip.visible ? 1 : 0
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.75)",
              color: "white",
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 13
            }}
          >
            {tooltip.text}
          </div>
        </div>

        {/* Mini-map */}
        <div
          style={{
            position: "absolute",
            right: 20,
            bottom: 20,
            width: 140,
            height: 100,
            zIndex: 5500,
            borderRadius: 8,
            overflow: "hidden",
            boxShadow: "0 6px 16px rgba(0,0,0,0.12)"
          }}
        >
          <MapContainer
            center={[50.9375, 6.9603]}
            zoom={8}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            attributionControl={false}
            zoomControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            {/* Attach miniRef correctly */}
            <AttachMapRef setMap={(m) => (miniRef.current = m)} />

            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
