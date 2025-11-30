
import React from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  GeoJSON,
  useMap
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import L from "leaflet";

// Components
import Toolbar from "./Toolbar";
import MapControls from "./MapControls";

// Utils
import {
  TILE_OSM,
  TILE_CARTO_DARK,
  INITIAL_CENTER,
  INITIAL_ZOOM
} from "../../utils/constants";

type Props = {
  theme: "light" | "dark";
  viewMode: "base" | "map";
  fading: boolean;

  mapRef: React.MutableRefObject<L.Map | null>;
  miniRef: React.MutableRefObject<L.Map | null>;
  featureGroupRef: React.MutableRefObject<any>;
  fadeOverlayStyle: React.CSSProperties;

  outlinePolygon: any | null;
  aois: any[];

  // Handlers
  onCreated: (e: any) => void;
  onDeleted: () => void;

  startPolygon: () => void;
  startRectangle: () => void;
  startEdit: () => void;
  saveEdit: () => void;
  deleteShapes: () => void;

  resetMap: () => void;
  setViewMode: (v: "base" | "map") => void;

  // Tooltip
  tooltip: { text: string; x?: number; y?: number; visible: boolean };

  // Shortcut
  shortcutOpen: boolean;
  setShortcutOpen: (v: boolean) => void;

  // WMS layer placeholder (base view)
};

export default function MapCanvas(props: Props) {
  const {
    theme,
    viewMode,
    fading,
    mapRef,
    miniRef,
    featureGroupRef,
    fadeOverlayStyle,
    outlinePolygon,
    aois,
    onCreated,
    onDeleted,
    startPolygon,
    startRectangle,
    startEdit,
    saveEdit,
    deleteShapes,
    resetMap,
    setViewMode,
    tooltip,
    shortcutOpen,
    setShortcutOpen
  } = props;

  /* ======================== AttachMapRef Component ======================== */
  function AttachMapRef({ setMap }: { setMap: (m: L.Map) => void }) {
    const map = useMap();
    React.useEffect(() => {
      setMap(map);
      return () => {};
    }, [map, setMap]);
    return null;
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
          <button
            onClick={onClose}
            style={{
              padding: "8px 10px",
              background: "#d97706",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: "relative" }}>
      {/* Show menu button handled in parent */}

      <MapContainer
        id="main-map"
        center={INITIAL_CENTER}
        zoom={INITIAL_ZOOM}
        style={{ height: "100vh", width: "100%" }}
      >
        <AttachMapRef setMap={(m) => (mapRef.current = m)} />

        {/* fade overlay */}
        <div style={fadeOverlayStyle} />

        {/* Tile Layer */}
        {viewMode === "map" ? (
          <TileLayer
            url={theme === "dark" ? TILE_CARTO_DARK : TILE_OSM}
            attribution={theme === "dark" ? "© Carto" : "© OpenStreetMap contributors"}
            noWrap={true}
          />
        ) : (
          <TileLayer url={TILE_OSM} opacity={0} noWrap={true} />
        )}

        {/* Draw layer */}
        <FeatureGroup ref={(r: any) => (featureGroupRef.current = r)}>
          {/* @ts-ignore */}
          <EditControl
            position="topright"
            onCreated={onCreated}
            onDeleted={onDeleted}
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
            edit={{ remove: true }}
          />
        </FeatureGroup>

        {/* Outline polygon (search result) */}
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

        {/* Saved AOIs */}
        {aois.map((a) => (
          <GeoJSON
            key={a.id}
            data={a.geometry}
            style={{ color: "#c2a27b", weight: 2, dashArray: "4 4" }}
          />
        ))}
      </MapContainer>

      {/* Toolbar & Controls */}
      <div className="controls-wrapper">
        <Toolbar
          onStartPolygon={startPolygon}
          onStartRectangle={startRectangle}
          onEdit={startEdit}
          onSaveEdit={saveEdit}
          onDeleteShapes={deleteShapes}
        />

        <MapControls
          onZoomIn={() => mapRef.current?.zoomIn()}
          onZoomOut={() => mapRef.current?.zoomOut()}
          onToggleView={() => {
            props.setViewMode(viewMode === "base" ? "map" : "base");
          }}
          viewMode={viewMode}
        />
      </div>

      {/* Reset + Theme Display */}
      <div
        style={{
          position: "absolute",
          right: 96,
          top: 16,
          zIndex: 5600,
          display: "flex",
          gap: 8
        }}
      >
        <button
          onClick={resetMap}
          title="Reset map"
          style={{
            padding: "8px 10px",
            borderRadius: 10,
            background: theme === "dark" ? "#0b1220" : "#fff",
            border: "1px solid #e6e6e6",
            cursor: "pointer",
            color: theme === "dark" ? "#e6eef8" : "#111827"
          }}
        >
          🔄 Reset
        </button>

        <div
          style={{
            padding: "8px 12px",
            borderRadius: 10,
            background: theme === "dark" ? "#0b1220" : "#fff",
            border: "1px solid #e6e6e6",
            color: theme === "dark" ? "#fff" : "#111"
          }}
        >
          {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
        </div>
      </div>

      {/* Bottom-left toggle */}
      <div
        style={{
          position: "absolute",
          left: 20,
          bottom: 20,
          zIndex: 5500,
          display: "flex",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 6px 18px rgba(0,0,0,0.12)"
        }}
      >
        <button
          onClick={() => setViewMode("base")}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 14px",
            fontSize: 13,
            background:
              viewMode === "base"
                ? theme === "dark"
                  ? "#bb6b32"
                  : "#c96a26"
                : theme === "dark"
                ? "#071022"
                : "#fff",
            color:
              viewMode === "base"
                ? "#fff"
                : theme === "dark"
                ? "#d8e6f8"
                : "#111827",
            border: "none",
            cursor: "pointer"
          }}
        >
          <span style={{ fontSize: 16 }}>🛰</span>
          <span>Base</span>
        </button>

        <button
          onClick={() => setViewMode("map")}
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "8px 14px",
            fontSize: 13,
            background:
              viewMode === "map"
                ? theme === "dark"
                  ? "#bb6b32"
                  : "#c96a26"
                : theme === "dark"
                ? "#071022"
                : "#fff",
            color:
              viewMode === "map"
                ? "#fff"
                : theme === "dark"
                ? "#d8e6f8"
                : "#111827",
            border: "none",
            cursor: "pointer"
          }}
        >
          <span style={{ fontSize: 16 }}>🗺</span>
          <span>Map</span>
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

      {/* Shortcut Panel */}
      <ShortcutPanel visible={shortcutOpen} onClose={() => setShortcutOpen(false)} />

      {/* Tooltip */}
      <div
        style={{
          position: "absolute",
          left: tooltip.x ?? 260,
          top: tooltip.y ?? 90,
          zIndex: 6000,
          pointerEvents: "none",
          transform: tooltip.visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.98)",
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
          center={INITIAL_CENTER}
          zoom={8}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          attributionControl={false}
          zoomControl={false}
          style={{ width: "100vw", height: "100vh" }}
        >
          <AttachMapRef setMap={(m) => (miniRef.current = m)} />
          <TileLayer url={theme === "dark" ? TILE_CARTO_DARK : TILE_OSM} />
        </MapContainer>
      </div>
    </div>
  );
}
