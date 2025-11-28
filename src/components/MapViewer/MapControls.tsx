import React from "react";

type Props = {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleView?: () => void;
  viewMode?: "base" | "map";
};

export default function MapControls({
  onZoomIn,
  onZoomOut,
  onToggleView,
  viewMode,
}: Props) {
  return (
    <div style={{ position: "absolute", right: 18, bottom: 120, zIndex: 6000, display: "flex", flexDirection: "column", gap: 8 }}>
      <button title="Zoom in" onClick={onZoomIn} style={{ width: 44, height: 44, borderRadius: 8, background: "white", boxShadow: "0 6px 18px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}>+</button>
      <button title="Zoom out" onClick={onZoomOut} style={{ width: 44, height: 44, borderRadius: 8, background: "white", boxShadow: "0 6px 18px rgba(0,0,0,0.08)", border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}>−</button>

      {/* tiny view-mode indicator (optional) */}
      <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
        <div style={{ padding: "6px 10px", borderRadius: 8, background: viewMode === "base" ? "#c96a26" : "#fff", color: viewMode === "base" ? "#fff" : "#111827", fontSize: 12 }}>Base</div>
        <div style={{ padding: "6px 10px", borderRadius: 8, background: viewMode === "map" ? "#c96a26" : "#fff", color: viewMode === "map" ? "#fff" : "#111827", fontSize: 12 }}>Map</div>
      </div>
    </div>
  );
}
